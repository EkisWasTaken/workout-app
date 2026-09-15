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
import { chartTooltip, paddedDomain } from './charts'

const props = withDefaults(defineProps<{
	labels: string[]
	totals: number[]
	/** Rolling four-week average per week, same length as `totals`. */
	average?: number[]
	color: string
	unit: string
	height?: number
	dp?: number
}>(), {
	average: () => [],
	height: 230,
	dp: 1,
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
		<VisXYContainer
			:data="rows"
			:height="chartHeight"
			:y-domain="yDomain"
			:x-domain="[-0.5, totals.length - 0.5]"
			:margin="{ top: 6, right: 8 }"
			:duration="500"
		>
			<VisStackedBar
				:x="x"
				:y="(d: Row) => d.total"
				:color="barColor"
				:rounded-corners="4"
				:bar-max-width="26"
				:bar-padding="0.28"
			/>
			<VisLine
				v-if="average.length"
				:x="x"
				:y="(d: Row) => d.avg"
				color="var(--text-color)"
				:line-width="2"
				curve-type="monotoneX"
			/>
			<VisAxis
				type="x"
				:tick-values="rows.map(r => r.i)"
				:tick-format="tickLabel"
				:grid-line="false"
			/>
			<VisAxis type="y" :num-ticks="4" :tick-format="(v: number | Date) => fmt(Number(v))" :label="unit" />
			<VisCrosshair
				:x="x"
				:y="[(d: Row) => d.avg]"
				color="var(--text-color)"
				:template="template"
				:snapToData="true"
			/>
			<VisTooltip :horizontal-shift="14" :vertical-shift="14" />
		</VisXYContainer>

		<ul class="wb-legend">
			<li><span class="sw bar" :style="{ background: color }"></span>Week total</li>
			<li><span class="sw bar faded" :style="{ '--c': color }"></span>This week so far</li>
			<li v-if="average.length"><span class="sw line"></span>4-week average</li>
		</ul>
	</div>
</template>

<style scoped>
.wb-chart { width: 100%; }
.wb-legend {
	display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 16px;
	list-style: none; margin: 8px 0 0; padding: 0;
	font-size: 0.72rem; color: var(--text-secondary);
}
.wb-legend li { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; flex-shrink: 0; }
.sw.bar { width: 9px; height: 9px; border-radius: 2px; }
.sw.bar.faded { background: color-mix(in srgb, var(--c) 38%, transparent); }
.sw.line { width: 16px; border-top: 2px solid var(--text-color); }
</style>
