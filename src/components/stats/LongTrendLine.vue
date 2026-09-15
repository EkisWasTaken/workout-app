<script setup lang="ts">
/**
 * The twelve-week fitted trend, in one line.
 *
 * Sits under the month-on-month verdict to catch what that comparison can't:
 * slow, steady progress that never clears one month's noise but is plainly
 * there across three. Only claims a direction when the fit is significant.
 */
import { computed } from 'vue'
import type { LongTrend } from '@/utils/progress'

const props = defineProps<{
	trend: LongTrend | null
	higherIsBetter: boolean
	/** Words for the two directions, e.g. ['faster', 'slower']. */
	words?: [string, string]
}>()

const view = computed(() => {
	const t = props.trend
	if (!t) return null
	if (!t.significant || Math.abs(t.pctPer4Weeks) < 0.005) {
		return { cls: 'flat', text: `12 weeks: no clear trend (${t.samples} sessions)` }
	}
	const good = (t.pctPer4Weeks > 0) === props.higherIsBetter
	const [better, worse] = props.words ?? ['better', 'worse']
	const pct = Math.abs(t.pctPer4Weeks * 100).toFixed(1)
	return {
		cls: good ? 'good' : 'bad',
		text: `12 weeks: ${good ? '↗' : '↘'} ${pct}% ${good ? better : worse} every 4 weeks`,
	}
})
</script>

<template>
	<p
		v-if="view"
		class="long-trend"
		:class="view.cls"
		title="A line fitted through every session of the last 12 weeks. Only shown as a direction when it's statistically clear."
	>{{ view.text }}</p>
</template>

<style scoped>
.long-trend {
	margin: 0;
	font-size: 0.72rem;
	font-weight: 600;
	color: var(--text-muted);
}
.long-trend.good { color: var(--success-color); }
.long-trend.bad { color: var(--warning-color); }
.long-trend.flat { font-weight: 500; }
</style>
