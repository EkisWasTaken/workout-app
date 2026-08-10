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
import Chart from 'chart.js/auto'
import { BarbellOutline } from '@vicons/ionicons5'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import { baseOpts, useCharts } from '@/utils/chartTheme'
import { getSportColor } from '@/utils/workouts'
import { completed, gym, sportOf, today } from '@/stats'
import { weekWindows } from '@/utils/progress'

const { add, destroy } = useCharts()
const tonnageCanvas = ref<HTMLCanvasElement | null>(null)

const gymSessions = computed(() => completed.value.filter(w => sportOf(w) === 'gym'))

/** True when sessions exist but nobody has typed in a load. */
const missingLoad = computed(() =>
	gymSessions.value.length > 0 && gymSessions.value.every(w => !w.totalWeightLifted))

const weeklyTonnage = computed(() =>
	weekWindows(12, today.value).map(wk =>
		gymSessions.value
			.filter(w => {
				const d = new Date(w.date)
				return d >= wk.start && d <= wk.end
			})
			.reduce((s, w) => s + (w.totalWeightLifted || 0), 0) / 1000))

function buildTonnage() {
	if (!tonnageCanvas.value) return
	const weeks = weekWindows(12, today.value)
	add(new Chart(tonnageCanvas.value, {
		type: 'bar',
		data: {
			labels: weeks.map(w => w.label),
			datasets: [{
				label: 'Tonnage',
				data: weeklyTonnage.value,
				backgroundColor: getSportColor('gym'),
				borderRadius: 4,
				maxBarThickness: 18,
			}],
		},
		options: baseOpts('tonnes'),
	}))
}

async function buildAll() {
	destroy()
	await nextTick()
	buildTonnage()
}

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
				<SectionHead title="By split" note="work per session, and which way it's going" />
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
								▲ {{ (s.loadPerSession - s.previousLoadPerSession).toFixed(2) }} t more per session than last month
							</template>
							<template v-else-if="s.direction === 'declining'">
								▼ {{ (s.previousLoadPerSession - s.loadPerSession).toFixed(2) }} t less per session than last month
							</template>
							<template v-else>Level with last month</template>
						</div>
						<div v-else class="split-sub stat-muted">Not trained in both periods yet</div>
						<div class="split-spark">
							<div
								v-for="(h, i) in s.spark"
								:key="i"
								class="ss-bar"
								:class="{ last: i === s.spark.length - 1 }"
								:style="{ height: Math.max(6, h) + '%' }"
							></div>
						</div>
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

.split-spark { display: flex; align-items: flex-end; gap: 3px; height: 24px; margin-top: 4px; }
.ss-bar { flex: 1; min-width: 3px; border-radius: 2px 2px 0 0; background: var(--surface-hover); }
.ss-bar.last { background: var(--color-gym-primary); }

.footnote { margin-top: 20px; font-style: italic; }
</style>
