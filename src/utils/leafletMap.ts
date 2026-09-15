/**
 * Shared Leaflet setup for the two maps in the app: one activity's route, and
 * every route at once.
 *
 * Both need the same dark basemap, the same pane repair and the same "don't
 * hijack the page scroll" behaviour, so it lives here rather than being copied.
 * The styling half is in `leafletDark.css`, keyed off the `leaflet-dark` class
 * this function adds.
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './leafletDark.css'

/** A transparent pixel, so a tile that fails to load draws nothing at all. */
const BLANK_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export interface DarkMapOptions {
	/** Show the +/− control. Off for thumbnails and overview maps. */
	zoomControl?: boolean
}

export interface DarkMap {
	map: L.Map
	/** True once the user has taken control — stop auto-fitting after this. */
	touched: () => boolean
	/** Fit to bounds, unless the user has already moved the map themselves. */
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

	// Standard OSM tiles, darkened in CSS. The ready-made dark basemaps — CARTO,
	// Mapbox, Stadia — all want an API key now, and this app has no server to
	// keep one in.
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; OpenStreetMap contributors',
		maxZoom: 19,
		errorTileUrl: BLANK_TILE,
	}).addTo(map)

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
