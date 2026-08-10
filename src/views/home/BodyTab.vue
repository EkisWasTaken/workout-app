<script setup lang="ts">
/**
 * Body weight progress, on a 7-day trailing mean.
 *
 * A single morning reading moves a kilo on hydration alone, so the old
 * "latest weigh-in vs the one four weeks ago" comparison was mostly measuring
 * noise. Smoothing first means the arrow shown is the direction that's real.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { BodyOutline } from '@vicons/ionicons5'
import { format, parseISO } from 'date-fns'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import { baseOpts, css, legend, useCharts } from '@/utils/chartTheme'
import { body, dailyWeights } from '@/stats'
import { settings } from '@/settings'

const { add, destroy } = useCharts()
const weightCanvas = ref<HTMLCanvasElement | null>(null)

const goalWeight = computed(() => settings.goalWeight)

function buildWeight() {
	if (!weightCanvas.value || !body.value.smoothed.length) return
	const smoothed = body.value.smoothed
	const raw = [...dailyWeights.value].sort((a, b) => a.date.localeCompare(b.date))

	const datasets: any[] = [
		{
			label: '7-day average',
			data: smoothed.map(p => p.weight),
			borderColor: css('--primary-color'),
			backgroundColor: 'transparent',
			borderWidth: 2,
			tension: 0.3,
			pointRadius: 0,
		},
		{
			label: 'Weigh-ins',
			data: raw.map(p => p.weight),
			borderColor: 'transparent',
			backgroundColor: css('--text-muted'),
			showLine: false,
			pointRadius: 2,
		},
	]

	if (goalWeight.value !== null) {
		datasets.push({
			label: 'Goal',
			data: smoothed.map(() => goalWeight.value),
			borderColor: css('--success-color'),
			borderWidth: 1.5,
			borderDash: [5, 5],
			pointRadius: 0,
		})
	}

	add(new Chart(weightCanvas.value, {
		type: 'line',
		data: { labels: smoothed.map(p => format(parseISO(p.date), 'd/M')), datasets },
		options: {
			...baseOpts('kg'),
			plugins: { ...baseOpts().plugins, legend: legend() },
			scales: {
				...baseOpts('kg').scales,
				x: {
					...baseOpts().scales.x,
					ticks: { color: css('--text-muted'), font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 },
				},
				y: { ...baseOpts('kg').scales.y, beginAtZero: false },
			},
		},
	}))
}

async function buildAll() {
	destroy()
	await nextTick()
	buildWeight()
}

onMounted(buildAll)
watch(body, buildAll)
</script>

<template>
	<div class="stat-tab">
		<EmptyState
			v-if="!body.hasData"
			:icon="BodyOutline"
			title="No weigh-ins yet"
			body="Log your weight from the schedule page. A few readings a week is plenty — the chart smooths out day-to-day noise so you see the real direction."
			action-label="Go to schedule"
			action-to="/schedule"
		/>

		<template v-else>
			<SectionHead title="Progress" note="7-day average, last 28 days vs the 28 before" />
			<section class="metric-grid">
				<MetricCard v-for="m in body.metrics" :key="m.key" :metric="m" />

				<div v-if="goalWeight !== null" class="stat-panel goal-card">
					<span class="gc-lbl">Goal</span>
					<span class="gc-val mono">{{ goalWeight.toFixed(1) }}<span class="gc-unit"> kg</span></span>
					<p class="gc-note">
						<template v-if="body.atGoal">You're there. Now it's about holding it.</template>
						<template v-else-if="body.weeksToGoal !== null">
							At the current rate you'd reach it in about
							{{ body.weeksToGoal }} week{{ body.weeksToGoal === 1 ? '' : 's' }}.
						</template>
						<template v-else>
							Your recent trend isn't heading toward this goal yet.
						</template>
					</p>
				</div>
			</section>

			<SectionHead title="Trend" note="every weigh-in, and the average through them" />
			<section class="stat-panel stat-card">
				<div class="stat-head">
					<h3>Body weight</h3>
					<span class="hint">{{ dailyWeights.length }} weigh-in{{ dailyWeights.length === 1 ? '' : 's' }}</span>
				</div>
				<div class="stat-chart"><canvas ref="weightCanvas"></canvas></div>
				<p class="stat-note">
					The dots are individual weigh-ins and the line is the 7-day average. Judge progress
					from the line — a single heavy dot after a salty dinner isn't a setback.
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
