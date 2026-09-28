<script setup lang="ts">
/**
 * Every route you've recorded, on one map, coloured by how often you've been
 * there.
 *
 * This used to draw each route at 22% opacity and let the overlaps stack —
 * twenty passes down a street piled up twenty translucent lines and came out
 * bright. It reads as *something*, but alpha saturates: past about eight passes
 * a street is as bright as it will ever get, so the road you run every single
 * day looked the same as one you'd run eight times. Now `routeHeat.ts` counts
 * how many separate activities touched each 25 m of ground and each stretch is
 * drawn on a cold-to-warm ramp, with a legend saying what the colours mean.
 *
 * The map also needs somewhere to point. Fitting the whole collection was fine
 * while every run started from the same door; with runs in several towns and
 * countries the bounds grow to hold the outliers and the loop you actually
 * repeat shrinks to a smudge. So routes are clustered into places (see
 * `runPlaces.ts`), the map opens on the one you run in most, and the others sit
 * behind a filter — country first when there's more than one, then city.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import { decode } from '@mapbox/polyline'
import { createDarkMap, type DarkMap } from '@/utils/leafletMap'
import { byCountry, clusterStartPoints, namePlaces, type RunPlace } from '@/utils/runPlaces'
import { buildHeat, type HeatBand } from '@/utils/routeHeat'
import Skeleton from '@/components/Skeleton.vue'

/**
 * The ramp, coldest first. Blue through cyan to amber, orange and a pale
 * gold — a sequence the eye orders the same way every time, on a near-black
 * basemap. Green is deliberately absent: it means "on track" everywhere else in
 * the app, and a green street here would read as a verdict rather than a count.
 *
 * Hotter lines are drawn slightly heavier as well as warmer, so the shape of
 * where you actually train survives being shrunk into a card.
 */
const RAMP = [
	{ color: '#2f4b7c', weight: 1.4, opacity: 0.55 },
	{ color: '#2a76c4', weight: 1.7, opacity: 0.7 },
	{ color: '#1fb0cd', weight: 2.0, opacity: 0.8 },
	{ color: '#f0b429', weight: 2.4, opacity: 0.88 },
	{ color: '#f4713d', weight: 2.9, opacity: 0.94 },
	{ color: '#ffe3a3', weight: 3.4, opacity: 1 },
]

const props = defineProps<{
	/** Activities to draw. Anything without a polyline is skipped. */
	activities: any[]
}>()

/**
 * Drawing thousands of polylines locks the main thread for seconds. The cap now
 * applies *within the selected place*, so zooming into one city gets its most
 * recent 300 runs rather than whatever survived a global cut.
 */
const MAX_ROUTES = 300

/**
 * Total route points above which the heat build is slow enough to be worth
 * telling the user about. Around 60 ms of binning on a normal laptop.
 */
const HEAVY_POINTS = 40_000

const el = ref<HTMLDivElement | null>(null)
const handle = shallowRef<DarkMap | null>(null)
const layers = shallowRef<L.Layer[]>([])
/** True while the heat is being counted — binning a few hundred routes is work. */
const building = ref(true)
const heatBands = shallowRef<HeatBand[]>([])
const peak = ref(0)

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

async function draw() {
	const h = handle.value
	if (!h) return

	for (const l of layers.value) h.map.removeLayer(l)
	layers.value = []

	const routes = drawn.value.map(points).filter((p): p is [number, number][] => !!p)
	if (!routes.length) {
		heatBands.value = []
		peak.value = 0
		building.value = false
		return
	}

	// Binning is synchronous, so the "counting" overlay can only be seen if it
	// is painted *before* the work starts — and it is only worth painting when
	// the work is long enough to notice. A city with forty runs bins in about
	// ten milliseconds, where an overlay would be a flicker and nothing else;
	// a few hundred full-resolution tracks take a third of a second, where a
	// silent freeze is the worst of the options. So the size of the job decides,
	// measured in points because that is what the cost scales with.
	const work = routes.reduce((n, r) => n + r.length, 0)
	if (work > HEAVY_POINTS) {
		building.value = true
		await nextTick()
		await new Promise(requestAnimationFrame)
	}

	const heat = buildHeat(routes)
	heatBands.value = heat.bands
	peak.value = heat.peak

	const added: L.Polyline[] = []
	const bounds = L.latLngBounds([])

	/**
	 * One canvas for every band, rather than Leaflet's default SVG.
	 *
	 * Six bands over a couple of years of training is on the order of a hundred
	 * thousand segments, and as SVG that becomes six enormous <path> elements
	 * the browser re-rasterises on every pan, zoom and page scroll. Measured at
	 * 120k segments: 35 ms a frame against 6.7 ms on a canvas. Same picture, and
	 * the difference between roughly 28 fps and a smooth one.
	 *
	 * A canvas has no per-layer DOM, so the old per-path fade-in class has
	 * nowhere to attach; the whole canvas is faded in instead, which looks the
	 * same because the bands arrive together anyway.
	 */
	const renderer = L.canvas({ padding: 0.3 })
	renderer.addTo(h.map)
	// Leaflet gives no public handle on a renderer's element, so the canvas it
	// just created is picked out of the pane it was added to. Reaching for the
	// private `_container` would work today and break on a patch release.
	h.map.getPanes().overlayPane
		.querySelectorAll('canvas:not(.heat-canvas)')
		.forEach(c => c.classList.add('heat-canvas'))

	// Coldest first, so the roads you run most end up drawn over the rest.
	for (const band of heat.bands) {
		const style = RAMP[Math.min(band.level, RAMP.length - 1)]
		const line = L.polyline(band.paths, {
			...style,
			renderer,
			lineCap: 'round',
			lineJoin: 'round',
			interactive: false,
		})
		line.addTo(h.map)
		added.push(line)
		bounds.extend(line.getBounds())
	}

	// The renderer is tracked alongside the lines so a redraw takes its canvas
	// with it — otherwise every filter change would leave one behind.
	layers.value = [...added, renderer]
	building.value = false
	// Re-fit on every filter change: picking a city is a request to be taken
	// there, so it overrides wherever the map had been panned to.
	if (bounds.isValid()) h.fit(bounds)
}

/** Legend swatches, coldest to hottest, labelled with the counts they cover. */
const legend = computed(() =>
	heatBands.value.map(b => ({
		color: RAMP[Math.min(b.level, RAMP.length - 1)].color,
		label: b.minCount === b.maxCount ? `${b.minCount}` : `${b.minCount}–${b.maxCount}`,
	})))

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

		<!-- The busy class goes on the wrapper, never on the map element itself:
		     Leaflet adds its own classes to that div at runtime, and a dynamic
		     `:class` on it makes Vue rewrite the attribute and wipe them — which
		     cost it `leaflet-container`, and with it the overflow rule that keeps
		     tiles inside the card. -->
		<div class="heat-map-wrap" :class="{ busy: building }">
			<div ref="el" class="heat-map"></div>
			<!-- Appears instantly and only fades on the way out. Binning blocks the
			     thread, so an enter transition could never actually run during it:
			     the overlay would paint at almost zero opacity, freeze there for
			     the length of the work, and vanish. -->
			<transition name="busy">
				<div v-if="building" class="heat-building">
					<Skeleton width="150px" height="9px" />
					<span class="heat-building-text">Counting {{ runWord(drawn.length) }}…</span>
				</div>
			</transition>
		</div>

		<div class="heat-legend">
			<span>{{ runWord(drawn.length) }}<template v-if="scopeLabel"> in {{ scopeLabel }}</template></span>

			<!-- The ramp, with the visit counts each colour stands for. Bands are
			     picked from the data, so a city you've visited twice uses the whole
			     ramp too — the numbers are what keep that honest. -->
			<span v-if="legend.length > 1" class="heat-scale">
				<span class="heat-scale-end">{{ legend[0].label }}</span>
				<span class="heat-swatches">
					<i v-for="l in legend" :key="l.color" :style="{ background: l.color }" :title="`${l.label} visits`"></i>
				</span>
				<span class="heat-scale-end">{{ legend[legend.length - 1].label }} visits</span>
			</span>

			<span class="heat-hint">
				<template v-if="skipped">most recent {{ MAX_ROUTES }}</template>
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

.heat-map-wrap { position: relative; }

.heat-map {
	width: 100%;
	aspect-ratio: 16 / 10;
	max-height: 460px;
	min-height: 240px;
	background: var(--surface-color);
	/* Leaflet sets this itself via .leaflet-container; stated here too so a
	   tile can never escape the card even for the frame before it applies. */
	overflow: hidden;
	transition: opacity 0.35s ease;
}
/* Dim rather than hide: the basemap underneath is already worth looking at
   while the routes are counted, and swapping the map out for a blank panel
   would make every filter click flash. */
.heat-map-wrap.busy .heat-map { opacity: 0.45; }

.heat-building {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 12px 18px;
	border-radius: var(--radius);
	background: rgba(11, 13, 17, 0.82);
	border: 1px solid var(--border-color);
	pointer-events: none;
}
.heat-building-text { font-size: 0.72rem; color: var(--text-muted); }
.busy-leave-active { transition: opacity 0.25s ease; }
.busy-leave-to { opacity: 0; }

/* Each band fades up as it is added, so a filter change resolves rather than
   snapping. `backwards` and not `both`: the band's real opacity is a Leaflet
   presentation attribute that differs per level, and holding the animation's
   end state would pin CSS opacity over it forever. */
:global(.heat-canvas) { animation: heat-in 0.45s ease backwards; }
@keyframes heat-in {
	from { opacity: 0; }
}

.heat-scale { display: inline-flex; align-items: center; gap: 6px; }
.heat-scale-end { font-size: 0.66rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.heat-swatches { display: inline-flex; border-radius: 3px; overflow: hidden; }
.heat-swatches i { display: block; width: 14px; height: 7px; }

.heat-legend {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px 12px;
	padding: 10px 14px;
	border-top: 1px solid var(--border-color);
	font-size: 0.72rem;
	color: var(--text-secondary);
}
.heat-hint { margin-left: auto; color: var(--text-muted); text-align: right; }
</style>
