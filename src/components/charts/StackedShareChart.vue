<script setup lang="ts">
/**
 * Share of each category per period, stacked to 100% — heart-rate zones per
 * week. Weeks with no data stay empty rather than drawing a zero-height stack.
 */
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { VisAxis, VisCrosshair, VisStackedBar, VisTooltip, VisXYContainer } from '@unovis/vue'
import { chartTooltip } from './charts'

export interface ShareCategory {
	label: string
	color: string
}

const props = withDefaults(defineProps<{
	labels: string[]
	categories: ShareCategory[]
	/** One row per period: a percentage per category, summing to ~100 (or all zero). */
	values: number[][]
	height?: number
	/** Tooltip detail per period, e.g. total minutes. */
	periodNote?: (i: number) => string | null
}>(), {
	height: 230,
	periodNote: undefined,
})

type Row = { i: number; v: number[] }

const narrow = useMediaQuery('(max-width: 768px)')
const chartHeight = computed(() => (narrow.value ? Math.round(props.height * 0.87) : props.height))

const rows = computed<Row[]>(() => props.values.map((v, i) => ({ i, v })))
const last = computed(() => props.values.length - 1)
const ys = computed(() => props.categories.map((_, k) => (d: Row) => (d.v.some(n => n > 0) ? d.v[k] : undefined)))
const color = (_: Row, k: number) => props.categories[k]?.color

const tickLabel = (t: number | Date) => {
	const i = Math.round(Number(t))
	if (i === last.value) return 'now'
	if (narrow.value && (last.value - i) % 2) return ''
	return props.labels[i] ?? ''
}

function template(d: Row | undefined) {
	if (!d) return ''
	if (!d.v.some(n => n > 0)) return chartTooltip(`Week of ${props.labels[d.i]}`, [], 'No heart-rate data this week.')
	const rowsOut = props.categories
		.map((c, k) => ({ label: c.label, value: `${Math.round(d.v[k])}%`, color: c.color }))
		.reverse() // match the visual stacking order, top first
	return chartTooltip(`Week of ${props.labels[d.i]}`, rowsOut, props.periodNote?.(d.i) ?? null)
}
</script>

<template>
	<div class="ss-chart">
		<div class="vc-head">
			<ul class="vc-legend">
				<li v-for="c in categories" :key="c.label">
					<span class="vc-sw bar" :style="{ '--c': c.color }"></span>{{ c.label }}
				</li>
			</ul>
		</div>
		<VisXYContainer
			:data="rows"
			:height="chartHeight"
			:y-domain="[0, 100]"
			:x-domain="[-0.5, values.length - 0.5]"
			:margin="{ top: 6, right: 8 }"
			:duration="0"
		>
			<VisStackedBar
				:x="(d: Row) => d.i"
				:y="ys"
				:color="color"
				:rounded-corners="3"
				:bar-max-width="22"
				:bar-padding="0.4"
			/>
			<VisAxis type="x" :tick-values="rows.map(r => r.i)" :tick-format="tickLabel" :grid-line="false" />
			<VisAxis type="y" :tick-values="[0, 25, 50, 75, 100]" :tick-format="(v: number | Date) => `${v}%`" />
			<VisCrosshair :x="(d: Row) => d.i" :y="[]" :template="template" :snapToData="true" />
			<VisTooltip :horizontal-shift="14" :vertical-shift="14" />
		</VisXYContainer>

	</div>
</template>

<style scoped>
.ss-chart { width: 100%; }
</style>
