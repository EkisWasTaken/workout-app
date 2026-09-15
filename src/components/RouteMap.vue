<script setup lang="ts">
/**
 * An activity's GPS track on a real map.
 *
 * This used to be "route art": the polyline alone, drawn on an empty card. It
 * looked nice and told you nothing — you couldn't see which loop of the park it
 * was, or where you turned back. The shape is the same, it just sits on a map
 * now.
 *
 * The basemap is deliberately dark and desaturated so the route stays the
 * brightest thing on screen. If the tiles can't load — offline, or the tile
 * host is down — the route still draws over the card background, which is
 * exactly the old route art, so there is nothing to fall back to.
 */
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-polylinedecorator'
import { decode } from '@mapbox/polyline'

const props = defineProps<{
	/** Encoded polyline, as stored on the activity. */
	polyline: string
	/** Route colour — the sport's hue. */
	color: string
}>()

const el = ref<HTMLDivElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const layers = shallowRef<L.Layer[]>([])
/** Kept so a resize can re-fit the view — the first fit runs before the card
 *  has been laid out, when Leaflet still thinks the container is 0px tall. */
const bounds = shallowRef<L.LatLngBounds | null>(null)

/** Wheel-zoom stays off until the map is clicked, so scrolling the page past
 *  the map doesn't zoom it by accident. */
const interactive = ref(false)

function coords(): [number, number][] {
	try {
		return decode(props.polyline) as [number, number][]
	} catch {
		return []
	}
}

function drawRoute() {
	const m = map.value
	if (!m) return

	for (const l of layers.value) m.removeLayer(l)
	layers.value = []

	const pts = coords()
	if (pts.length < 2) return

	const c = props.color
	const add = <T extends L.Layer>(l: T): T => { l.addTo(m); layers.value = [...layers.value, l]; return l }

	// Three passes for the glow: a wide halo, a softer core, then the sharp line.
	add(L.polyline(pts, { color: c, weight: 13, opacity: 0.12, lineCap: 'round', lineJoin: 'round', interactive: false }))
	add(L.polyline(pts, { color: c, weight: 6, opacity: 0.25, lineCap: 'round', lineJoin: 'round', interactive: false }))
	const line = add(L.polyline(pts, { color: c, weight: 3, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }))

	// Which way round you went. Strava shows this and it settles a lot of
	// "is this the same loop?" questions on out-and-backs.
	add((L as any).polylineDecorator(line, {
		patterns: [{
			offset: '4%',
			repeat: '14%',
			symbol: (L as any).Symbol.arrowHead({
				pixelSize: 8,
				polygon: false,
				pathOptions: { stroke: true, color: c, weight: 2, opacity: 0.75, interactive: false },
			}),
		}],
	}))

	const dot = (at: [number, number], fill: string, ring: number) =>
		add(L.circleMarker(at, {
			radius: 6, color: fill, weight: ring, fillColor: fill, fillOpacity: 1, opacity: 0.4, interactive: false,
		}))

	dot(pts[0], c, 5)
	dot(pts[pts.length - 1], '#e2e8f0', 4)

	bounds.value = line.getBounds()
	fit()
}

function fit() {
	if (map.value && bounds.value) map.value.fitBounds(bounds.value, { padding: [28, 28] })
}

onMounted(() => {
	if (!el.value) return

	const m = L.map(el.value, {
		zoomControl: false,
		scrollWheelZoom: false,
		attributionControl: true,
		// Fractional zoom, so fitBounds fills the card instead of dropping to
		// the next whole zoom level and leaving the route small in the middle.
		zoomSnap: 0,
	})
	map.value = m

	L.control.zoom({ position: 'bottomright' }).addTo(m)

	// Standard OSM tiles, darkened in CSS (see .leaflet-tile-pane below). The
	// ready-made dark basemaps — CARTO, Mapbox, Stadia — all want an API key
	// now, and this app has no server to keep one in.
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; OpenStreetMap contributors',
		maxZoom: 19,
		// Offline, a failed tile otherwise draws the browser's broken-image
		// glyph. A transparent pixel leaves the card's own background, so the
		// route reads as line art rather than a broken map.
		errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
	}).addTo(m)

	const takeOver = () => {
		if (interactive.value) return
		interactive.value = true
		m.scrollWheelZoom.enable()
	}
	m.on('click', takeOver)
	m.on('dragstart', takeOver)

	drawRoute()

	// The card is fluid; Leaflet needs telling whenever its box changes size.
	// Until the map has been touched, re-fit too — the first fit happens before
	// layout, so it would otherwise be stuck at the wrong zoom.
	const ro = new ResizeObserver(() => {
		m.invalidateSize()
		if (!interactive.value) fit()
	})
	ro.observe(el.value)
	onBeforeUnmount(() => ro.disconnect())
})

onBeforeUnmount(() => {
	map.value?.remove()
	map.value = null
})

watch(() => [props.polyline, props.color], drawRoute)
</script>

<template>
	<div class="route-map-card">
		<div ref="el" class="route-map"></div>
		<div class="route-legend">
			<span class="legend-dot" :style="{ background: color }"></span> Start
			<span class="legend-dot legend-finish"></span> Finish
			<span v-if="!interactive" class="legend-hint">Click the map to zoom</span>
		</div>
	</div>
</template>

<style scoped>
.route-map-card {
	background: var(--surface-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	overflow: hidden;
	margin-bottom: 18px;
}

.route-map {
	width: 100%;
	/* Routes are usually about as tall as they are wide, and fitBounds is
	   constrained by whichever side is tighter — a short, wide box therefore
	   spent most of its width on scenery either side of the run. An aspect
	   ratio keeps the card in proportion to the route at every width. */
	aspect-ratio: 16 / 11;
	max-height: 460px;
	min-height: 220px;
	/* Same ground as the card, so missing tiles read as a deliberate backdrop
	   rather than a broken map. */
	background: var(--surface-color);
}

.route-legend {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 10px 14px;
	border-top: 1px solid var(--border-color);
	font-size: 0.72rem;
	color: var(--text-muted);
}

.legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	display: inline-block;
}
.legend-dot + .legend-dot { margin-left: 10px; }
.legend-finish { background: #e2e8f0; }

.legend-hint { margin-left: auto; font-size: 0.68rem; opacity: 0.8; }
</style>

<style>
/* Leaflet's own chrome, dressed for a dark app. Unscoped: these elements are
   created by Leaflet outside the component's scoped-style tree. */

/* @unovis/ts injects global Leaflet overrides for its own map component the
   moment any chart is imported, and one of them drops .leaflet-overlay-pane to
   z-index 1 — which puts the route *under* the tiles. Restoring Leaflet's own
   pane order, scoped to this map so we don't fight over the globals. */
.route-map .leaflet-tile-pane { z-index: 200; }
.route-map .leaflet-overlay-pane { z-index: 400; }
.route-map .leaflet-shadow-pane { z-index: 500; }
.route-map .leaflet-marker-pane { z-index: 600; }
.route-map .leaflet-tooltip-pane { z-index: 650; }
.route-map .leaflet-popup-pane { z-index: 700; }

/* OSM ships one light basemap. Inverting and rotating the hue back gives a
   muted dark map that keeps water blue and parks green, and it's applied to
   the tile pane alone so the route on the overlay pane stays its true colour. */
.route-map .leaflet-tile-pane {
	filter: invert(1) hue-rotate(180deg) brightness(0.86) contrast(0.92) saturate(0.55);
}
.route-map .leaflet-control-attribution {
	background: rgba(11, 13, 17, 0.7);
	color: var(--text-muted);
	font-size: 0.62rem;
	padding: 1px 6px;
}
.route-map .leaflet-control-attribution a { color: var(--text-secondary); }

.route-map .leaflet-bar a {
	background: var(--surface-elevated);
	color: var(--text-secondary);
	border-bottom-color: var(--border-color);
}
.route-map .leaflet-bar a:hover { background: var(--surface-hover); color: var(--text-color); }
.route-map .leaflet-bar { border: 1px solid var(--border-color); }
</style>
