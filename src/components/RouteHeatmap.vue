<script setup lang="ts">
/**
 * Every route you've recorded, on one map.
 *
 * There's no heat calculation here and there doesn't need to be one: each route
 * is drawn faintly, so wherever you've run the same street twenty times the
 * lines stack and it comes out bright on its own. The loop you always do
 * appears; the one-off holiday run stays a whisper.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import { decode } from '@mapbox/polyline'
import { createDarkMap, type DarkMap } from '@/utils/leafletMap'

const props = defineProps<{
	/** Activities to draw. Anything without a polyline is skipped. */
	activities: any[]
	color: string
}>()

/**
 * Drawing thousands of polylines locks the main thread for seconds. The most
 * recent few hundred runs is more than enough to show where you actually go.
 */
const MAX_ROUTES = 300

const el = ref<HTMLDivElement | null>(null)
const handle = shallowRef<DarkMap | null>(null)
const layers = shallowRef<L.Layer[]>([])

const routes = computed(() =>
	props.activities
		.filter(a => a?.map?.polyline || a?.map?.summary_polyline)
		.sort((a, b) => String(b.start_date_local || '').localeCompare(String(a.start_date_local || '')))
		.slice(0, MAX_ROUTES))

const shown = computed(() => routes.value.length)
const skipped = computed(() =>
	Math.max(0, props.activities.filter(a => a?.map?.polyline || a?.map?.summary_polyline).length - MAX_ROUTES))

function draw() {
	const h = handle.value
	if (!h) return

	for (const l of layers.value) h.map.removeLayer(l)
	layers.value = []

	const added: L.Polyline[] = []
	const bounds = L.latLngBounds([])

	for (const a of routes.value) {
		let pts: [number, number][]
		try {
			pts = decode(a.map.polyline || a.map.summary_polyline) as [number, number][]
		} catch {
			continue
		}
		if (pts.length < 2) continue

		const line = L.polyline(pts, {
			color: props.color,
			weight: 2,
			// Low enough that a single pass is faint and ten passes are obvious.
			opacity: 0.22,
			lineCap: 'round',
			lineJoin: 'round',
			interactive: false,
		})
		line.addTo(h.map)
		added.push(line)
		bounds.extend(line.getBounds())
	}

	layers.value = added
	if (bounds.isValid()) h.fit(bounds)
}

onMounted(() => {
	if (!el.value) return
	handle.value = createDarkMap(el.value)
	draw()
})

onBeforeUnmount(() => {
	handle.value?.destroy()
	handle.value = null
})

watch(routes, draw)
</script>

<template>
	<div class="heat-card">
		<div ref="el" class="heat-map"></div>
		<div class="heat-legend">
			<span>{{ shown }} route{{ shown === 1 ? '' : 's' }}</span>
			<span class="heat-hint">
				Brighter where you've been more often<template v-if="skipped">
					· showing the most recent {{ MAX_ROUTES }}</template>
			</span>
		</div>
	</div>
</template>

<style scoped>
.heat-card {
	background: var(--surface-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	overflow: hidden;
}

.heat-map {
	width: 100%;
	aspect-ratio: 16 / 10;
	max-height: 460px;
	min-height: 240px;
	background: var(--surface-color);
}

.heat-legend {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	border-top: 1px solid var(--border-color);
	font-size: 0.72rem;
	color: var(--text-secondary);
}
.heat-hint { margin-left: auto; color: var(--text-muted); text-align: right; }
</style>
