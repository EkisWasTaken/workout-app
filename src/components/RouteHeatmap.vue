<script setup lang="ts">
/**
 * Every route you've recorded, on one map.
 *
 * There's no heat calculation here and there doesn't need to be one: each route
 * is drawn faintly, so wherever you've run the same street twenty times the
 * lines stack and it comes out bright on its own. The loop you always do
 * appears; the one-off holiday run stays a whisper.
 *
 * What it *does* need is somewhere to point. Fitting the whole collection was
 * fine while every run started from the same door; with runs in several towns
 * and countries the bounds grow to hold the outliers and the loop you actually
 * repeat shrinks to a smudge. So routes are clustered into places (see
 * `runPlaces.ts`), the map opens on the one you run in most, and the others sit
 * behind a filter — country first when there's more than one, then city.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import { decode } from '@mapbox/polyline'
import { createDarkMap, type DarkMap } from '@/utils/leafletMap'
import { byCountry, clusterStartPoints, namePlaces, type RunPlace } from '@/utils/runPlaces'

const props = defineProps<{
	/** Activities to draw. Anything without a polyline is skipped. */
	activities: any[]
	color: string
}>()

/**
 * Drawing thousands of polylines locks the main thread for seconds. The cap now
 * applies *within the selected place*, so zooming into one city gets its most
 * recent 300 runs rather than whatever survived a global cut.
 */
const MAX_ROUTES = 300

const el = ref<HTMLDivElement | null>(null)
const handle = shallowRef<DarkMap | null>(null)
const layers = shallowRef<L.Layer[]>([])

/** Null means "every place in the current country scope". */
const selectedPlace = ref<string | null>(null)
/** Null means "every country". */
const selectedCountry = ref<string | null>(null)

const decodeCache = new WeakMap<object, [number, number][] | null>()

function points(a: any): [number, number][] | null {
	if (decodeCache.has(a)) return decodeCache.get(a)!
	let pts: [number, number][] | null = null
	try {
		const encoded = a?.map?.polyline || a?.map?.summary_polyline
		const decoded = encoded ? (decode(encoded) as [number, number][]) : null
		pts = decoded && decoded.length >= 2 ? decoded : null
	} catch {
		pts = null
	}
	decodeCache.set(a, pts)
	return pts
}

const mappable = computed(() => props.activities.filter(a => points(a) !== null))

/** Clustered places, busiest first. */
const places = shallowRef<RunPlace[]>([])

function recluster() {
	const starts = [...mappable.value]
		.sort((a, b) => String(a.start_date_local || '').localeCompare(String(b.start_date_local || '')))
		.map(a => {
			const pts = points(a)!
			return { activity: a, lat: pts[0][0], lng: pts[0][1] }
		})
	places.value = clusterStartPoints(starts)
	// Open on where you actually run: the busiest cluster, which is first.
	selectedPlace.value = places.value.length > 1 ? places.value[0].key : null
	selectedCountry.value = null
	resolveNames()
}

/**
 * Naming is asynchronous and best-effort. `places` is a shallowRef holding
 * plain objects, so the resolved names are published by swapping in copies —
 * mutating them in place would leave the chips showing coordinates until
 * something else happened to re-render.
 */
let naming: AbortController | null = null
function resolveNames() {
	naming?.abort()
	if (!places.value.length) return
	const controller = new AbortController()
	naming = controller
	const pending = places.value
	namePlaces(pending, controller.signal)
		.then(() => {
			if (controller.signal.aborted || places.value !== pending) return
			places.value = pending.map(p => ({ ...p }))
		})
		.catch(() => {})
}

/** Only worth a country row when you've actually run in more than one. */
const countries = computed(() => {
	const groups = byCountry(places.value)
	return groups.length > 1 ? groups : []
})

const inScope = computed(() =>
	selectedCountry.value === null
		? places.value
		: places.value.filter(p => (p.country ?? '') === selectedCountry.value))

const activePlace = computed(() =>
	places.value.find(p => p.key === selectedPlace.value) ?? null)

/** The activities the map should show: one place, or everything in scope. */
const pool = computed(() =>
	activePlace.value
		? activePlace.value.activities
		: inScope.value.flatMap(p => p.activities))

const drawn = computed(() =>
	[...pool.value]
		.sort((a, b) => String(b.start_date_local || '').localeCompare(String(a.start_date_local || '')))
		.slice(0, MAX_ROUTES))

const skipped = computed(() => Math.max(0, pool.value.length - MAX_ROUTES))

const scopeLabel = computed(() => {
	if (activePlace.value) return activePlace.value.label
	if (selectedCountry.value) return selectedCountry.value
	return null
})

const runWord = (n: number) => `${n} run${n === 1 ? '' : 's'}`

function pickPlace(key: string | null) {
	selectedPlace.value = key
	if (!key) return
	// Choosing a city keeps the country chip above it in step.
	const p = places.value.find(q => q.key === key)
	if (p?.country) selectedCountry.value = p.country
}

function pickCountry(country: string | null) {
	selectedCountry.value = country
	// Land on the busiest place there rather than a country-wide zoom-out —
	// `places` is sorted by run count, so the first match is it.
	selectedPlace.value = country === null
		? null
		: places.value.find(p => (p.country ?? '') === country)?.key ?? null
}

function draw() {
	const h = handle.value
	if (!h) return

	for (const l of layers.value) h.map.removeLayer(l)
	layers.value = []

	const added: L.Polyline[] = []
	const bounds = L.latLngBounds([])

	for (const a of drawn.value) {
		const pts = points(a)
		if (!pts) continue
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
	// Re-fit on every filter change: picking a city is a request to be taken
	// there, so it overrides wherever the map had been panned to.
	if (bounds.isValid()) h.fit(bounds)
}

onMounted(() => {
	if (!el.value) return
	// Labels above the routes: a few hundred stacked lines otherwise bury every
	// place name on the one map whose whole job is telling you where you are.
	handle.value = createDarkMap(el.value, { labelsOnTop: true })
	recluster()
	draw()
})

onBeforeUnmount(() => {
	naming?.abort()
	handle.value?.destroy()
	handle.value = null
})

watch(mappable, recluster)
watch(drawn, draw)
</script>

<template>
	<div class="heat-card">
		<div v-if="places.length > 1" class="heat-filters">
			<div v-if="countries.length" class="chip-row">
				<button class="chip" :class="{ on: selectedCountry === null }" @click="pickCountry(null)">
					All countries
				</button>
				<button
					v-for="g in countries"
					:key="g.country || 'unknown'"
					class="chip"
					:class="{ on: selectedCountry === g.country }"
					@click="pickCountry(g.country)"
				>
					{{ g.country || 'Unknown' }}<span class="chip-n">{{ g.count }}</span>
				</button>
			</div>
			<div class="chip-row">
				<button class="chip" :class="{ on: selectedPlace === null }" @click="pickPlace(null)">
					Everywhere
				</button>
				<button
					v-for="p in inScope"
					:key="p.key"
					class="chip"
					:class="{ on: selectedPlace === p.key }"
					:title="`${runWord(p.activities.length)} · ${(p.totalDistance / 1000).toFixed(0)} km`"
					@click="pickPlace(p.key)"
				>
					{{ p.label }}<span class="chip-n">{{ p.activities.length }}</span>
				</button>
			</div>
		</div>

		<div ref="el" class="heat-map"></div>

		<div class="heat-legend">
			<span>{{ runWord(drawn.length) }}<template v-if="scopeLabel"> in {{ scopeLabel }}</template></span>
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

.heat-filters {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 10px 12px;
	border-bottom: 1px solid var(--border-color);
}

.chip-row {
	display: flex;
	gap: 6px;
	overflow-x: auto;
	scrollbar-width: thin;
	padding-bottom: 2px;
}
/* A long list of cities scrolls sideways rather than reflowing into a wall of
   chips that pushes the map off the screen. */
.chip-row::-webkit-scrollbar { height: 4px; }
.chip-row::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 2px; }

.chip {
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: var(--surface-2);
	border: 1px solid var(--border-color);
	color: var(--text-secondary);
	font-family: var(--font-family);
	font-size: 0.74rem;
	padding: 4px 10px;
	border-radius: 999px;
	cursor: pointer;
	white-space: nowrap;
	transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.chip:hover { border-color: var(--border-strong); color: var(--text-color); }
.chip.on {
	background: var(--color-running-soft, rgba(79, 140, 255, 0.14));
	border-color: var(--color-running-primary);
	color: var(--text-color);
}
.chip-n {
	font-size: 0.66rem;
	color: var(--text-muted);
	font-variant-numeric: tabular-nums;
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
