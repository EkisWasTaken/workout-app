<script setup lang="ts">
/**
 * One headline number, rendered the same way everywhere.
 *
 * Every sport tab is built from these, so "am I improving?" is answered in the
 * same visual language whether you run, lift or ride: the value, how it moved
 * against the previous four weeks, and a sentence saying what that means.
 *
 * A metric with no data is still rendered. Hiding it would leave the user
 * wondering where the section went; showing it with its `missing` reason tells
 * them exactly what to do to switch it on.
 */
import type { Metric } from '@/utils/progress'

defineProps<{
	metric: Metric
	/** Render at half height without the sentence, for dense secondary rows. */
	compact?: boolean
}>()

const ARROWS: Record<string, string> = {
	improving: '▲',
	declining: '▼',
	holding: '=',
	unknown: '',
}
</script>

<template>
	<div class="metric-card" :class="[metric.direction, { compact, empty: metric.value === null }]">
		<div class="mc-top">
			<span class="mc-label">{{ metric.label }}</span>
			<span v-if="metric.deltaDisplay" class="mc-chip" :class="metric.direction">
				{{ ARROWS[metric.direction] }} {{ metric.deltaDisplay }}
			</span>
			<span v-else-if="metric.value !== null && metric.direction === 'unknown'" class="mc-chip baseline">
				baseline
			</span>
		</div>

		<div class="mc-value mono">
			{{ metric.display }}<span v-if="metric.value !== null" class="mc-unit"> {{ metric.unit }}</span>
		</div>

		<div v-if="metric.spark.length && metric.value !== null" class="mc-spark" aria-hidden="true">
			<div
				v-for="(h, i) in metric.spark"
				:key="i"
				class="mc-bar"
				:class="{ last: i === metric.spark.length - 1 }"
				:style="{ height: Math.max(6, h) + '%' }"
			></div>
		</div>

		<p v-if="!compact" class="mc-note">{{ metric.note }}</p>
	</div>
</template>

<style scoped>
.metric-card {
	background: var(--surface-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	padding: 14px 16px 15px;
	display: flex;
	flex-direction: column;
	gap: 7px;
	box-shadow: inset 0 1px 0 var(--border-subtle);
	/* A hairline in the direction colour: readable at a glance down a column. */
	border-left: 2px solid var(--border-color);
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
.mc-chip.holding   { color: var(--text-muted);    background: var(--surface-2); }
.mc-chip.baseline  { color: var(--text-muted);    background: var(--surface-2); font-family: inherit; }

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

.mc-spark {
	display: flex;
	align-items: flex-end;
	gap: 3px;
	height: 26px;
	margin-top: 1px;
}
.mc-bar {
	flex: 1;
	min-width: 3px;
	border-radius: 2px 2px 0 0;
	background: var(--surface-hover);
}
.mc-bar.last { background: var(--primary-color); }
.metric-card.improving .mc-bar.last { background: var(--success-color); }
.metric-card.declining .mc-bar.last { background: var(--warning-color); }

.mc-note {
	margin: 2px 0 0;
	font-size: 0.78rem;
	line-height: 1.5;
	color: var(--text-secondary);
}
.metric-card.empty .mc-note { color: var(--text-muted); }

.metric-card.compact { padding: 11px 13px; gap: 5px; }
.metric-card.compact .mc-value { font-size: 1.15rem; }
.metric-card.compact .mc-spark { height: 18px; }
</style>
