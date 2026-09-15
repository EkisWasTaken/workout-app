<script setup lang="ts">
/**
 * One headline number, rendered the same way everywhere.
 *
 * Every sport tab is built from these, so "am I improving?" is answered in the
 * same visual language whether you run, lift or ride: the value, what it's being
 * compared with, a trend line of that same value over twelve weeks, and a
 * sentence saying what it means.
 *
 * Trust comes from showing the working. The comparison value is printed, not
 * just the delta; the line ends on the headline and rings the comparison point;
 * and the footer says what the number was built from, so "median of 2 runs" is
 * never mistaken for a settled fact.
 *
 * A metric with no data is still rendered, with its `missing` reason telling the
 * user exactly what to do to switch it on.
 */
import { computed } from 'vue'
import TrendSpark from './TrendSpark.vue'
import LongTrendLine from './LongTrendLine.vue'
import { COMPARE_OFFSET, type Metric } from '@/utils/progress'

const props = defineProps<{
	metric: Metric
	/** Render without the sentence, for dense secondary rows. */
	compact?: boolean
}>()

const chip = computed(() => {
	const m = props.metric
	if (m.value === null) return null
	if (m.unknownReason === 'thin') return { cls: 'baseline', text: 'too few to call' }
	if (m.direction === 'unknown') return m.previous === null ? { cls: 'baseline', text: 'baseline' } : null
	if (m.direction === 'holding') return { cls: 'holding', text: 'steady' }
	if (!m.deltaDisplay) return null
	// The sign says which way the number moved; the colour says whether that's
	// good. An arrow can't do both — "▼ 15 s" in green reads like a loss.
	return { cls: m.direction, text: `${(m.delta ?? 0) > 0 ? '+' : '−'}${m.deltaDisplay}` }
})

const compareIndex = computed(() => {
	const n = props.metric.trend.length
	return props.metric.previous !== null && n > COMPARE_OFFSET ? n - 1 - COMPARE_OFFSET : null
})
</script>

<template>
	<div class="metric-card" :class="[metric.direction, { compact, empty: metric.value === null }]">
		<div class="mc-top">
			<span class="mc-label">{{ metric.label }}</span>
			<span
				v-if="chip"
				class="mc-chip"
				:class="chip.cls"
				:title="metric.direction === 'improving' ? 'Improving' : metric.direction === 'declining' ? 'Worse' : ''"
			>{{ chip.text }}</span>
		</div>

		<div class="mc-value-row">
			<span class="mc-value mono">
				{{ metric.display }}<span v-if="metric.value !== null" class="mc-unit"> {{ metric.unit }}</span>
			</span>
			<span v-if="metric.value !== null && metric.previousDisplay !== null" class="mc-prev">
				was <span class="mono">{{ metric.previousDisplay }}</span>
			</span>
		</div>

		<TrendSpark
			v-if="metric.value !== null && metric.trend.length"
			:values="metric.trend"
			:labels="metric.trendDisplay"
			:direction="metric.direction"
			:compare-index="compareIndex"
			:invert="metric.invertTrend"
			:height="compact ? 24 : 34"
		/>

		<LongTrendLine
			v-if="metric.value !== null"
			:trend="metric.longTrend"
			:higher-is-better="metric.higherIsBetter"
			:words="metric.invertTrend ? ['faster', 'slower'] : undefined"
		/>

		<p v-if="!compact" class="mc-note">{{ metric.note }}</p>
		<p v-if="metric.basis" class="mc-basis">{{ metric.basis }}</p>
	</div>
</template>

<style scoped>
.metric-card {
	background: var(--surface-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	padding: 14px 16px 13px;
	display: flex;
	flex-direction: column;
	gap: 7px;
	box-shadow: inset 0 1px 0 var(--border-subtle);
	/* A hairline in the direction colour: readable at a glance down a column. */
	border-left: 2px solid var(--border-color);
	min-width: 0;
}
.metric-card.improving { border-left-color: var(--success-color); }
.metric-card.declining { border-left-color: var(--warning-color); }
.metric-card.holding   { border-left-color: var(--text-muted); }
.metric-card.empty     { border-left-color: var(--border-color); }

.mc-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.mc-label {
	font-size: 0.78rem;
	font-weight: 600;
	letter-spacing: 0.02em;
	color: var(--text-secondary);
	text-transform: uppercase;
}

.mc-chip {
	font-size: 0.7rem;
	font-weight: 600;
	padding: 2px 8px;
	border-radius: 999px;
	white-space: nowrap;
	font-family: var(--font-mono);
}
.mc-chip.improving { color: var(--success-color); background: var(--success-soft); }
.mc-chip.declining { color: var(--warning-color); background: var(--warning-soft); }
.mc-chip.holding   { color: var(--text-secondary); background: var(--surface-2); font-family: inherit; }
.mc-chip.baseline  { color: var(--text-muted);    background: var(--surface-2); font-family: inherit; }

.mc-value-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
	flex-wrap: wrap;
}

.mc-value {
	font-size: 1.6rem;
	font-weight: 600;
	line-height: 1.1;
	color: var(--text-color);
}
.metric-card.empty .mc-value { color: var(--text-muted); }

.mc-unit {
	font-size: 0.8rem;
	font-weight: 500;
	color: var(--text-muted);
}

.mc-prev {
	font-size: 0.72rem;
	color: var(--text-muted);
	white-space: nowrap;
}

.mc-note {
	margin: 2px 0 0;
	font-size: 0.78rem;
	line-height: 1.5;
	color: var(--text-secondary);
}
.metric-card.empty .mc-note { color: var(--text-muted); }

.mc-basis {
	margin: auto 0 0;
	padding-top: 6px;
	border-top: 1px solid var(--border-subtle, var(--border-color));
	font-size: 0.68rem;
	color: var(--text-muted);
}

.metric-card.compact { padding: 11px 13px; gap: 5px; }
.metric-card.compact .mc-value { font-size: 1.15rem; }
</style>
