<script setup lang="ts">
/**
 * Lines and dots over a time axis, with a crosshair tooltip and goal lines.
 *
 * Covers every "something over time" chart on the stats pages: training load
 * (three lines), aerobic pace (dots plus a rolling median), VDOT (dots, a
 * fitness line and goal lines), body weight.
 *
 * Unovis feeds one data table to every component in a container, so the series
 * are merged into rows keyed by timestamp here. A line with no value on a row is
 * simply undefined there — either a gap, or bridged when `connectGaps` is set.
 */
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import {
	VisArea, VisAxis, VisCrosshair, VisLine, VisPlotline, VisScatter, VisTooltip, VisXYContainer,
} from '@unovis/vue'
import { format } from 'date-fns'
import { chartTooltip, paddedDomain, progressVerdict, timeTickFormat, timeTickValues, windowProgress, type Direction, type TipRow } from './charts'

export interface SeriesPoint {
	x: number
	y: number | null
	/** Extra line under the tooltip, e.g. which run a sample came from. */
	note?: string
	/** Draw this dot larger and ringed (a race among training runs). */
	emphasis?: boolean
}

export interface ChartSeries {
	key: string
	label: string
	color: string
	kind: 'line' | 'dots'
	points: SeriesPoint[]
	width?: number
	dash?: number[]
	/** Bridge missing values instead of breaking the line. */
	connectGaps?: boolean
	/** Leave out of the tooltip and crosshair. */
	quiet?: boolean
	/** Dot radius, px. */
	size?: number
}

export interface GoalLine {
	label: string
	value: number
	color: string
}

/**
 * Which series measures progress and which way is good. The chart then marks
 * where you started in the visible range, shades the distance travelled since,
 * and says it in words: green when better, amber when worse.
 */
export interface ProgressSpec {
	series: string
	better: Direction
	/** Words for [improved, worsened], e.g. ['faster', 'slower']. */
	words: [string, string]
	/** Formats the size of the change; defaults to the axis format. */
	format?: (delta: number) => string
	/** Changes this small read as holding steady. */
	flat?: number
}

const props = withDefaults(defineProps<{
	series: ChartSeries[]
	goals?: GoalLine[]
	height?: number
	yLabel?: string
	/** Formats axis ticks and tooltip values. */
	yFormat?: (v: number) => string
	/** Larger values draw lower — pace, where faster should read as up. */
	reverseY?: boolean
	/** Include zero in the y range (for counts and loads, not pace or weight). */
	zeroBased?: boolean
	dateFormat?: string
	legend?: boolean
	progress?: ProgressSpec | null
}>(), {
	goals: () => [],
	height: 230,
	yFormat: (v: number) => String(Math.round(v * 10) / 10),
	reverseY: false,
	zeroBased: false,
	dateFormat: 'EEE d MMM yyyy',
	legend: true,
	progress: null,
})

type Row = { x: number; [k: string]: number | string | boolean | undefined }

const narrow = useMediaQuery('(max-width: 768px)')
const chartHeight = computed(() => (narrow.value ? Math.round(props.height * 0.87) : props.height))

const rows = computed<Row[]>(() => {
	const byX = new Map<number, Row>()
	for (const s of props.series) {
		for (const p of s.points) {
			let px = p.x
			// Two runs on one day share a timestamp; nudge the second along by a
			// minute so it gets its own row instead of overwriting the first.
			if (s.kind === 'dots') while (byX.get(px)?.[s.key] !== undefined) px += 60_000
			let row = byX.get(px)
			if (!row) byX.set(px, (row = { x: px }))
			if (p.y !== null && Number.isFinite(p.y)) row[s.key] = p.y
			if (p.note) row[`${s.key}:note`] = p.note
			if (p.emphasis) row[`${s.key}:em`] = true
		}
	}
	return [...byX.values()].sort((a, b) => a.x - b.x)
})

// ─── range ────────────────────────────────────────────────────────────────────

const DAY = 86_400_000
const RANGES = [{ label: '3M', days: 91 }, { label: '6M', days: 182 }, { label: '1Y', days: 365 }]
/** null = everything. */
const rangeDays = ref<number | null>(null)
const spanDays = computed(() => {
	const r = rows.value
	return r.length > 1 ? (r[r.length - 1].x - r[0].x) / DAY : 0
})
/** Only the ranges that would actually show less than everything. */
const rangeOptions = computed(() => RANGES.filter(r => r.days < spanDays.value * 0.9))
const cutoff = computed(() => {
	const r = rows.value
	return rangeDays.value && r.length ? r[r.length - 1].x - rangeDays.value * DAY : -Infinity
})
const visible = computed(() => rows.value.filter(r => r.x >= cutoff.value))

// ─── progress ─────────────────────────────────────────────────────────────────

const progressSeries = computed(() => props.progress ? props.series.find(s => s.key === props.progress!.series) : undefined)
const change = computed(() => {
	const spec = props.progress, s = progressSeries.value
	if (!spec || !s) return null
	const w = windowProgress(s.points, cutoff.value)
	if (!w) return null
	const verdict = progressVerdict(w.delta, spec.better, spec.flat ?? 0)
	const size = (spec.format ?? props.yFormat)(Math.abs(w.delta))
	const since = format(new Date(w.startX), spanDays.value > 330 ? 'd MMM yyyy' : 'd MMM')
	const text = verdict === 'steady' ? `Holding steady since ${since}`
		: `${size} ${verdict === 'better' ? spec.words[0] : spec.words[1]} since ${since}`
	return { ...w, verdict, text }
})
const changeColor = computed(() =>
	change.value?.verdict === 'better' ? 'var(--success-color)'
		: change.value?.verdict === 'worse' ? 'var(--warning-color)' : 'var(--text-muted)')
/** Up or down on screen, which flips for a reversed axis like pace. */
const arrow = computed(() => {
	const c = change.value
	if (!c || c.verdict === 'steady') return '→'
	return (c.delta > 0) !== props.reverseY ? '↑' : '↓'
})

/**
 * The progress line, carried forward across gaps, from where the range starts:
 * the shaded band between it and the start level is the change itself.
 */
const fillKey = '__progress'
const data = computed<Row[]>(() => {
	const c = change.value, key = props.progress?.series
	if (!c || !key) return visible.value
	let last: number | undefined
	return visible.value.map(r => {
		const v = r[key]
		if (typeof v === 'number' && r.x >= c.startX) last = v
		// Unovis stacks an area on its baseline, so it takes the change from the start, not the value.
		return last === undefined || r.x > c.endX ? r : { ...r, [fillKey]: last - c.start }
	})
})
const isEnd = (d: Row) => !!change.value && d.x === change.value.endX

const lines = computed(() => props.series.filter(s => s.kind === 'line'))
const dots = computed(() => props.series.filter(s => s.kind === 'dots'))
const loud = computed(() => props.series.filter(s => !s.quiet))

const xDomain = computed<[number, number] | undefined>(() => {
	const r = visible.value
	return r.length ? [r[0].x, r[r.length - 1].x] : undefined
})

const yDomain = computed(() => {
	const vals = props.series.flatMap(s => s.points.filter(p => p.x >= cutoff.value).map(p => p.y).filter((v): v is number => v !== null))
	vals.push(...props.goals.map(g => g.value))
	if (props.zeroBased) vals.push(0)
	const d = paddedDomain(vals)
	if (d && props.zeroBased && Math.min(...vals) >= 0) d[0] = 0
	return d
})

const xTick = computed(() => timeTickFormat(xDomain.value ? xDomain.value[1] - xDomain.value[0] : 0))
const xTickValues = computed(() => {
	const d = xDomain.value
	return d ? timeTickValues(d[0], d[1], narrow.value ? 4 : 7) : undefined
})
const yTick = (v: number | Date) => props.yFormat(Number(v))

const accessor = (key: string) => (d: Row) => (typeof d[key] === 'number' ? (d[key] as number) : undefined)
const x = (d: Row) => d.x

const crosshairY = computed(() => loud.value.map(s => accessor(s.key)))
const crosshairColor = (_: Row, i: number) => loud.value[i]?.color

function template(d: Row | undefined) {
	if (!d) return ''
	const tipRows: TipRow[] = []
	let note: string | null = null
	for (const s of loud.value) {
		const v = d[s.key]
		if (typeof v !== 'number') continue
		tipRows.push({ label: s.label, value: props.yFormat(v), color: s.color, line: s.kind === 'line' })
		note ??= (d[`${s.key}:note`] as string | undefined) ?? null
	}
	if (!tipRows.length) return ''
	return chartTooltip(format(new Date(d.x), props.dateFormat), tipRows, note)
}

const legendItems = computed(() => [
	...loud.value.map(s => ({ label: s.label, color: s.color, kind: s.kind, dash: !!s.dash })),
	...props.goals.map(g => ({ label: g.label, color: g.color, kind: 'goal' as const, dash: true })),
])
</script>

<template>
	<div class="ts-chart">
		<div v-if="change || rangeOptions.length" class="vc-progress">
			<p v-if="change" class="vc-change" :class="change.verdict">
				<span class="vc-arrow" aria-hidden="true">{{ arrow }}</span>
				{{ change.text }}
			</p>
			<div v-if="rangeOptions.length" class="vc-range" role="group" aria-label="Time range">
				<button v-for="r in rangeOptions" :key="r.label" type="button"
					:aria-pressed="rangeDays === r.days" :class="{ on: rangeDays === r.days }"
					@click="rangeDays = r.days">{{ r.label }}</button>
				<button type="button" :aria-pressed="rangeDays === null" :class="{ on: rangeDays === null }"
					@click="rangeDays = null">All</button>
			</div>
		</div>
		<div v-if="yLabel || (legend && legendItems.length > 1)" class="vc-head">
			<span v-if="yLabel" class="vc-unit">{{ yLabel }}</span>
			<ul v-if="legend && legendItems.length > 1" class="vc-legend">
				<li v-for="item in legendItems" :key="item.label">
					<span class="vc-sw" :class="[item.kind, { dash: item.dash }]" :style="{ '--c': item.color }"></span>
					{{ item.label }}
				</li>
			</ul>
		</div>
		<VisXYContainer
			:data="data"
			:height="chartHeight"
			:x-domain="xDomain"
			:y-domain="yDomain"
			:y-direction="reverseY ? 'south' : 'north'"
			:margin="{ top: 6, right: 8 }"
			:duration="0"
		>
			<VisArea
				v-if="change && change.verdict !== 'steady'"
				:x="x"
				:y="accessor(fillKey)"
				:baseline="() => change!.start"
				:color="changeColor"
				:opacity="0.14"
				curve-type="monotoneX"
			/>
			<VisPlotline
				v-if="change"
				axis="y"
				:value="change.start"
				color="var(--text-muted)"
				line-style="dash"
				:label-text="'Start ' + yFormat(change.start)"
				label-position="bottom-left"
				label-color="var(--text-muted)"
			/>
			<VisLine
				v-for="s in lines"
				:key="s.key"
				:x="x"
				:y="accessor(s.key)"
				:color="s.color"
				:line-width="s.width ?? 2"
				:line-dash-array="s.dash"
				curve-type="monotoneX"
				:interpolate-missing-data="!!s.connectGaps"
			/>
			<VisScatter
				v-for="s in dots"
				:key="s.key"
				:x="x"
				:y="accessor(s.key)"
				:color="s.color"
				:size="(d: Row) => (d[`${s.key}:em`] ? (s.size ?? 7) * 1.8 : (s.size ?? 7))"
				:stroke-color="(d: Row) => (d[`${s.key}:em`] ? 'var(--text-color)' : 'transparent')"
				:stroke-width="(d: Row) => (d[`${s.key}:em`] ? 2 : 0)"
			/>
			<VisScatter
				v-if="change && progressSeries"
				:x="x"
				:y="(d: Row) => (isEnd(d) ? change!.end : undefined)"
				:color="progressSeries.color"
				:size="11"
				stroke-color="var(--surface-color)"
				:stroke-width="2.5"
			/>
			<VisPlotline
				v-for="g in goals"
				:key="g.label"
				axis="y"
				:value="g.value"
				:color="g.color"
				line-style="dash"
				:label-text="g.label"
				label-position="top-left"
				:label-color="g.color"
			/>
			<VisAxis type="x" :tick-format="xTick" :tick-values="xTickValues" :grid-line="false" :tick-text-hide-overlapping="true" />
			<VisAxis type="y" :tick-format="yTick" :num-ticks="4" :grid-line="true" />
			<VisCrosshair
				:x="x"
				:y="crosshairY"
				:color="crosshairColor"
				:template="template"
				:snapToData="true"
				:hideWhenFarFromPointer="false"
			/>
			<VisTooltip :horizontal-shift="14" :vertical-shift="14" />
		</VisXYContainer>
	</div>
</template>

<style scoped>
.ts-chart { width: 100%; }

.vc-progress { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; margin-bottom: 10px; }
.vc-change {
	display: inline-flex; align-items: center; gap: 6px; margin: 0;
	padding: 5px 12px 5px 10px; border-radius: 999px;
	font-size: 0.86rem; font-weight: 600; color: var(--text-secondary); background: var(--surface-2);
}
.vc-change.better { color: var(--success-color); background: var(--success-soft); }
.vc-change.worse { color: var(--warning-color); background: var(--warning-soft); }
.vc-arrow { font-size: 1rem; line-height: 1; }
.vc-range { display: inline-flex; margin-left: auto; padding: 2px; border-radius: 999px; background: var(--surface-2); }
.vc-range button {
	border: none; background: none; cursor: pointer; font: inherit;
	font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
	padding: 4px 10px; border-radius: 999px; min-width: 36px;
}
.vc-range button:hover { color: var(--text-color); }
.vc-range button.on { background: var(--surface-color); color: var(--text-color); box-shadow: 0 0 0 1px var(--card-edge); }
</style>
