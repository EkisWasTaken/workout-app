<script setup lang="ts">
/**
 * A share-of-total donut with its numbers written out beside it.
 *
 * Slice sizes are hard to read exactly, so the legend carries the count and
 * percentage for every slice — the donut gives the shape at a glance, the list
 * gives the figures. The total sits in the middle.
 */
import { computed } from 'vue'
import { VisDonut, VisSingleContainer } from '@unovis/vue'

export interface DonutSlice {
	label: string
	value: number
	color: string
}

const props = withDefaults(defineProps<{
	slices: DonutSlice[]
	/** Word under the total, e.g. "sessions". */
	unit?: string
	size?: number
}>(), {
	unit: '',
	size: 170,
})

const visible = computed(() => props.slices.filter(s => s.value > 0))
const total = computed(() => visible.value.reduce((s, x) => s + x.value, 0))
const pct = (v: number) => (total.value ? Math.round((v / total.value) * 100) : 0)

const value = (d: DonutSlice) => d.value
const color = (d: DonutSlice) => d.color
</script>

<template>
	<div class="donut-chart">
		<div class="dc-ring" :style="{ width: size + 'px' }">
			<VisSingleContainer :data="visible" :height="size" :width="size">
				<VisDonut
					:value="value"
					:color="color"
					:arc-width="Math.round(size * 0.14)"
					:pad-angle="0.02"
					:corner-radius="3"
					:central-label="String(total)"
					:central-sub-label="unit"
				/>
			</VisSingleContainer>
		</div>
		<ul class="dc-legend">
			<li v-for="s in visible" :key="s.label">
				<span class="dc-sw" :style="{ background: s.color }"></span>
				<span class="dc-label">{{ s.label }}</span>
				<span class="dc-val mono">{{ s.value }}</span>
				<span class="dc-pct mono">{{ pct(s.value) }}%</span>
			</li>
		</ul>
	</div>
</template>

<style scoped>
.donut-chart {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 22px;
	flex-wrap: wrap;
	--vis-donut-central-label-font-size: 22px;
	--vis-donut-central-label-text-color: var(--text-color);
	--vis-donut-central-sub-label-font-size: 11px;
	--vis-donut-central-sub-label-text-color: var(--text-muted);
	--vis-donut-background-color: var(--surface-2);
	--vis-donut-central-label-font-weight: 600;
	--vis-donut-central-label-font-family: var(--font-mono);
	--vis-donut-segment-stroke-width: 0;
}
.dc-ring { flex-shrink: 0; }
.dc-legend {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 7px;
	min-width: 150px;
	font-size: 0.8rem;
}
.dc-legend li { display: grid; grid-template-columns: 10px 1fr auto 3.2em; align-items: center; gap: 8px; }
.dc-sw { width: 9px; height: 9px; border-radius: 2px; }
.dc-label { color: var(--text-secondary); }
.dc-val { color: var(--text-color); text-align: right; }
.dc-pct { color: var(--text-muted); text-align: right; font-size: 0.74rem; }
</style>
