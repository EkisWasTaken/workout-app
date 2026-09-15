<script setup lang="ts">
/**
 * Running progress.
 *
 * Ordered by how much each number tells you about whether you're improving,
 * which is close to the reverse of how the old page was ordered:
 *
 *   1. the metrics that move from ordinary training
 *   2. aerobic pace over time — every steady run, rescaled to one heart rate
 *   3. fitness & form — the load model, which moves every single day
 *   4. volume and the ramp guardrail
 *   5. rolling bests — PBs found inside training runs, no race required
 *   6. heart-rate zones, when a monitor is worn
 *   7. race readiness (VDOT, goal tracker, projection) — folded away, because
 *      it only moves when you race and can't answer "did this week count?"
 */
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { parseISO } from 'date-fns'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import TimeSeriesChart, { type ChartSeries, type GoalLine } from '@/components/charts/TimeSeriesChart.vue'
import WeeklyBarsChart from '@/components/charts/WeeklyBarsChart.vue'
import StackedShareChart from '@/components/charts/StackedShareChart.vue'
import RouteHeatmap from '@/components/RouteHeatmap.vue'
import { WalkOutline, TrophyOutline, WarningOutline, TrendingUpOutline, PulseOutline } from '@vicons/ionicons5'
import { PULSE_ZONES, timeInZones } from '@/utils/analysis'
import { bests, hrSettings, load, ramp, running, runKmByWeek, runSessions, activities, today } from '@/stats'
import {
	weekWindows, actDate, actSport, aerobicPacePoints, rollingMedianLine, rollingWeeklyAverage,
	referenceHR, REF_HRR, periods, inPeriod, median,
} from '@/utils/progress'
import { currentFitness, currentVdot, fitnessLine, trackedTargets, vdotSamples, vdotTrend } from '@/fitness'
import { distanceGoals } from '@/settings'
import {
	DISTANCES, DISTANCE_LABELS, equivalentTimes, fmtTime, type DistanceKey,
} from '@/utils/vdot'

// Colours are CSS variables, not resolved values: the SVG reads them live, so
// the charts follow the theme without being rebuilt.
const RUN = 'var(--color-running-primary)'

/** Runs with GPS behind them — the only ones the heatmap can draw. */
const mappedRuns = computed(() =>
	activities.value.filter(a => actSport(a).includes('run') && (a?.map?.polyline || a?.map?.summary_polyline)))
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
		return { label: wk.label, minutes: Math.round(sum / 60), pct: sum ? totals.map(v => (v / sum) * 100) : totals }
	})
})

const zoneCategories = PULSE_ZONES.map(z => ({ label: z.name, color: z.color }))
const zoneNote = (i: number) => {
	const m = zoneWeeks.value[i]?.minutes ?? 0
	return m ? `${m} min of running with heart rate` : null
}

const zonesHaveData = computed(() => zoneWeeks.value.some(w => w.pct.some(v => v > 0)))

// ─── aerobic pace over time ───────────────────────────────────────────────────

const refBpm = computed(() =>
	hrSettings.value.maxHR ? referenceHR(hrSettings.value.maxHR, hrSettings.value.restHR) : null)

/** Every steady run, rescaled to the reference heart rate. Same numbers as the headline card. */
const pacePoints = computed(() =>
	aerobicPacePoints(activities.value, hrSettings.value.maxHR, hrSettings.value.restHR))

const paceLine = computed(() => rollingMedianLine(pacePoints.value, p => p.paceSec))

/**
 * VO₂max implied by the current aerobic pace. It's the same model rearranged —
 * speed at a known fraction of HR reserve — so it can never disagree with the
 * pace card, unlike the separate per-run average this replaced.
 */
const vo2Current = computed(() => {
	const cur = periods(today.value).current
	const recent = pacePoints.value.filter(p => inPeriod(parseISO(p.date), cur)).map(p => p.paceSec)
	const pace = median(recent)
	if (pace === null || recent.length < 3) return null
	const speedMpm = (1000 / pace) * 60
	return Math.round((3.5 + (0.2 * speedMpm) / REF_HRR) * 10) / 10
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
// Each chart is plain reactive data. The components re-render and animate when
// it changes, so there's no build/destroy lifecycle to keep in step any more.

const t = (d: string) => parseISO(d).getTime()

const loadSeries = computed<ChartSeries[]>(() => {
	const s = load.value?.series ?? []
	return [
		{ key: 'fitness', label: 'Fitness', kind: 'line', color: 'var(--primary-color)', width: 2.5, points: s.map(p => ({ x: t(p.date), y: p.fitness })) },
		{ key: 'fatigue', label: 'Fatigue', kind: 'line', color: 'var(--warning-color)', width: 1.5, dash: [4, 4], points: s.map(p => ({ x: t(p.date), y: p.fatigue })) },
		{ key: 'form', label: 'Form', kind: 'line', color: 'var(--text-muted)', width: 1.25, points: s.map(p => ({ x: t(p.date), y: p.form })) },
	]
})

const volumeWeeks = computed(() => weekWindows(12, today.value))
const volumeAverage = computed(() =>
	rollingWeeklyAverage(runSessions.value, s => s.date, s => s.km, 12, today.value))

const paceSeries = computed<ChartSeries[]>(() => [
	{
		key: 'run', label: 'Each steady run', kind: 'dots', color: 'var(--text-muted)', size: 5,
		points: pacePoints.value.map(p => ({ x: t(p.date), y: p.paceSec })),
	},
	{
		key: 'median', label: '28-day median', kind: 'line', color: RUN, width: 2.5, connectGaps: true,
		points: paceLine.value.map(p => ({ x: t(p.date), y: p.value })),
	},
])
const fmtPaceTick = (v: number) => fmtTime(Math.round(v))

const vdotSeries = computed<ChartSeries[]>(() => [
	{
		key: 'sample', label: 'Each run (races ringed)', kind: 'dots', color: RUN, size: 5,
		points: vdotSamples.value.map(s => ({
			x: t(s.date), y: s.vdot, note: s.label, emphasis: s.source === 'race',
		})),
	},
	{
		key: 'line', label: 'Fitness (best of last 90 days)', kind: 'line', color: 'var(--primary-color)', width: 2.25, connectGaps: true,
		points: fitnessLine.value.map(p => ({ x: t(p.date), y: p.vdot })),
	},
])

const GOAL_COLORS = ['var(--success-color)', 'var(--warning-color)', 'var(--text-secondary)']
const vdotGoals = computed<GoalLine[]>(() =>
	trackedTargets.value.slice(0, 3).map((g, i) => ({ label: `${g.name} · ${g.neededVdot}`, value: g.neededVdot, color: GOAL_COLORS[i] })))
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

			<p v-if="hrSettings.maxHR && hrSettings.inferred" class="stat-note">
				Heart-rate figures use a max HR of {{ hrSettings.maxHR }} bpm, taken from your recordings.
				If you know your real max, set it in <router-link to="/profile" class="stat-inline-link">Profile</router-link>
				— zones, training load and pace-at-heart-rate all depend on it.
			</p>

			<!-- Ramp guardrail: progress that gets you injured isn't progress. -->
			<div v-if="ramp.verdict === 'sharp'" class="stat-banner warn">
				<n-icon :component="WarningOutline" />
				<span>{{ ramp.message }}</span>
			</div>

			<SectionHead
				title="Aerobic pace"
				:note="refBpm ? `every steady run, rescaled to ${refBpm} bpm` : 'pace for the same heart rate'"
			/>
			<section v-if="pacePoints.length >= 2" class="stat-panel stat-card">
				<div class="stat-head">
					<h3>Pace at {{ refBpm }} bpm</h3>
					<span
						v-if="vo2Current"
						class="stat-badge"
						title="Estimated from the same pace and heart-rate model — read it as a trend, not a lab result"
					>
						<span class="b-lbl">VO₂max est.</span>
						<span class="mono">{{ vo2Current }}</span>
						<span class="b-lbl">{{ vo2Band(vo2Current) }}</span>
					</span>
				</div>
				<TimeSeriesChart
					:series="paceSeries"
					:y-format="fmtPaceTick"
					:y-label="`min/km at ${refBpm} bpm`"
					reverse-y
					date-format="EEE d MMM yyyy"
				/>
				<p class="stat-note">
					Each dot is a steady run of 15+ minutes, its pace rescaled to what it would have been at
					{{ refBpm }} bpm — so an easy jog and a steadier long run land on the same scale. The line is
					the median of the 28 days up to each point, and it rising means you're faster for the same
					effort. Hard sessions and very short runs are left out.
				</p>
			</section>
			<EmptyState
				v-else
				bare
				:icon="PulseOutline"
				title="Needs runs with heart rate"
				body="Import runs recorded with a heart rate monitor. Every steady run of 15 minutes or more adds a point, and the line shows whether you're getting faster for the same effort."
			/>

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
				<TimeSeriesChart :series="loadSeries" :y-format="(v: number) => String(Math.round(v))" date-format="EEE d MMM" />
				<div v-if="load.warmingUp" class="stat-banner info">
					<span>
						Fitness starts from zero at your first recording and takes about six weeks to settle, so
						for now it rises whatever you do. Read the trend once you have two months of history.
					</span>
				</div>
				<p class="stat-note">
					Built from {{ load.sessions }} recording{{ load.sessions === 1 ? '' : 's' }} with heart
					rate; sessions without one add no load.
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

			<SectionHead title="Volume" note="last 12 weeks" />
			<section class="stat-panel stat-card">
				<div class="stat-head"><h3>Weekly distance</h3><span class="hint">km</span></div>
				<WeeklyBarsChart
					:labels="volumeWeeks.map(w => w.label)"
					:totals="runKmByWeek"
					:average="volumeAverage"
					:color="RUN"
					unit="km"
				/>
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
					<StackedShareChart
						:labels="zoneWeeks.map(w => w.label)"
						:categories="zoneCategories"
						:values="zoneWeeks.map(w => w.pct)"
						:period-note="zoneNote"
					/>
					<p class="stat-note">
						Most weeks should be dominated by the easy zones. If Z3 is your biggest band week
						after week, you're training in the middle ground that's too hard to recover from
						and too easy to drive adaptation.
					</p>
				</section>
			</template>

			<template v-if="mappedRuns.length">
				<SectionHead title="Where you run" note="every recorded route, stacked" />
				<section>
					<RouteHeatmap :activities="mappedRuns" color="var(--color-running-primary)" />
					<p class="stat-note">
						Each route is drawn faintly, so the roads you repeat come out brightest. Only runs
						imported from a watch carry GPS — hand-logged sessions aren't here.
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

				<section v-if="vdotHasData" class="stat-panel stat-card vdot-card">
					<div class="stat-head"><h3>VDOT over time</h3><span class="hint">races ringed</span></div>
					<TimeSeriesChart
						:series="vdotSeries"
						:goals="vdotGoals"
						:y-format="(v: number) => (Math.round(v * 10) / 10).toString()"
						y-label="VDOT"
					/>
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

.vdot-card { margin-top: 12px; }

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
