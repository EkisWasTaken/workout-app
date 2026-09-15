<script setup lang="ts">
/**
 * Body weight progress, on a trend weight.
 *
 * A single morning reading moves a kilo on hydration alone, so the headline is
 * a time-aware moving average and the rate is fitted through every weigh-in of
 * the last four weeks. The chart uses a real time axis: the old one spaced
 * weigh-ins evenly, so a three-week gap looked like a day.
 */
import { computed } from 'vue'
import { BodyOutline } from '@vicons/ionicons5'
import { format, parseISO } from 'date-fns'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import TimeSeriesChart, { type ChartSeries, type GoalLine } from '@/components/charts/TimeSeriesChart.vue'
import { body, dailyWeights, today } from '@/stats'
import { settings } from '@/settings'

const goalWeight = computed(() => settings.goalWeight)

const t = (d: string) => parseISO(d).getTime()

const weightSeries = computed<ChartSeries[]>(() => [
	{
		key: 'weighin', label: 'Weigh-in', kind: 'dots', color: 'var(--text-muted)', size: 5,
		points: [...dailyWeights.value]
			.sort((a, b) => a.date.localeCompare(b.date))
			.map(w => ({ x: t(w.date), y: w.weight })),
	},
	{
		key: 'trend', label: 'Trend weight', kind: 'line', color: 'var(--primary-color)', width: 2.5, connectGaps: true,
		points: body.value.smoothed.map(p => ({ x: t(p.date), y: p.weight })),
	},
])

const weightGoals = computed<GoalLine[]>(() =>
	goalWeight.value === null ? [] : [{ label: `Goal ${goalWeight.value.toFixed(1)} kg`, value: goalWeight.value, color: 'var(--success-color)' }])

const kg = (v: number) => v.toFixed(1)
const goalDate = computed(() =>
	body.value.weeksToGoal === null ? null : format(new Date(today.value.getTime() + body.value.weeksToGoal * 7 * 86_400_000), 'MMMM yyyy'))
</script>

<template>
	<div class="stat-tab">
		<EmptyState
			v-if="!body.hasData"
			:icon="BodyOutline"
			title="No weigh-ins yet"
			body="Log your weight from the schedule page. A few readings a week is plenty — the trend smooths out day-to-day noise so you see the real direction."
			action-label="Go to schedule"
			action-to="/schedule"
		/>

		<template v-else>
			<SectionHead title="Progress" note="trend weight, today vs 28 days ago" />
			<section class="metric-grid">
				<MetricCard v-for="m in body.metrics" :key="m.key" :metric="m" />

				<div v-if="goalWeight !== null" class="stat-panel goal-card">
					<span class="gc-lbl">Goal</span>
					<span class="gc-val mono">{{ goalWeight.toFixed(1) }}<span class="gc-unit"> kg</span></span>
					<p class="gc-note">
						<template v-if="body.atGoal">You're there. Now it's about holding it.</template>
						<template v-else-if="body.weeksToGoal !== null">
							At the current rate you'd reach it in about
							{{ body.weeksToGoal }} week{{ body.weeksToGoal === 1 ? '' : 's' }}
							(around {{ goalDate }}).
						</template>
						<template v-else-if="body.ratePerWeek === null">
							Needs a few more weigh-ins in the last four weeks to project a date.
						</template>
						<template v-else>
							Your recent trend isn't heading toward this goal yet.
						</template>
					</p>
				</div>
			</section>

			<SectionHead title="Trend" note="every weigh-in, and the trend through them" />
			<section class="stat-panel stat-card">
				<div class="stat-head">
					<h3>Body weight</h3>
					<span class="hint">{{ dailyWeights.length }} weigh-in{{ dailyWeights.length === 1 ? '' : 's' }}</span>
				</div>
				<TimeSeriesChart :series="weightSeries" :goals="weightGoals" :y-format="kg" y-label="kg" />
				<p class="stat-note">
					The dots are individual weigh-ins and the line is your trend weight — a moving average that
					accounts for the days between readings, so it means the same whether you weigh in daily or
					twice a week. Judge progress from the line; a heavy dot after a salty dinner isn't a setback.
				</p>
			</section>
		</template>
	</div>
</template>

<style scoped>
.goal-card {
	padding: 14px 16px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	border-left: 2px solid var(--success-color);
}
.gc-lbl {
	font-size: 0.78rem;
	font-weight: 600;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: var(--text-secondary);
}
.gc-val { font-size: 1.6rem; font-weight: 600; line-height: 1.1; color: var(--text-color); }
.gc-unit { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
.gc-note { margin: 2px 0 0; font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary); }
</style>
