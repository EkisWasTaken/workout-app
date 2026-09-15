<script setup lang="ts">
/**
 * Gym progress.
 *
 * The headline is load *per session*, not total tonnage. Total tonnage mostly
 * tracks how often you turned up: train four times instead of two and it
 * doubles without a single heavier set. Per-session load is the one that
 * answers "am I lifting more than I was", so it leads, with volume and
 * consistency behind it.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { BarbellOutline } from '@vicons/ionicons5'
import MetricCard from '@/components/stats/MetricCard.vue'
import TrendSpark from '@/components/stats/TrendSpark.vue'
import LongTrendLine from '@/components/stats/LongTrendLine.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import { useCharts } from '@/utils/chartTheme'
import { weeklyVolumeChart } from '@/utils/weeklyChart'
import { getSportColor } from '@/utils/workouts'
import { gym, gymSessions, today } from '@/stats'
import { COMPARE_OFFSET, rollingWeeklyAverage, weeklyTotals, weekWindows } from '@/utils/progress'
import { parseISO } from 'date-fns'
import type { Workout } from '@/types'

const { add, destroy } = useCharts()
const tonnageCanvas = ref<HTMLCanvasElement | null>(null)

/** True when sessions exist but nobody has typed in a load. */
const missingLoad = computed(() =>
	gymSessions.value.length > 0 && gymSessions.value.every(w => !w.totalWeightLifted))

const dateOf = (w: Workout) => parseISO(w.date)
const tonnes = (w: Workout) => (w.totalWeightLifted || 0) / 1000

function buildTonnage() {
	if (!tonnageCanvas.value) return
	add(weeklyVolumeChart(tonnageCanvas.value, {
		weeks: weekWindows(12, today.value),
		totals: weeklyTotals(gymSessions.value, dateOf, tonnes, 12, today.value),
		rolling: rollingWeeklyAverage(gymSessions.value, dateOf, tonnes, 12, today.value),
		color: getSportColor('gym'),
		unit: 't',
		dp: 2,
	}))
}

async function buildAll() {
	destroy()
	await nextTick()
	buildTonnage()
}

const splitCompare = (trend: (number | null)[]) => (trend.length > COMPARE_OFFSET ? trend.length - 1 - COMPARE_OFFSET : null)
const fmtT = (v: number | null) => (v === null ? null : `${v.toFixed(2)} t`)

onMounted(buildAll)
watch(gym, buildAll)
</script>

<template>
	<div class="stat-tab">
		<EmptyState
			v-if="!gym.hasData"
			:icon="BarbellOutline"
			title="No gym sessions yet"
			body="Schedule a gym session and mark it complete. Log the total load you moved and this page starts tracking whether you're lifting more than you were."
			action-label="Go to schedule"
			action-to="/schedule"
		/>

		<template v-else>
			<SectionHead title="Progress" note="last 28 days vs the 28 before" />
			<section class="metric-grid">
				<MetricCard v-for="m in gym.metrics" :key="m.key" :metric="m" />
			</section>

			<div v-if="missingLoad" class="stat-banner info">
				<span>
					You've logged {{ gymSessions.length }} gym session{{ gymSessions.length === 1 ? '' : 's' }} but no
					load. Enter the total kilos moved when you complete a session and the strength
					metrics above start working.
				</span>
			</div>

			<SectionHead title="Volume" note="last 12 weeks" />
			<section class="stat-panel stat-card">
				<div class="stat-head"><h3>Weekly tonnage</h3><span class="hint">total load moved</span></div>
				<div class="stat-chart"><canvas ref="tonnageCanvas"></canvas></div>
				<p class="stat-note">
					Total load rises when you train more often as well as when you train harder — read it
					next to "load per session" above to tell the two apart.
				</p>
			</section>

			<template v-if="gym.splits.length">
				<SectionHead title="By split" note="median load per session, and which way it's going" />
				<section class="split-grid">
					<div v-for="s in gym.splits" :key="s.split" class="stat-panel split-card" :class="s.direction">
						<div class="split-top">
							<span class="split-name">{{ s.split }}</span>
							<span class="split-count">{{ s.sessions }} session{{ s.sessions === 1 ? '' : 's' }}</span>
						</div>
						<div class="split-value mono">
							{{ s.loadPerSession === null ? '—' : s.loadPerSession.toFixed(2)
							}}<span class="split-unit"> t/session</span>
						</div>
						<div v-if="s.loadPerSession !== null && s.previousLoadPerSession !== null" class="split-sub" :class="s.direction">
							<template v-if="s.direction === 'improving'">
								▲ {{ (s.loadPerSession - s.previousLoadPerSession).toFixed(2) }} t more per session than the 28 days before
							</template>
							<template v-else-if="s.direction === 'declining'">
								▼ {{ (s.previousLoadPerSession - s.loadPerSession).toFixed(2) }} t less per session than the 28 days before
							</template>
							<template v-else-if="s.direction === 'holding'">Steady — was {{ s.previousLoadPerSession.toFixed(2) }} t</template>
							<template v-else>
								{{ s.counts[0] }} session{{ s.counts[0] === 1 ? '' : 's' }} now vs {{ s.counts[1] }} before — needs 2 of each to call it
							</template>
						</div>
						<div v-else class="split-sub stat-muted">Not trained in both 28-day windows yet</div>
						<LongTrendLine :trend="s.long" :higher-is-better="true" :words="['heavier', 'lighter']" />
						<TrendSpark
							class="split-spark"
							:values="s.trend"
							:labels="s.trend.map(fmtT)"
							:direction="s.direction"
							:compare-index="s.previousLoadPerSession !== null ? splitCompare(s.trend) : null"
							:height="26"
						/>
					</div>
				</section>
			</template>

			<p class="stat-note footnote">
				Per-exercise tracking — estimated 1RM and PRs on individual lifts — needs sets and reps
				logged rather than one total. That's the natural next step for this page.
			</p>
		</template>
	</div>
</template>

<style scoped>
.split-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr)); gap: 12px; }

.split-card {
	padding: 13px 15px;
	display: flex;
	flex-direction: column;
	gap: 4px;
	border-left: 2px solid var(--border-color);
}
.split-card.improving { border-left-color: var(--success-color); }
.split-card.declining { border-left-color: var(--warning-color); }

.split-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.split-name { font-weight: 600; font-size: 0.9rem; color: var(--text-color); }
.split-count { font-size: 0.7rem; color: var(--text-muted); }

.split-value { font-size: 1.3rem; font-weight: 600; color: var(--text-color); }
.split-unit { font-size: 0.72rem; font-weight: 500; color: var(--text-muted); }

.split-sub { font-size: 0.73rem; color: var(--text-muted); line-height: 1.4; }
.split-sub.improving { color: var(--success-color); }
.split-sub.declining { color: var(--warning-color); }

.split-spark { margin-top: 6px; }

.footnote { margin-top: 20px; font-style: italic; }
</style>
