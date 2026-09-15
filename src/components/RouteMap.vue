<script setup lang="ts">
/**
 * An activity's GPS track on a real map.
 *
 * This used to be "route art": the polyline alone, drawn on an empty card. It
 * looked nice and told you nothing — you couldn't see which loop of the park it
 * was, or where you turned back. The shape is the same, it just sits on a map
 * now.
 *
 * If the tiles can't load — offline, or the tile host is down — the route still
 * draws over the card background, which is exactly the old route art, so there
 * is nothing to fall back to.
 */
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet-polylinedecorator'
import { decode } from '@mapbox/polyline'
import { createDarkMap, type DarkMap } from '@/utils/leafletMap'

const props = defineProps<{
	/** Encoded polyline, as stored on the activity. */
	polyline: string
	/** Route colour — the sport's hue. */
	color: string
}>()

const el = ref<HTMLDivElement | null>(null)
const handle = shallowRef<DarkMap | null>(null)
const layers = shallowRef<L.Layer[]>([])
const interactive = ref(false)

function coords(): [number, number][] {
	try {
		return decode(props.polyline) as [number, number][]
	} catch {
		return []
	}
}

function drawRoute() {
	const h = handle.value
	if (!h) return

	for (const l of layers.value) h.map.removeLayer(l)
	layers.value = []

	const pts = coords()
	if (pts.length < 2) return

	const c = props.color
	const add = <T extends L.Layer>(l: T): T => {
		l.addTo(h.map)
		layers.value = [...layers.value, l]
		return l
	}

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

	h.fit(line.getBounds())
}

onMounted(() => {
	if (!el.value) return
	const h = createDarkMap(el.value)
	handle.value = h
	h.map.on('click', () => { interactive.value = true })
	h.map.on('dragstart', () => { interactive.value = true })
	drawRoute()
})

onBeforeUnmount(() => {
	handle.value?.destroy()
	handle.value = null
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
