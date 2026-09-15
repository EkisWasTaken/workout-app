<script setup lang="ts">
/**
 * A metric's own history as a smooth line.
 *
 * The previous sparkline drew weekly bars scaled from zero, and a week with no
 * data became a zero-height bar. So pace running 5:20 → 5:10 looked flat, body
 * weight 82 → 80 looked flat, and a week off looked like fitness collapsing.
 *
 * This draws the metric's rolling value — the same number as the headline — so
 * the last point is what the card says and the ringed point is what it's being
 * compared with. Missing weeks are gaps, not zeros; the scale fits the data, not
 * zero; and the curve is monotone so smoothing never invents a peak or a dip
 * that isn't in the numbers.
 */
import { computed, ref } from 'vue'
import type { Direction } from '@/utils/progress'

const props = withDefaults(defineProps<{
	values: (number | null)[]
	/** Formatted values for the hover readout, same length as `values`. */
	labels?: (string | null)[]
	direction?: Direction
	/** Index of the point the headline is compared against, ringed. */
	compareIndex?: number | null
	height?: number
	/** Smaller values draw higher — for pace, where faster should look like up. */
	invert?: boolean
}>(), {
	labels: () => [],
	direction: 'unknown',
	compareIndex: null,
	height: 34,
})

const W = 120
const PAD = 4

const scaled = computed(() => {
	const vals = props.values
	const nums = vals.filter((v): v is number => v !== null && Number.isFinite(v))
	if (nums.length < 2) return null
	let lo = Math.min(...nums)
	let hi = Math.max(...nums)
	// A flat line sits mid-height instead of pinned to an edge, and tiny ranges
	// get a minimum span so rounding noise doesn't fill the whole height.
	const span = Math.max(hi - lo, Math.abs(hi) * 0.02, 1e-6)
	const mid = (hi + lo) / 2
	lo = mid - span / 2
	hi = mid + span / 2
	const h = props.height
	const step = vals.length > 1 ? (W - PAD * 2) / (vals.length - 1) : 0
	return vals.map((v, i) =>
		v === null || !Number.isFinite(v)
			? null
			: { x: PAD + i * step, y: PAD + (props.invert ? (v - lo) / (hi - lo) : 1 - (v - lo) / (hi - lo)) * (h - PAD * 2), i })
})

type Pt = { x: number; y: number; i: number }

/** Monotone cubic (Fritsch–Carlson) path through consecutive points. */
function monotonePath(pts: Pt[]): string {
	if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
	const n = pts.length
	const dx: number[] = [], m: number[] = []
	for (let i = 0; i < n - 1; i++) {
		dx.push(pts[i + 1].x - pts[i].x)
		m.push((pts[i + 1].y - pts[i].y) / dx[i])
	}
	const t: number[] = [m[0]]
	for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2)
	t.push(m[n - 2])
	for (let i = 0; i < n - 1; i++) {
		if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
		const a = t[i] / m[i], b = t[i + 1] / m[i]
		const s = a * a + b * b
		if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i] }
	}
	let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
	for (let i = 0; i < n - 1; i++) {
		const c1x = pts[i].x + dx[i] / 3, c1y = pts[i].y + (t[i] * dx[i]) / 3
		const c2x = pts[i + 1].x - dx[i] / 3, c2y = pts[i + 1].y - (t[i + 1] * dx[i]) / 3
		d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${pts[i + 1].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`
	}
	return d
}

/** Runs of consecutive non-null points; a gap in the data is a gap in the line. */
const runs = computed(() => {
	const out: Pt[][] = []
	let cur: Pt[] = []
	for (const p of scaled.value ?? []) {
		if (p) cur.push(p)
		else if (cur.length) { out.push(cur); cur = [] }
	}
	if (cur.length) out.push(cur)
	return out
})

const paths = computed(() => runs.value.map(monotonePath))
const areas = computed(() => runs.value.filter(r => r.length > 1).map(r =>
	`${monotonePath(r)} L${r[r.length - 1].x.toFixed(2)},${props.height} L${r[0].x.toFixed(2)},${props.height} Z`))

const last = computed(() => {
	const s = scaled.value
	const p = s?.[s.length - 1]
	return p ?? null
})
const compare = computed(() => (props.compareIndex === null ? null : scaled.value?.[props.compareIndex] ?? null))

const hover = ref<Pt | null>(null)
function onMove(e: PointerEvent) {
	const s = scaled.value
	if (!s) return
	const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
	const x = ((e.clientX - rect.left) / rect.width) * W
	let best: Pt | null = null
	for (const p of s) if (p && (!best || Math.abs(p.x - x) < Math.abs(best.x - x))) best = p
	hover.value = best
}

const hoverText = computed(() => {
	const p = hover.value
	if (!p) return null
	const ago = props.values.length - 1 - p.i
	const when = ago === 0 ? 'Now' : ago === 1 ? '1 week ago' : `${ago} weeks ago`
	const label = props.labels[p.i] ?? String(props.values[p.i])
	return `${when}: ${label}`
})

const uid = `ts${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
	<div class="trend-spark" :class="direction">
		<svg
			v-if="scaled"
			:viewBox="`0 0 ${W} ${height}`"
			preserveAspectRatio="none"
			:style="{ height: height + 'px' }"
			role="img"
			aria-label="Trend over the last 12 weeks"
			@pointermove="onMove"
			@pointerleave="hover = null"
		>
			<defs>
				<linearGradient :id="uid" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="currentColor" stop-opacity="0.18" />
					<stop offset="100%" stop-color="currentColor" stop-opacity="0" />
				</linearGradient>
			</defs>
			<path v-for="(a, i) in areas" :key="'a' + i" :d="a" :fill="`url(#${uid})`" stroke="none" />
			<path
				v-for="(p, i) in paths" :key="'p' + i" :d="p"
				fill="none" stroke="currentColor" stroke-width="1.6"
				stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"
			/>
			<line
				v-if="hover" :x1="hover.x" :x2="hover.x" y1="0" :y2="height"
				class="ts-guide" vector-effect="non-scaling-stroke"
			/>
		</svg>
		<!-- Dots live outside the stretched SVG so they stay round at any width. -->
		<template v-if="scaled">
			<span
				v-if="compare" class="ts-dot compare"
				:style="{ left: (compare.x / W) * 100 + '%', top: compare.y + 'px' }"
				title="The value this is compared against, 4 weeks ago"
			></span>
			<span v-if="last" class="ts-dot last" :style="{ left: (last.x / W) * 100 + '%', top: last.y + 'px' }"></span>
			<span v-if="hover && hoverText" class="ts-tip" :style="{ left: Math.min(80, Math.max(20, (hover.x / W) * 100)) + '%' }">{{ hoverText }}</span>
		</template>
		<div v-else class="ts-empty" :style="{ height: height + 'px' }">trend appears after two weeks of data</div>
	</div>
</template>

<style scoped>
.trend-spark {
	position: relative;
	color: var(--primary-color);
	touch-action: pan-y;
}
.trend-spark.improving { color: var(--success-color); }
.trend-spark.declining { color: var(--warning-color); }
.trend-spark.holding { color: var(--text-secondary); }

svg { display: block; width: 100%; overflow: visible; cursor: crosshair; }

.ts-guide { stroke: var(--border-strong); stroke-width: 1; stroke-dasharray: 2 2; }

.ts-dot {
	position: absolute;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	transform: translate(-50%, -50%);
	pointer-events: none;
}
.ts-dot.last { background: currentColor; box-shadow: 0 0 0 2px var(--surface-color); }
.ts-dot.compare { border: 1.5px solid var(--text-muted); background: var(--surface-color); }

.ts-tip {
	position: absolute;
	bottom: calc(100% + 4px);
	transform: translateX(-50%);
	white-space: nowrap;
	font-size: 0.68rem;
	font-family: var(--font-mono);
	color: var(--text-color);
	background: var(--surface-2);
	border: 1px solid var(--border-strong);
	border-radius: 6px;
	padding: 2px 7px;
	pointer-events: none;
	z-index: 2;
}

.ts-empty {
	display: flex;
	align-items: center;
	font-size: 0.68rem;
	color: var(--text-muted);
	border-top: 1px dashed var(--border-color);
}
</style>
