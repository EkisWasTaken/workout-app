<script setup lang="ts">
/**
 * Body weight progress, on a trend weight.
 *
 * A single morning reading moves a kilo on hydration alone, so the headline is
 * a time-aware moving average and the rate is fitted through every weigh-in of
 * the last four weeks. The chart uses a real time axis: the old one spaced
 * weigh-ins evenly, so a three-week gap looked like a day.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import 'chartjs-adapter-date-fns'
import { BodyOutline } from '@vicons/ionicons5'
import { format, parseISO } from 'date-fns'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import { baseOpts, css, legend, useCharts } from '@/utils/chartTheme'
import { body, dailyWeights, today } from '@/stats'
import { settings } from '@/settings'

const { add, destroy } = useCharts()
const weightCanvas = ref<HTMLCanvasElement | null>(null)

const goalWeight = computed(() => settings.goalWeight)

function buildWeight() {
	if (!weightCanvas.value || !body.value.smoothed.length) return
	const smoothed = body.value.smoothed
	const raw = [...dailyWeights.value].sort((a, b) => a.date.localeCompare(b.date))
	const t = (d: string) => parseISO(d).getTime()

	const datasets: any[] = [
		{
			label: 'Trend weight',
			data: smoothed.map(p => ({ x: t(p.date), y: p.weight })),
			borderColor: css('--primary-color'),
			backgroundColor: 'transparent',
			borderWidth: 2.25,
			tension: 0.35,
			cubicInterpolationMode: 'monotone',
			pointRadius: 0,
			pointHoverRadius: 0,
		},
		{
			label: 'Weigh-ins',
			data: raw.map(p => ({ x: t(p.date), y: p.weight })),
			borderColor: 'transparent',
			backgroundColor: css('--text-muted'),
			showLine: false,
			pointRadius: 2.5,
			pointHoverRadius: 4,
		},
	]

	if (goalWeight.value !== null) {
		datasets.push({
			label: 'Goal',
			data: [{ x: t(raw[0].date), y: goalWeight.value }, { x: Math.max(t(raw[raw.length - 1].date), today.value.getTime()), y: goalWeight.value }],
			borderColor: css('--success-color'),
			borderWidth: 1.5,
			borderDash: [5, 5],
			pointRadius: 0,
			pointHoverRadius: 0,
		})
	}

	add(new Chart(weightCanvas.value, {
		type: 'line',
		data: { datasets },
		options: {
			...baseOpts('kg'),
			animation: { duration: 450, easing: 'easeOutCubic' },
			plugins: {
				...baseOpts().plugins,
				legend: legend(),
				tooltip: {
					...baseOpts().plugins.tooltip,
					callbacks: {
						title: (items: any[]) => format(new Date(items[0].parsed.x), 'EEE d MMM yyyy'),
						label: (ctx: any) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)} kg`,
					},
				},
			},
			scales: {
				x: {
					type: 'time',
					time: { unit: raw.length && t(raw[raw.length - 1].date) - t(raw[0].date) > 120 * 86_400_000 ? 'month' : 'week' },
					grid: { display: false }, border: { display: false },
					ticks: { color: css('--text-muted'), font: { size: 10 }, maxRotation: 0, maxTicksLimit: 8 },
				},
				y: { ...baseOpts('kg').scales.y, beginAtZero: false },
			},
		} as any,
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
							(around {{ format(new Date(today.getTime() + body.weeksToGoal * 7 * 86_400_000), 'MMMM yyyy') }}).
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
				<div class="stat-chart"><canvas ref="weightCanvas"></canvas></div>
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
