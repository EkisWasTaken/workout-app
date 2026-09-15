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
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import {
	VisAxis, VisCrosshair, VisLine, VisPlotline, VisScatter, VisTooltip, VisXYContainer,
} from '@unovis/vue'
import { format } from 'date-fns'
import { chartTooltip, paddedDomain, timeTickFormat, timeTickValues, type TipRow } from './charts'

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
}>(), {
	goals: () => [],
	height: 230,
	yFormat: (v: number) => String(Math.round(v * 10) / 10),
	reverseY: false,
	zeroBased: false,
	dateFormat: 'EEE d MMM yyyy',
	legend: true,
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

const lines = computed(() => props.series.filter(s => s.kind === 'line'))
const dots = computed(() => props.series.filter(s => s.kind === 'dots'))
const loud = computed(() => props.series.filter(s => !s.quiet))

const xDomain = computed<[number, number] | undefined>(() => {
	const r = rows.value
	return r.length ? [r[0].x, r[r.length - 1].x] : undefined
})

const yDomain = computed(() => {
	const vals = props.series.flatMap(s => s.points.map(p => p.y).filter((v): v is number => v !== null))
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
		<VisXYContainer
			:data="rows"
			:height="chartHeight"
			:x-domain="xDomain"
			:y-domain="yDomain"
			:y-direction="reverseY ? 'south' : 'north'"
			:margin="{ top: 6, right: 8 }"
			:duration="500"
		>
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
				:size="(d: Row) => (d[`${s.key}:em`] ? (s.size ?? 5) * 2.2 : (s.size ?? 5))"
				:stroke-color="(d: Row) => (d[`${s.key}:em`] ? 'var(--text-color)' : 'transparent')"
				:stroke-width="(d: Row) => (d[`${s.key}:em`] ? 2 : 0)"
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
			<VisAxis type="y" :tick-format="yTick" :num-ticks="5" :label="yLabel" :grid-line="true" />
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

		<ul v-if="legend && legendItems.length > 1" class="ts-legend">
			<li v-for="item in legendItems" :key="item.label">
				<span
					class="ts-swatch"
					:class="[item.kind, { dash: item.dash }]"
					:style="{ '--c': item.color }"
				></span>
				{{ item.label }}
			</li>
		</ul>
	</div>
</template>

<style scoped>
.ts-chart { width: 100%; }

.ts-legend {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 4px 16px;
	list-style: none;
	margin: 8px 0 0;
	padding: 0;
	font-size: 0.72rem;
	color: var(--text-secondary);
}
.ts-legend li { display: inline-flex; align-items: center; gap: 6px; }

.ts-swatch { display: inline-block; flex-shrink: 0; }
.ts-swatch.line, .ts-swatch.goal { width: 16px; height: 0; border-top: 2px solid var(--c); }
.ts-swatch.dash { border-top-style: dashed; }
.ts-swatch.dots { width: 7px; height: 7px; border-radius: 50%; background: var(--c); }
</style>
