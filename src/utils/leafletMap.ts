/**
 * Shared Leaflet setup for the two maps in the app: one activity's route, and
 * every route at once.
 *
 * Both need the same dark basemap, the same pane repair and the same "don't
 * hijack the page scroll" behaviour, so it lives here rather than being copied.
 * The styling half is in `leafletDark.css`, keyed off the `leaflet-dark` class
 * this function adds.
 *
 * ── The basemap ──────────────────────────────────────────────────────────────
 * This used to be standard OSM tiles under a CSS `invert()`. That is the cheap
 * way to get a dark map and it looked like one: OSM's own style is drawn for a
 * white page and carries every road class, shop and bus stop, so inverting it
 * gave a busy, brown-grey image whose labels fought the route on top of it.
 *
 * Esri's Dark Gray Canvas is a basemap *designed* to sit behind data: near-black
 * land, water a shade darker, one quiet weight of grey for roads and no clutter
 * beyond that. Nothing is filtered, so the route keeps its true colour against
 * it. It takes no API key. (CARTO's dark style would do as well but now
 * watermarks keyless requests — and it answers 200 while doing it, so it can't
 * even be detected as a failure.)
 *
 * Place names come as a separate transparent layer, which is what makes
 * `labelsOnTop` possible below.
 *
 * Plain OSM stays as the fallback: if Esri can't be reached the map drops back
 * to the old inverted look rather than showing an empty card.
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './leafletDark.css'

/** A transparent pixel, so a tile that fails to load draws nothing at all. */
const BLANK_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
/** Land, water and roads. Note Esri's tile path is {z}/{y}/{x}, not {z}/{x}/{y}. */
const ESRI_BASE = `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`
/** Place names and road numbers alone, on transparent tiles. */
const ESRI_LABELS = `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`
const ESRI_ATTRIB = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIB = '&copy; OpenStreetMap contributors'

/** How many tiles may fail before the basemap is written off as unreachable. */
const TILE_ERROR_LIMIT = 4

export interface DarkMapOptions {
	/** Show the +/− control. Off for thumbnails and overview maps. */
	zoomControl?: boolean
	/**
	 * Draw place names *above* the routes instead of under them.
	 *
	 * For the all-routes map, where a few hundred translucent lines stack up over
	 * the city you run in and bury every label underneath them — so the one map
	 * whose whole job is telling you which city you're looking at was the one
	 * that couldn't.
	 */
	labelsOnTop?: boolean
}

export interface DarkMap {
	map: L.Map
	/** True once the user has taken control — stop auto-fitting after this. */
	touched: () => boolean
	/**
	 * Fit to bounds, and remember them: a later resize re-fits to the last
	 * bounds passed here, until the user takes the map over.
	 */
	fit: (bounds: L.LatLngBounds) => void
	destroy: () => void
}

/**
 * Create a map on `el` with the dark basemap already attached.
 *
 * Wheel zoom stays off until the map is clicked or dragged, so scrolling the
 * page past a map doesn't zoom it by accident.
 */
export function createDarkMap(el: HTMLElement, options: DarkMapOptions = {}): DarkMap {
	el.classList.add('leaflet-dark')

	const map = L.map(el, {
		zoomControl: false,
		scrollWheelZoom: false,
		attributionControl: true,
		// Fractional zoom, so fitBounds fills the card instead of dropping to the
		// next whole zoom level and leaving the route small in the middle.
		zoomSnap: 0,
	})

	if (options.zoomControl !== false) L.control.zoom({ position: 'bottomright' }).addTo(map)

	// Esri's canvas basemaps are drawn to zoom 19 in cities and stop short of it
	// in some places; maxNativeZoom lets Leaflet upscale the last real tile
	// instead of leaving a hole where a route is zoomed right in.
	const tileOpts: L.TileLayerOptions = {
		attribution: ESRI_ATTRIB,
		maxZoom: 19,
		maxNativeZoom: 19,
		errorTileUrl: BLANK_TILE,
	}

	const base = L.tileLayer(ESRI_BASE, tileOpts).addTo(map)

	// Labels ride in their own pane above the overlay pane (400) but below the
	// markers (600), so the start/finish dots still sit on top of everything.
	if (options.labelsOnTop) {
		const pane = map.createPane('labels')
		pane.style.zIndex = '450'
		pane.style.pointerEvents = 'none'
		pane.classList.add('leaflet-labels-pane')
	}
	const labels = L.tileLayer(ESRI_LABELS, {
		...tileOpts,
		attribution: undefined,
		...(options.labelsOnTop ? { pane: 'labels' } : {}),
	}).addTo(map)

	// If the styled basemap can't be reached — offline, blocked, service down —
	// fall back to plain OSM under the old inversion filter. Counting a few
	// failures first avoids swapping the map over one tile lost to a flaky link.
	let tileErrors = 0
	let fellBack = false
	base.on('tileerror', () => {
		if (fellBack || ++tileErrors < TILE_ERROR_LIMIT) return
		fellBack = true
		map.removeLayer(base)
		map.removeLayer(labels)
		el.classList.add('leaflet-tiles-filtered')
		L.tileLayer(OSM, { attribution: OSM_ATTRIB, maxZoom: 19, errorTileUrl: BLANK_TILE }).addTo(map)
	})

	let interacted = false
	const takeOver = () => {
		if (interacted) return
		interacted = true
		map.scrollWheelZoom.enable()
	}
	map.on('click', takeOver)
	map.on('dragstart', takeOver)

	let last: L.LatLngBounds | null = null
	const fit = (bounds: L.LatLngBounds) => {
		last = bounds
		if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
	}

	// The card is fluid; Leaflet needs telling whenever its box changes size.
	// Until the map has been touched, re-fit too — the first fit happens before
	// layout, when Leaflet still thinks the container is 0px tall.
	const ro = new ResizeObserver(() => {
		map.invalidateSize()
		if (!interacted && last) fit(last)
	})
	ro.observe(el)

	return {
		map,
		touched: () => interacted,
		fit,
		destroy: () => {
			ro.disconnect()
			map.remove()
		},
	}
}
