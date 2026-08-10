<script setup lang="ts">
/**
 * Running progress.
 *
 * Ordered by how much each number tells you about whether you're improving,
 * which is close to the reverse of how the old page was ordered:
 *
 *   1. the five metrics that move from ordinary training
 *   2. fitness & form — the load model, which moves every single day
 *   3. volume and the ramp guardrail
 *   4. rolling bests — PBs found inside training runs, no race required
 *   5. heart-rate zones and VO₂, when a monitor is worn
 *   6. race readiness (VDOT, goal tracker, projection) — folded away, because
 *      it only moves when you race and can't answer "did this week count?"
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { NIcon } from 'naive-ui'
import Chart from 'chart.js/auto'
import 'chartjs-adapter-date-fns'
import { format, parseISO } from 'date-fns'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import { WalkOutline, TrophyOutline, WarningOutline, TrendingUpOutline } from '@vicons/ionicons5'
import { baseOpts, css, legend, useCharts } from '@/utils/chartTheme'
import { getSportColor } from '@/utils/workouts'
import { PULSE_ZONES, estimateVO2max, timeInZones } from '@/utils/analysis'
import { bests, hrSettings, load, ramp, running, runKmByWeek, activities, today } from '@/stats'
import { weekWindows, actDate, actSport } from '@/utils/progress'
import { currentFitness, currentVdot, fitnessLine, trackedTargets, vdotSamples, vdotTrend } from '@/fitness'
import { distanceGoals } from '@/settings'
import {
	DISTANCES, DISTANCE_LABELS, equivalentTimes, fmtTime, type DistanceKey,
} from '@/utils/vdot'

const { add, destroy } = useCharts()

const loadCanvas = ref<HTMLCanvasElement | null>(null)
const volumeCanvas = ref<HTMLCanvasElement | null>(null)
const zoneCanvas = ref<HTMLCanvasElement | null>(null)
const vo2Canvas = ref<HTMLCanvasElement | null>(null)
const vdotCanvas = ref<HTMLCanvasElement | null>(null)

const runColor = () => getSportColor('running')
const showRaceDetail = ref(false)

// ─── rolling bests ────────────────────────────────────────────────────────────

const bestRows = computed(() => bests.value.map(b => {
	const delta = b.current !== null && b.previous !== null ? b.current - b.previous : null
	return {
		...b,
		currentLabel: b.current === null ? '—' : fmtTime(b.current),
		allTimeLabel: b.allTime === null ? '—' : fmtTime(b.allTime),
		deltaLabel: delta === null || delta === 0
			? null
			: delta < 0
				? `${fmtTime(Math.abs(delta))} faster than the 90 days before`
				: `${fmtTime(delta)} off the previous 90 days`,
		improving: delta !== null && delta < 0,
	}
}))

// ─── heart-rate zones ─────────────────────────────────────────────────────────

const zoneWeeks = computed(() => {
	const { maxHR, restHR } = hrSettings.value
	if (!maxHR) return []
	return weekWindows(12, today.value).map(wk => {
		const totals = new Array(PULSE_ZONES.length).fill(0)
		for (const a of activities.value) {
			if (actSport(a) !== 'run') continue
			const d = actDate(a)
			if (d < wk.start || d > wk.end) continue
			const z = timeInZones(a, maxHR, restHR)
			if (!z) continue
			z.forEach((secs, i) => { totals[i] += secs })
		}
		const sum = totals.reduce((s, v) => s + v, 0)
		return { label: wk.label, pct: sum ? totals.map(v => Math.round((v / sum) * 100)) : totals }
	})
})

const zonesHaveData = computed(() => zoneWeeks.value.some(w => w.pct.some(v => v > 0)))

// ─── VO₂ ──────────────────────────────────────────────────────────────────────

const vo2Points = computed(() => {
	const { maxHR } = hrSettings.value
	if (!maxHR) return []
	return activities.value
		.filter(a => actSport(a) === 'run')
		.map(a => {
			const v = estimateVO2max(a, maxHR)
			return v === null ? null : { date: actDate(a).toISOString().slice(0, 10), vo2: v }
		})
		.filter((p): p is { date: string; vo2: number } => p !== null)
		.sort((a, b) => a.date.localeCompare(b.date))
})

const vo2Current = computed(() => {
	const pts = vo2Points.value.slice(-8)
	if (!pts.length) return null
	return Math.round((pts.reduce((s, p) => s + p.vo2, 0) / pts.length) * 10) / 10
})

/**
 * A neutral band label. The old version graded people "Poor" in red against
 * absolute thresholds with no age or sex adjustment, which is a rotten first
 * thing to tell someone who just started training.
 */
function vo2Band(v: number): string {
	if (v >= 60) return 'elite range'
	if (v >= 52) return 'well trained'
	if (v >= 43) return 'trained'
	if (v >= 35) return 'developing'
	return 'building a base'
}

// ─── race readiness ───────────────────────────────────────────────────────────

const equivalents = computed(() => {
	if (currentVdot.value === null) return []
	const equiv = equivalentTimes(currentVdot.value)
	return (Object.keys(DISTANCES) as DistanceKey[]).map(key => {
		const goal = distanceGoals[DISTANCES[key]]?.secs ?? null
		const delta = goal !== null ? equiv[key] - goal : null
		return {
			key,
			label: DISTANCE_LABELS[key],
			predicted: fmtTime(equiv[key]),
			goal: goal === null ? null : fmtTime(goal),
			ahead: delta !== null && delta <= 0,
			deltaLabel: delta === null
				? null
				: delta <= 0 ? `${fmtTime(Math.abs(delta))} ahead` : `${fmtTime(delta)} to find`,
		}
	})
})

const vdotHasData = computed(() => vdotSamples.value.length >= 3)

// ─── charts ───────────────────────────────────────────────────────────────────

function buildLoad() {
	if (!loadCanvas.value || !load.value) return
	const series = load.value.series
	add(new Chart(loadCanvas.value, {
		type: 'line',
		data: {
			labels: series.map(p => p.date),
			datasets: [
				{
					label: 'Fitness', data: series.map(p => p.fitness),
					borderColor: css('--primary-color'), backgroundColor: 'transparent',
					borderWidth: 2, pointRadius: 0, tension: 0.3,
				},
				{
					label: 'Fatigue', data: series.map(p => p.fatigue),
					borderColor: css('--warning-color'), backgroundColor: 'transparent',
					borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [4, 4],
				},
				{
					label: 'Form', data: series.map(p => p.form),
					borderColor: css('--text-muted'), backgroundColor: 'transparent',
					borderWidth: 1, pointRadius: 0, tension: 0.3,
				},
			],
		},
		options: {
			...baseOpts(),
			plugins: { ...baseOpts().plugins, legend: legend() },
			scales: {
				...baseOpts().scales,
				x: {
					...baseOpts().scales.x,
					ticks: { color: css('--text-muted'), font: { size: 10 }, maxTicksLimit: 6, maxRotation: 0 },
				},
			},
		},
	}))
}

function buildVolume() {
	if (!volumeCanvas.value) return
	const weeks = weekWindows(12, today.value)
	add(new Chart(volumeCanvas.value, {
		type: 'bar',
		data: {
			labels: weeks.map(w => w.label),
			datasets: [{
				label: 'Running', data: runKmByWeek.value,
				backgroundColor: runColor(), borderRadius: 4, maxBarThickness: 18,
			}],
		},
		options: baseOpts('km'),
	}))
}

function buildZones() {
	if (!zoneCanvas.value || !zonesHaveData.value) return
	const weeks = zoneWeeks.value
	add(new Chart(zoneCanvas.value, {
		type: 'bar',
		data: {
			labels: weeks.map(w => w.label),
			datasets: PULSE_ZONES.map((z, i) => ({
				label: z.name,
				data: weeks.map(w => w.pct[i]),
				backgroundColor: z.color,
				borderRadius: 2,
				maxBarThickness: 18,
			})),
		},
		options: {
			...baseOpts('% of run time'),
			plugins: {
				...baseOpts().plugins,
				legend: legend(),
				tooltip: {
					...baseOpts().plugins.tooltip,
					callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%` },
				},
			},
			scales: {
				x: { ...baseOpts().scales.x, stacked: true },
				y: { ...baseOpts().scales.y, stacked: true, max: 100 },
			},
		},
	}))
}

function buildVO2() {
	if (!vo2Canvas.value || vo2Points.value.length < 3) return
	const pts = vo2Points.value
	add(new Chart(vo2Canvas.value, {
		type: 'line',
		data: {
			labels: pts.map(p => format(parseISO(p.date), 'd/M')),
			datasets: [{
				label: 'VO₂ max', data: pts.map(p => p.vo2),
				borderColor: runColor(), backgroundColor: 'transparent',
				borderWidth: 2, tension: 0.3, pointRadius: 2,
			}],
		},
		options: baseOpts('ml/kg/min'),
	}))
}

function buildVdot() {
	if (!vdotCanvas.value || !vdotHasData.value) return
	const samples = vdotSamples.value
	const points = samples.map(s => ({ x: parseISO(s.date).getTime(), y: s.vdot, sample: s }))
	const isRace = (i: number) => samples[i].source === 'race'
	const goalLines = trackedTargets.value.slice(0, 3).map((t, i) => ({
		label: `${t.name} needs ${t.neededVdot}`,
		data: [
			{ x: points[0].x, y: t.neededVdot },
			{ x: points[points.length - 1].x, y: t.neededVdot },
		],
		borderColor: [css('--success-color'), css('--warning-color'), css('--text-muted')][i],
		borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0, fill: false,
	}))

	add(new Chart(vdotCanvas.value, {
		type: 'line',
		data: {
			datasets: [
				{
					label: 'Fitness (best of last 90 days)',
					data: fitnessLine.value.map(p => ({ x: parseISO(p.date).getTime(), y: p.vdot })),
					borderColor: css('--primary-color'), backgroundColor: 'transparent',
					borderWidth: 2, tension: 0.2, pointRadius: 0,
				},
				{
					label: 'Each run', data: points,
					borderColor: 'transparent', backgroundColor: runColor(), showLine: false,
					pointRadius: (ctx: any) => (isRace(ctx.dataIndex) ? 6 : 3),
					pointBorderColor: (ctx: any) => (isRace(ctx.dataIndex) ? css('--text-color') : runColor()),
					pointBorderWidth: (ctx: any) => (isRace(ctx.dataIndex) ? 2 : 0),
				},
				...goalLines,
			],
		},
		options: {
			...baseOpts('VDOT'),
			plugins: {
				...baseOpts().plugins,
				legend: legend(),
				tooltip: {
					...baseOpts().plugins.tooltip,
					callbacks: {
						title: (items: any[]) => format(new Date(items[0].parsed.x), 'd MMM yyyy'),
						label: (ctx: any) => {
							const s = ctx.raw?.sample
							return s ? ` VDOT ${s.vdot} — ${s.label}` : ` ${ctx.dataset.label}`
						},
					},
				},
			},
			scales: {
				x: {
					type: 'time', time: { unit: 'month' },
					grid: { display: false }, border: { display: false },
					ticks: { color: css('--text-muted'), font: { size: 10 }, maxRotation: 0 },
				},
				y: baseOpts('VDOT').scales.y,
			},
		},
	}))
}

async function buildAll() {
	destroy()
	await nextTick()
	buildLoad()
	buildVolume()
	buildZones()
	buildVO2()
	if (showRaceDetail.value) buildVdot()
}

onMounted(buildAll)
watch([running, load, showRaceDetail], buildAll)
</script>

<template>
	<div class="stat-tab">
		<EmptyState
			v-if="!running.hasData"
			:icon="WalkOutline"
			title="No runs logged yet"
			body="Complete a run on your schedule, or import a .fit/.gpx file from a watch. After a couple of runs this page starts tracking whether you're getting faster."
			action-label="Go to schedule"
			action-to="/schedule"
		/>

		<template v-else>
			<SectionHead title="Progress" note="last 28 days vs the 28 before" />
			<section class="metric-grid">
				<MetricCard v-for="m in running.metrics" :key="m.key" :metric="m" />
			</section>

			<!-- Ramp guardrail: progress that gets you injured isn't progress. -->
			<div v-if="ramp.verdict === 'sharp'" class="stat-banner warn">
				<n-icon :component="WarningOutline" />
				<span>{{ ramp.message }}</span>
			</div>

			<SectionHead
				title="Fitness &amp; form"
				note="training load — moves every day you train"
			/>
			<section v-if="load" class="stat-panel stat-card">
				<div class="stat-head">
					<h3>Load</h3>
					<div class="stat-badges">
						<span class="stat-badge"><span class="b-lbl">Fitness</span><span class="mono">{{ Math.round(load.fitness) }}</span></span>
						<span class="stat-badge"><span class="b-lbl">Fatigue</span><span class="mono">{{ Math.round(load.fatigue) }}</span></span>
						<span class="stat-badge" :class="load.formLabel === 'fresh' ? 'good' : load.formLabel === 'neutral' ? '' : 'warn'">
							<span class="b-lbl">Form</span><span class="mono">{{ Math.round(load.form) }}</span>
						</span>
					</div>
				</div>
				<div class="stat-chart"><canvas ref="loadCanvas"></canvas></div>
				<p class="stat-note">
					Fitness is the training you've banked over six weeks; fatigue is the last week of it.
					Form is what's left over.
					<template v-if="load.formLabel === 'fresh'">You're rested — a good week to test yourself.</template>
					<template v-else-if="load.formLabel === 'neutral'">You're balanced: training enough to build, recovered enough to absorb it.</template>
					<template v-else-if="load.formLabel === 'building'">You're carrying real fatigue. That's how fitness is built, but don't hold it forever.</template>
					<template v-else>Fatigue is running well ahead of fitness. Take an easy few days.</template>
				</p>
			</section>
			<EmptyState
				v-else
				:icon="TrendingUpOutline"
				title="Training load needs heart rate"
				body="Record runs with a heart rate monitor and set your max HR in Profile, and this becomes the number that moves every single day you train."
				action-label="Open Profile"
				action-to="/profile"
			/>

			<SectionHead title="Volume" :note="ramp.ratio ? `this week is ${ramp.ratio}× your 4-week average` : 'last 12 weeks'" />
			<section class="stat-panel stat-card">
				<div class="stat-head"><h3>Weekly distance</h3><span class="hint">km</span></div>
				<div class="stat-chart"><canvas ref="volumeCanvas"></canvas></div>
				<p class="stat-note">{{ ramp.message }}</p>
			</section>

			<SectionHead title="Best efforts" note="fastest inside any run — no race needed" />
			<section v-if="bestRows.length" class="best-grid">
				<div v-for="b in bestRows" :key="b.name" class="stat-panel best-card" :class="{ pb: b.freshPB }">
					<div class="best-top">
						<span class="best-name"><n-icon :component="TrophyOutline" /> {{ b.name }}</span>
						<span v-if="b.freshPB" class="pb-tag">PB</span>
					</div>
					<span class="best-value mono">{{ b.currentLabel }}</span>
					<span class="best-sub">last 90 days</span>
					<span v-if="b.deltaLabel" class="best-delta" :class="{ good: b.improving }">{{ b.deltaLabel }}</span>
					<span v-else-if="b.allTime !== null" class="best-delta muted">all-time {{ b.allTimeLabel }}</span>
				</div>
			</section>
			<EmptyState
				v-else
				bare
				:icon="TrophyOutline"
				title="No best efforts recorded yet"
				body="These come from imported .fit/.gpx files — the app finds your fastest 1 km, 5 km and 10 km inside every run, so they improve from ordinary training."
			/>

			<template v-if="zonesHaveData">
				<SectionHead title="Effort distribution" note="% of run time by heart-rate zone · 12 weeks" />
				<section class="stat-panel stat-card">
					<div class="stat-chart"><canvas ref="zoneCanvas"></canvas></div>
					<p class="stat-note">
						Most weeks should be dominated by the easy zones. If Z3 is your biggest band week
						after week, you're training in the middle ground that's too hard to recover from
						and too easy to drive adaptation.
					</p>
				</section>
			</template>

			<template v-if="vo2Points.length >= 3">
				<SectionHead title="Aerobic capacity" note="VO₂ max estimated from pace and heart rate" />
				<section class="stat-panel stat-card">
					<div class="stat-head">
						<h3>VO₂ max</h3>
						<span v-if="vo2Current" class="stat-badge">
							<span class="mono">{{ vo2Current }}</span>
							<span class="b-lbl">ml/kg/min · {{ vo2Band(vo2Current) }}</span>
						</span>
					</div>
					<div class="stat-chart"><canvas ref="vo2Canvas"></canvas></div>
					<p class="stat-note">
						An estimate, not a lab test — useful as a trend line, not as an absolute score.
					</p>
				</section>
			</template>

			<!-- Race readiness. Real, but it only moves when you race, so it sits
			     behind a disclosure rather than leading the page. -->
			<SectionHead title="Race readiness" note="what you could race today">
				<template #aside>
					<button class="stat-link-btn" @click="showRaceDetail = !showRaceDetail">
						{{ showRaceDetail ? 'Hide detail' : 'Show detail' }}
					</button>
				</template>
			</SectionHead>

			<section v-if="currentFitness" class="stat-panel readiness">
				<div class="readiness-top">
					<div>
						<span class="r-lbl">Current VDOT</span>
						<span class="r-val mono">{{ currentFitness.vdot }}</span>
					</div>
					<span class="r-source">
						{{ currentFitness.source === 'override' ? 'set manually' : `from ${currentFitness.label}` }}
						<template v-if="vdotTrend !== null"> · {{ vdotTrend > 0 ? '+' : '' }}{{ vdotTrend }}/month</template>
					</span>
				</div>
				<div v-if="equivalents.length" class="equiv-row">
					<div v-for="e in equivalents" :key="e.key" class="equiv-cell">
						<span class="equiv-lbl">{{ e.label }}</span>
						<span class="equiv-val mono">{{ e.predicted }}</span>
						<span v-if="e.deltaLabel" class="equiv-delta" :class="e.ahead ? 'good' : 'off'">{{ e.deltaLabel }}</span>
					</div>
				</div>
				<p class="stat-note">
					VDOT answers "what could I race today". It's a trailing best, so it only moves when
					you race or run something genuinely hard — that's why it's down here and not at the
					top. The metrics above are the ones that respond to a normal training week.
				</p>
			</section>
			<EmptyState
				v-else
				bare
				:icon="TrophyOutline"
				title="No race prediction yet"
				body="Log a race result or record a hard effort and a predicted finish time appears here."
				action-label="Add a race"
				action-to="/profile"
			/>

			<template v-if="showRaceDetail">
				<section v-if="trackedTargets.length" class="goal-grid">
					<div v-for="t in trackedTargets" :key="t.key" class="stat-panel goal-card" :class="{ reached: t.progress.gap <= 0 }">
						<div class="gc-head">
							<span class="gc-name">{{ t.name }}</span>
							<span v-if="t.date === null" class="gc-when muted">someday</span>
							<span v-else-if="t.progress.daysOut !== null && t.progress.daysOut >= 0" class="gc-when">{{ t.progress.daysOut }} days</span>
							<span v-else class="gc-when muted">past</span>
						</div>
						<div class="gc-target mono">{{ fmtTime(t.goalTimeSecs) }}</div>
						<div class="gc-vdots"><span>you {{ t.progress.currentVdot }}</span><span>needs {{ t.neededVdot }}</span></div>
						<p v-if="t.progress.gap <= 0" class="gc-verdict good">Already there — {{ Math.abs(t.progress.gap) }} VDOT to spare.</p>
						<p v-else-if="t.progress.onTrack === true" class="gc-verdict good">On track. Trend projects {{ t.progress.projectedVdot }} by then.</p>
						<p v-else-if="t.progress.onTrack === false" class="gc-verdict off">Behind — trend arrives {{ t.progress.projectedShortfall }} VDOT short.</p>
						<p v-else class="gc-verdict muted">Needs {{ t.progress.gap }} more VDOT.</p>
					</div>
				</section>

				<section v-if="vdotHasData" class="stat-panel stat-card">
					<div class="stat-head"><h3>VDOT over time</h3><span class="hint">races ringed</span></div>
					<div class="stat-chart"><canvas ref="vdotCanvas"></canvas></div>
				</section>
			</template>
		</template>
	</div>
</template>

<style scoped>
/* Only what is specific to running lives here; the panel, chart and metric
   grid chrome is shared across all four sport tabs in styles/stats.css. */

/* Best efforts */
.best-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.best-card { padding: 13px 15px; display: flex; flex-direction: column; gap: 3px; }
.best-card.pb { border-color: color-mix(in srgb, var(--success-color) 45%, transparent); }
.best-top { display: flex; align-items: center; justify-content: space-between; }
.best-name {
	display: inline-flex; align-items: center; gap: 6px;
	font-size: 0.78rem; color: var(--text-secondary); font-weight: 600;
}
.pb-tag {
	font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em;
	color: var(--success-color); background: var(--success-soft);
	padding: 2px 7px; border-radius: 999px;
}
.best-value { font-size: 1.35rem; font-weight: 600; color: var(--text-color); }
.best-sub { font-size: 0.7rem; color: var(--text-muted); }
.best-delta { font-size: 0.74rem; color: var(--text-muted); margin-top: 3px; }
.best-delta.good { color: var(--success-color); }

/* Race readiness */
.readiness { padding: 15px 17px; }
.readiness-top {
	display: flex; align-items: baseline; justify-content: space-between;
	gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
}
.r-lbl { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-right: 9px; }
.r-val { font-size: 1.5rem; font-weight: 600; color: var(--text-color); }
.r-source { font-size: 0.78rem; color: var(--text-muted); }

.equiv-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.equiv-cell {
	display: flex; flex-direction: column; gap: 2px;
	padding: 9px 11px; background: var(--surface-2); border-radius: var(--radius-sm);
}
.equiv-lbl { font-size: 0.7rem; color: var(--text-muted); }
.equiv-val { font-size: 1rem; font-weight: 600; color: var(--text-color); }
.equiv-delta { font-size: 0.68rem; color: var(--text-muted); }
.equiv-delta.good { color: var(--success-color); }

/* Goal cards */
.goal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 12px; }
.goal-card { padding: 13px 15px; display: flex; flex-direction: column; gap: 6px; }
.goal-card.reached { border-color: color-mix(in srgb, var(--success-color) 40%, transparent); }
.gc-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.gc-name { font-weight: 600; font-size: 0.88rem; color: var(--text-color); }
.gc-when { font-size: 0.72rem; color: var(--text-secondary); }
.gc-target { font-size: 1.25rem; font-weight: 600; color: var(--text-color); }
.gc-vdots { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); }
.gc-verdict { margin: 2px 0 0; font-size: 0.76rem; line-height: 1.45; }
.gc-verdict.good { color: var(--success-color); }
.gc-verdict.off { color: var(--warning-color); }
.gc-verdict.muted { color: var(--text-muted); }
.muted { color: var(--text-muted); }
</style>
