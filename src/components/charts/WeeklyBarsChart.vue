<script setup lang="ts">
/**
 * Weekly totals as bars, with the rolling four-week average running through
 * them.
 *
 * The bars are what happened; the line is the trend, and it's the same number
 * as the "weekly distance" card. The current week is drawn faded and labelled
 * "so far", because a Monday bar isn't a bad week — it's a week that has barely
 * started.
 */
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import {
	VisAxis, VisCrosshair, VisLine, VisStackedBar, VisTooltip, VisXYContainer,
} from '@unovis/vue'
import { chartTooltip, paddedDomain, recentVsPrior } from './charts'

const props = withDefaults(defineProps<{
	labels: string[]
	totals: number[]
	/** Rolling four-week average per week, same length as `totals`. */
	average?: number[]
	color: string
	unit: string
	height?: number
	dp?: number
	/** Show how the last four complete weeks compare with the four before. */
	compare?: boolean
}>(), {
	average: () => [],
	height: 230,
	dp: 1,
	compare: true,
})

type Row = { i: number; total: number; avg?: number }

const narrow = useMediaQuery('(max-width: 768px)')
const chartHeight = computed(() => (narrow.value ? Math.round(props.height * 0.87) : props.height))

const rows = computed<Row[]>(() => props.totals.map((total, i) => ({ i, total, avg: props.average[i] })))
const last = computed(() => props.totals.length - 1)

const yDomain = computed<[number, number]>(() => {
	const d = paddedDomain([0, ...props.totals, ...props.average], 0.06)
	return [0, d ? d[1] : 1]
})

const fmt = (v: number) => {
	const f = 10 ** props.dp
	return String(Math.round(v * f) / f)
}

/**
 * Last four complete weeks against the four before. A rise is shown as
 * progress; a fall stays neutral, because less volume is often a planned
 * taper or recovery block rather than going backwards.
 */
const trend = computed(() => {
	const r = props.compare ? recentVsPrior(props.totals) : null
	if (!r || r.pct === null) return null
	const pct = Math.round(r.pct)
	const kind = Math.abs(pct) < 3 ? 'steady' : pct > 0 ? 'better' : 'down'
	const text = kind === 'steady' ? 'About the same as the 4 weeks before'
		: `${Math.abs(pct)}% ${pct > 0 ? 'more' : 'less'} than the 4 weeks before`
	return { kind, text, recent: r.recent }
})

const x = (d: Row) => d.i
const barColor = (d: Row) =>
	d.i === last.value ? `color-mix(in srgb, ${props.color} 38%, transparent)` : props.color

const tickLabel = (t: number | Date) => {
	const i = Math.round(Number(t))
	if (i === last.value) return 'now'
	// Every other label on narrow screens so they never collide.
	if (narrow.value && (last.value - i) % 2) return ''
	return props.labels[i] ?? ''
}

function template(d: Row | undefined) {
	if (!d) return ''
	const current = d.i === last.value
	const rowsOut = [{ label: current ? 'So far' : 'Week total', value: `${fmt(d.total)} ${props.unit}`, color: props.color }]
	if (d.avg !== undefined) rowsOut.push({ label: '4-week average', value: `${fmt(d.avg)} ${props.unit}/wk`, color: 'var(--text-color)' })
	return chartTooltip(
		current ? `Week of ${props.labels[d.i]} (in progress)` : `Week of ${props.labels[d.i]}`,
		rowsOut,
	)
}
</script>

<template>
	<div class="wb-chart">
		<p v-if="trend" class="wb-trend" :class="trend.kind">
			<span aria-hidden="true">{{ trend.kind === 'better' ? '↑' : trend.kind === 'down' ? '↓' : '→' }}</span>
			{{ trend.text }}
			<span class="wb-trend-sub">{{ fmt(trend.recent) }} {{ unit }}/wk lately</span>
		</p>
		<div class="vc-head">
			<span class="vc-unit">{{ unit }} per week</span>
			<ul class="vc-legend">
				<li><span class="vc-sw bar" :style="{ '--c': color }"></span>Week total</li>
				<li><span class="vc-sw bar faded" :style="{ '--c': color }"></span>This week so far</li>
				<li v-if="average.length"><span class="vc-sw line" style="--c: var(--text-secondary)"></span>4-week average</li>
			</ul>
		</div>
		<VisXYContainer
			:data="rows"
			:height="chartHeight"
			:y-domain="yDomain"
			:x-domain="[-0.5, totals.length - 0.5]"
			:margin="{ top: 6, right: 8 }"
			:duration="0"
		>
			<VisStackedBar
				:x="x"
				:y="(d: Row) => d.total"
				:color="barColor"
				:rounded-corners="4"
				:bar-max-width="22"
				:bar-padding="0.4"
			/>
			<VisLine
				v-if="average.length"
				:x="x"
				:y="(d: Row) => d.avg"
				color="var(--text-secondary)"
				:line-width="2"
				curve-type="monotoneX"
			/>
			<VisAxis
				type="x"
				:tick-values="rows.map(r => r.i)"
				:tick-format="tickLabel"
				:grid-line="false"
			/>
			<VisAxis type="y" :num-ticks="4" :tick-format="(v: number | Date) => fmt(Number(v))" />
			<VisCrosshair
				:x="x"
				:y="[(d: Row) => d.avg]"
				color="var(--text-color)"
				:template="template"
				:snapToData="true"
			/>
			<VisTooltip :horizontal-shift="14" :vertical-shift="14" />
		</VisXYContainer>

	</div>
</template>

<style scoped>
.wb-chart { width: 100%; }
.wb-trend {
	display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 0 0 10px;
	padding: 5px 12px 5px 10px; border-radius: 999px;
	font-size: 0.86rem; font-weight: 600; color: var(--text-secondary); background: var(--surface-2);
}
.wb-trend.better { color: var(--success-color); background: var(--success-soft); }
.wb-trend-sub { font-weight: 400; color: var(--text-muted); }
</style>
