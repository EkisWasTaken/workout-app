<template>
	<div class="home-view">
		<!-- Header -->
		<header class="home-header">
			<div>
				<h1 class="greeting">{{ greeting }}<span v-if="userName">, {{ userName }}</span></h1>
				<p class="subgreeting">{{ todayLabel }}</p>
			</div>
			<div class="header-actions">
				<span v-if="weekStreak > 0" class="streak-badge">
					<n-icon :component="FlameOutline" /> {{ weekStreak }}-week streak
				</span>
				<router-link to="/schedule" class="primary-btn">
					<n-icon :component="AddOutline" /> Plan workout
				</router-link>
			</div>
		</header>

		<!-- This-week metric cards -->
		<section class="metric-grid">
			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Distance this week</span><n-icon class="metric-ico run" :component="WalkOutline" /></div>
				<div class="metric-value mono">{{ fmt(thisWeekDistance) }}<span class="unit"> km</span></div>
				<div class="metric-split">
					<span><i class="sw run"></i>{{ fmt(runWeek) }} run</span>
					<span><i class="sw bike"></i>{{ fmt(bikeWeek) }} bike</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Sessions</span><n-icon class="metric-ico" :component="CheckmarkDoneOutline" /></div>
				<div class="metric-value mono">{{ sessionsDone }}<span class="unit"> / {{ sessionsPlanned }}</span></div>
				<div class="progress-track"><div class="progress-fill" :style="{ width: sessionsPct + '%' }"></div></div>
			</div>

			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Load lifted</span><n-icon class="metric-ico gym" :component="BarbellOutline" /></div>
				<div class="metric-value mono">{{ fmt(thisWeekTonnage) }}<span class="unit"> t</span></div>
				<div class="metric-sub muted">{{ gymSessionsThisWeek }} gym session{{ gymSessionsThisWeek === 1 ? '' : 's' }}</div>
			</div>

			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Body weight</span><n-icon class="metric-ico" :component="BodyOutline" /></div>
				<div class="metric-value mono">{{ latestWeight ? fmt(latestWeight) : '—' }}<span v-if="latestWeight" class="unit"> kg</span></div>
				<div v-if="latestWeight && goalWeight" class="metric-sub" :class="weightToGoal <= 0 ? 'up' : 'muted'">
					{{ weightToGoal === 0 ? 'at goal' : fmt(Math.abs(weightToGoal)) + ' kg to goal' }}
				</div>
				<div v-else class="metric-sub muted">no goal set</div>
			</div>
		</section>

		<!-- This week + next race -->
		<section class="row-two">
			<div class="panel week-panel">
				<div class="panel-head">
					<h2>This week</h2>
					<router-link to="/schedule" class="text-link">Open schedule →</router-link>
				</div>
				<div class="week-strip">
					<router-link v-for="day in weekDays" :key="day.key" to="/schedule" class="day-col" :class="{ today: day.isToday }">
						<span class="day-name">{{ day.name }}</span>
						<div class="day-box">
							<template v-if="day.workouts.length">
								<span v-for="w in day.workouts" :key="w.id" class="day-chip" :class="{ done: w.isCompleted === 1 }"
									:style="{ '--c': sportColor(w) }" :title="w.name">{{ chipLabel(w) }}</span>
							</template>
							<span v-else class="day-empty">·</span>
						</div>
					</router-link>
				</div>
			</div>

			<div class="panel race-panel" :class="{ urgent: nextRaceDays !== null && nextRaceDays <= 14 }">
				<div class="panel-head"><h2><n-icon :component="FlagOutline" /> Next race</h2></div>
				<template v-if="nextRace">
					<p class="race-name">{{ nextRace.name }}</p>
					<p class="race-date">{{ formatRaceDate(nextRace.date) }}</p>
					<div class="race-counts">
						<div class="race-count"><span class="rc-num mono">{{ nextRaceDays }}</span><span class="rc-lbl">days</span></div>
						<div class="race-count"><span class="rc-num mono">{{ Math.ceil((nextRaceDays || 0) / 7) }}</span><span class="rc-lbl">weeks</span></div>
					</div>
				</template>
				<div v-else class="race-empty">
					<p>No upcoming races.</p>
					<router-link to="/profile" class="text-link">Add a race goal →</router-link>
				</div>
			</div>
		</section>

		<!-- Trends -->
		<div class="section-head"><h2>Trends</h2><span class="section-note">last 12 weeks</span></div>
		<section class="chart-grid">
			<div class="panel chart-card">
				<div class="chart-head"><h3>Weekly distance</h3><span class="note">running vs bike</span></div>
				<div class="chart-body"><canvas ref="distanceCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head"><h3><span class="dot gym"></span>Weekly tonnage</h3><span class="note">gym load</span></div>
				<div class="chart-body"><canvas ref="tonnageCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head"><h3><span class="dot weight"></span>Body weight</h3><span class="note">vs goal</span></div>
				<div class="chart-body"><canvas ref="weightCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head"><h3>Sport mix</h3><span class="note">all completed</span></div>
				<div class="chart-body"><canvas ref="mixCanvas"></canvas></div>
			</div>
		</section>

		<!-- Zone distribution -->
		<section v-if="zonesHasData" class="zone-section" style="margin-top: 14px">
			<div class="panel chart-card">
				<div class="chart-head">
					<h3>Weekly zones</h3>
					<span class="note">% of run time · 12 weeks · Karvonen · max {{ maxHRDisplay }} / rest {{ restingHR }} bpm</span>
				</div>
				<div class="chart-body"><canvas ref="zoneCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head">
					<h3>Zone balance</h3>
					<span class="note">last 4 weeks</span>
				</div>
				<div class="chart-body"><canvas ref="zoneDonutCanvas"></canvas></div>
			</div>
		</section>

		<!-- Fitness & freshness -->
		<template v-if="fitnessHasData">
			<div class="section-head"><h2>Fitness &amp; freshness</h2><span class="section-note">training load model · last 3 months</span></div>
			<section class="panel chart-card fitness-card">
				<div class="chart-head">
					<h3>Form = fitness − fatigue</h3>
					<div class="fitness-badges">
						<span class="fit-badge"><i style="background: #4f8cff"></i>Fitness <span class="mono">{{ currentFitness?.fitness ?? '—' }}</span></span>
						<span class="fit-badge"><i style="background: #fb8c00"></i>Fatigue <span class="mono">{{ currentFitness?.fatigue ?? '—' }}</span></span>
						<span class="fit-badge"><i style="background: #56d364"></i>Form <span class="mono">{{ currentFitness?.form ?? '—' }}</span></span>
					</div>
				</div>
				<div class="chart-body fitness-chart-body"><canvas ref="fitnessCanvas"></canvas></div>
				<p class="vo2-note">Relative Effort (TRIMP) per session from heart-rate data, fed into 42-day fitness / 7-day fatigue exponential averages — the same model as Strava's premium Fitness &amp; Freshness. Gym sessions without HR count via RPE × duration.</p>
			</section>
		</template>

		<!-- Projections -->
		<template v-if="weightPrediction || runningPrediction">
			<div class="section-head"><h2>Projections</h2><span class="section-note">based on recent trends</span></div>
			<section class="pred-grid">
				<div v-if="runningPrediction" class="pred-card panel">
					<div class="pred-icon run"><n-icon :component="WalkOutline" /></div>
					<div class="pred-body">
						<div class="pred-label">Running volume</div>
						<div class="pred-main">
							<span class="mono">{{ fmt(runningPrediction.proj4w) }}<span class="unit"> km</span></span>
							<span class="pred-timeframe">in 4 weeks</span>
						</div>
						<div class="pred-trend" :class="runningPrediction.slopePerWeek >= 0 ? 'pos' : 'neg'">
							{{ runningPrediction.slopePerWeek >= 0 ? '↑' : '↓' }}
							{{ fmt(Math.abs(runningPrediction.slopePerWeek)) }} km/week
							· avg {{ fmt(runningPrediction.currentAvg) }} km
						</div>
					</div>
				</div>
				<div v-if="weightPrediction && goalWeight" class="pred-card panel">
					<div class="pred-icon"><n-icon :component="BodyOutline" /></div>
					<div class="pred-body">
						<div class="pred-label">Weight projection</div>
						<div class="pred-main">
							<span class="mono">{{ fmt(weightPrediction.proj4w) }}<span class="unit"> kg</span></span>
							<span class="pred-timeframe">in 4 weeks</span>
						</div>
						<div v-if="weightPrediction.weeksToGoal !== null && weightPrediction.weeksToGoal > 0" class="pred-trend">
							Goal est. in {{ weightPrediction.weeksToGoal }} week{{ weightPrediction.weeksToGoal === 1 ? '' : 's' }}
						</div>
						<div v-else-if="weightPrediction.weeksToGoal !== null && weightPrediction.weeksToGoal <= 0" class="pred-trend pos">
							At or past goal ✓
						</div>
						<div v-else class="pred-trend muted">Set a goal to project</div>
					</div>
				</div>
				<div v-if="weightPrediction && !goalWeight" class="pred-card panel">
					<div class="pred-icon"><n-icon :component="BodyOutline" /></div>
					<div class="pred-body">
						<div class="pred-label">Weight projection</div>
						<div class="pred-main">
							<span class="mono">{{ fmt(weightPrediction.proj4w) }}<span class="unit"> kg</span></span>
							<span class="pred-timeframe">in 4 weeks</span>
						</div>
						<div class="pred-trend" :class="weightPrediction.slopePerWeek < 0 ? 'pos' : weightPrediction.slopePerWeek > 0 ? 'neg' : 'muted'">
							{{ weightPrediction.slopePerWeek > 0 ? '↑' : weightPrediction.slopePerWeek < 0 ? '↓' : '→' }}
							{{ fmt(Math.abs(weightPrediction.slopePerWeek)) }} kg/week
						</div>
					</div>
				</div>
			</section>
		</template>

		<!-- Race predictor -->
		<template v-if="racePredictor">
			<div class="section-head">
				<h2>Race predictor</h2>
				<span class="section-note">Riegel formula · {{ racePredictor.basedOn }}</span>
			</div>
			<section class="pr-grid">
				<div class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> 5 km</span>
					<span class="pr-value mono">{{ racePredictor.fiveK }}</span>
				</div>
				<div class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> 10 km</span>
					<span class="pr-value mono">{{ racePredictor.tenK }}</span>
				</div>
				<div class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> Half marathon</span>
					<span class="pr-value mono">{{ racePredictor.half }}</span>
				</div>
				<div class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> Marathon</span>
					<span class="pr-value mono">{{ racePredictor.full }}</span>
				</div>
			</section>
		</template>

		<!-- VO2 Max -->
		<template v-if="vo2HasData">
			<div class="section-head"><h2>Aerobic fitness</h2><span class="section-note">VO₂ max · estimated from pace + HR</span></div>
			<section class="panel chart-card vo2-card">
				<div class="chart-head">
					<h3>VO₂ max trend</h3>
					<div class="vo2-badge-row">
						<span v-if="vo2CurrentRun" class="vo2-badge run">
							<span class="vo2-badge-label">Running</span>
							<span class="mono">{{ vo2CurrentRun }}</span>
							<span class="vo2-badge-unit">ml/kg/min</span>
							<span class="vo2-zone-chip" :style="{ color: vo2Zone(vo2CurrentRun).color }">{{ vo2Zone(vo2CurrentRun).label }}</span>
						</span>
					</div>
				</div>
				<div class="chart-body vo2-chart-body"><canvas ref="vo2Canvas"></canvas></div>
				<p class="vo2-note">8-activity rolling average from running. Estimated via ACSM oxygen cost + Swain %HRmax→%VO₂max formula. Requires a heart rate monitor.</p>
			</section>
		</template>

		<!-- Activity -->
		<section class="panel chart-card heatmap-card">
			<div class="chart-head">
				<h3>{{ isHeatmap ? 'Activity · last year' : 'Sessions by month' }}</h3>
				<div class="seg">
					<button :class="{ active: isHeatmap }" @click="isHeatmap = true">Heatmap</button>
					<button :class="{ active: !isHeatmap }" @click="setMonthly">Monthly</button>
				</div>
			</div>
			<div v-show="isHeatmap" class="heatmap-wrap">
				<div class="heatmap">
					<div class="hm-days"><span></span><span v-for="(d, i) in ['M','T','W','T','F','S','S']" :key="i">{{ d }}</span></div>
					<div class="hm-weeks">
						<div v-for="(week, wi) in heatmapWeeks" :key="wi" class="hm-col">
							<span class="hm-month">{{ week.monthLabel }}</span>
							<div v-for="(day, di) in week.days" :key="di" class="hm-cell"
								:style="{ backgroundColor: heatColor(day) }" :title="`${day.dateStr}: ${day.value || 0} workout(s)`"></div>
						</div>
					</div>
				</div>
				<div class="hm-legend"><span>Less</span><i v-for="n in 4" :key="n" :style="{ opacity: 0.25 + n * 0.18 }"></i><span>More</span></div>
			</div>
			<div v-show="!isHeatmap" class="chart-body monthly"><canvas ref="monthlyCanvas"></canvas></div>
		</section>

		<!-- Recent activities -->
		<div class="section-head"><h2>Recent activities</h2><span class="section-note">tap to see splits, map &amp; stats</span></div>
		<section class="panel recent-panel">
			<router-link v-for="w in recentActivities" :key="w.id" :to="`/workout/${w.id}`" class="recent-row">
				<span class="recent-dot" :style="{ background: sportColor(w) }"></span>
				<span class="recent-name">{{ w.name }}</span>
				<span class="recent-date">{{ formatActivityDate(w.date) }}</span>
				<span class="recent-stat mono">{{ activityStat(w) }}</span>
				<n-icon class="recent-chev" :component="ChevronForwardOutline" />
			</router-link>
			<div v-if="recentActivities.length === 0" class="recent-empty">No completed workouts yet.</div>
		</section>

		<!-- Personal records -->
		<div class="section-head"><h2>Personal records</h2></div>
		<section class="pr-grid">
			<div class="pr-card">
				<span class="pr-label"><n-icon :component="WalkOutline" /> Longest run</span>
				<span class="pr-value mono">{{ prLongestRun ? fmt(prLongestRun) + ' km' : '—' }}</span>
			</div>
			<div class="pr-card">
				<span class="pr-label"><n-icon :component="BicycleOutline" /> Longest ride</span>
				<span class="pr-value mono">{{ prLongestRide ? fmt(prLongestRide) + ' km' : '—' }}</span>
			</div>
			<div class="pr-card">
				<span class="pr-label"><n-icon :component="TrophyOutline" /> Biggest week</span>
				<span class="pr-value mono">{{ prBiggestWeek ? fmt(prBiggestWeek) + ' km' : '—' }}</span>
			</div>
			<div class="pr-card">
				<span class="pr-label"><n-icon :component="BarbellOutline" /> Heaviest session</span>
				<span class="pr-value mono">{{ prHeaviestGym ? fmt(prHeaviestGym / 1000) + ' t' : '—' }}</span>
			</div>
		</section>

		<!-- Running PRs from Strava -->
		<template v-if="stravaRunPRs">
			<div class="section-head">
				<h2>Running PRs</h2>
				<span class="section-note">best times from your activities</span>
			</div>
			<section class="pr-grid">
				<div v-if="stravaRunPRs.fiveK" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> 5 km</span>
					<span class="pr-value mono">{{ stravaRunPRs.fiveK }}</span>
				</div>
				<div v-if="stravaRunPRs.tenK" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> 10 km</span>
					<span class="pr-value mono">{{ stravaRunPRs.tenK }}</span>
				</div>
				<div v-if="stravaRunPRs.half" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> Half marathon</span>
					<span class="pr-value mono">{{ stravaRunPRs.half }}</span>
				</div>
				<div v-if="stravaRunPRs.full" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> Marathon</span>
					<span class="pr-value mono">{{ stravaRunPRs.full }}</span>
				</div>
			</section>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, onUnmounted, nextTick, watch } from 'vue'
import { NIcon } from 'naive-ui'
import {
	WalkOutline, BicycleOutline, BarbellOutline, BodyOutline, CheckmarkDoneOutline,
	FlameOutline, FlagOutline, TrophyOutline, AddOutline, ChevronForwardOutline,
} from '@vicons/ionicons5'
import Chart from 'chart.js/auto'
import {
	format, parseISO, startOfWeek, endOfWeek, subWeeks, addWeeks, addDays, subYears,
	isWithinInterval, differenceInCalendarDays, startOfDay, isSameMonth, addMonths,
} from 'date-fns'
import { db } from '@/db'
import { activityApi } from '@/activities'
import type { Workout, DailyWeight, RaceGoal } from '@/types'
import { getWorkoutType, getSportColor, isDistanceSport, SPORT_TYPES, SPORT_LABELS } from '@/utils/workouts'
import { PULSE_ZONES, getHRSettings, timeInZones, relativeEffort, fitnessSeries } from '@/utils/analysis'

const workouts = ref<Workout[]>([])
const dailyWeights = ref<DailyWeight[]>([])
const raceGoals = ref<RaceGoal[]>([])
const userName = ref(localStorage.getItem('userName') || '')
const goalWeight = computed(() => {
	const g = localStorage.getItem('goalWeight')
	return g ? parseFloat(g) : null
})

const fmt = (n: number) => {
	const r = Math.round(n * 10) / 10
	return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

const now = new Date()
const weekStart = startOfWeek(now, { weekStartsOn: 1 })
const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

const greeting = computed(() => {
	const h = now.getHours()
	if (h < 12) return 'Good morning'
	if (h < 18) return 'Good afternoon'
	return 'Good evening'
})
const todayLabel = computed(() => format(now, 'EEEE, d MMMM'))

const completed = computed(() => workouts.value.filter(w => w.isCompleted === 1))
const inThisWeek = (w: Workout) => isWithinInterval(parseISO(w.date), { start: weekStart, end: weekEnd })

const runWeek = computed(() => completed.value.filter(w => inThisWeek(w) && getWorkoutType(w) === 'running').reduce((s, w) => s + (w.distance || 0), 0))
const bikeWeek = computed(() => completed.value.filter(w => inThisWeek(w) && getWorkoutType(w) === 'bike').reduce((s, w) => s + (w.distance || 0), 0))
const thisWeekDistance = computed(() => runWeek.value + bikeWeek.value)

const weekPlanned = computed(() => workouts.value.filter(w => inThisWeek(w) && getWorkoutType(w) !== 'rest'))
const sessionsPlanned = computed(() => weekPlanned.value.length)
const sessionsDone = computed(() => weekPlanned.value.filter(w => w.isCompleted === 1).length)
const sessionsPct = computed(() => sessionsPlanned.value ? Math.round((sessionsDone.value / sessionsPlanned.value) * 100) : 0)

const gymThisWeek = computed(() => completed.value.filter(w => inThisWeek(w) && getWorkoutType(w) === 'gym'))
const gymSessionsThisWeek = computed(() => gymThisWeek.value.length)
const thisWeekTonnage = computed(() => gymThisWeek.value.reduce((s, w) => s + (w.totalWeightLifted || 0), 0) / 1000)

const latestWeight = computed(() => {
	if (!dailyWeights.value.length) return null
	return [...dailyWeights.value].sort((a, b) => b.date.localeCompare(a.date))[0].weight
})
const weightToGoal = computed(() => latestWeight.value && goalWeight.value ? Math.round((latestWeight.value - goalWeight.value) * 10) / 10 : 0)

const weekStreak = computed(() => {
	let streak = 0
	for (let i = 0; i < 104; i++) {
		const s = subWeeks(weekStart, i), e = subWeeks(weekEnd, i)
		const has = completed.value.some(w => isWithinInterval(parseISO(w.date), { start: s, end: e }))
		if (has) streak++
		else if (i === 0) continue
		else break
	}
	return streak
})

const weekDays = computed(() => {
	const todayStr = format(now, 'yyyy-MM-dd')
	return Array.from({ length: 7 }, (_, i) => {
		const d = addDays(weekStart, i), ds = format(d, 'yyyy-MM-dd')
		return { key: ds, name: format(d, 'EEEEE'), isToday: ds === todayStr, workouts: workouts.value.filter(w => w.date === ds) }
	})
})
const sportColor = (w: Workout) => getSportColor(getWorkoutType(w))
const chipLabel = (w: Workout) => {
	const t = getWorkoutType(w)
	if (isDistanceSport(t) && w.distance) return `${fmt(w.distance)}k`
	return t === 'rest' ? 'rest' : t.slice(0, 3)
}

const recentActivities = computed(() =>
	[...completed.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6))
const formatActivityDate = (d: string) => format(parseISO(d), 'EEE d MMM')
const activityStat = (w: Workout) => {
	const t = getWorkoutType(w)
	if (isDistanceSport(t) && w.distance) return `${fmt(w.distance)} km`
	if (t === 'gym' && w.totalWeightLifted) return `${fmt(w.totalWeightLifted / 1000)} t`
	if (w.actualDuration) return `${w.actualDuration} min`
	return ''
}

const nextRace = computed(() => raceGoals.value
	.filter(g => differenceInCalendarDays(parseISO(g.date), startOfDay(now)) >= 0)
	.sort((a, b) => a.date.localeCompare(b.date))[0] || null)
const nextRaceDays = computed(() => nextRace.value ? differenceInCalendarDays(parseISO(nextRace.value.date), startOfDay(now)) : null)
const formatRaceDate = (d: string) => format(parseISO(d), 'd MMM yyyy')

// PRs
const prLongestRun = computed(() => {
	const r = completed.value.filter(w => getWorkoutType(w) === 'running' && w.distance)
	return r.length ? Math.max(...r.map(w => w.distance!)) : 0
})
const prLongestRide = computed(() => {
	const r = completed.value.filter(w => getWorkoutType(w) === 'bike' && w.distance)
	return r.length ? Math.max(...r.map(w => w.distance!)) : 0
})
const prHeaviestGym = computed(() => {
	const g = completed.value.filter(w => getWorkoutType(w) === 'gym' && w.totalWeightLifted)
	return g.length ? Math.max(...g.map(w => w.totalWeightLifted!)) : 0
})
const prBiggestWeek = computed(() => {
	const byWeek: Record<string, number> = {}
	completed.value.filter(w => isDistanceSport(getWorkoutType(w))).forEach(w => {
		const k = format(startOfWeek(parseISO(w.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
		byWeek[k] = (byWeek[k] || 0) + (w.distance || 0)
	})
	const vals = Object.values(byWeek)
	return vals.length ? Math.max(...vals) : 0
})

// ===== Predictions =====
function linReg(xs: number[], ys: number[]) {
	const n = xs.length
	if (n < 2) return null
	const mx = xs.reduce((s, x) => s + x, 0) / n
	const my = ys.reduce((s, y) => s + y, 0) / n
	const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
	const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
	if (!den) return null
	const slope = num / den
	return { slope, predict: (x: number) => slope * x + (my - slope * mx) }
}

const weightPrediction = computed(() => {
	const sorted = [...dailyWeights.value].sort((a, b) => a.date.localeCompare(b.date))
	if (sorted.length < 3) return null
	const origin = new Date(sorted[0].date).getTime() / 86400000
	const xs = sorted.map(w => new Date(w.date).getTime() / 86400000 - origin)
	const ys = sorted.map(w => w.weight)
	const reg = linReg(xs, ys)
	if (!reg) return null
	const slopePerWeek = reg.slope * 7
	const lastX = xs[xs.length - 1]
	const proj4w = Math.round(reg.predict(lastX + 28) * 10) / 10
	const proj12w = Math.round(reg.predict(lastX + 84) * 10) / 10
	const current = ys[ys.length - 1]
	const weeksToGoal = goalWeight.value !== null && slopePerWeek !== 0
		? Math.ceil((goalWeight.value - current) / slopePerWeek)
		: null
	return { slopePerWeek, proj4w, proj12w, weeksToGoal }
})

const runningPrediction = computed(() => {
	const weeklyData = Array.from({ length: 12 }, (_, i) => {
		const s = subWeeks(weekStart, 11 - i)
		const e = endOfWeek(s, { weekStartsOn: 1 })
		return completed.value.filter(w => isWithinInterval(parseISO(w.date), { start: s, end: e }) && getWorkoutType(w) === 'running').reduce((sum, w) => sum + (w.distance || 0), 0)
	})
	const nonZero = weeklyData.filter(v => v > 0)
	if (nonZero.length < 3) return null
	const reg = linReg(weeklyData.map((_, i) => i), weeklyData)
	if (!reg) return null
	const proj4w = Math.max(0, Math.round(reg.predict(15) * 10) / 10)
	const currentAvg = Math.round((nonZero.reduce((s, v) => s + v, 0) / nonZero.length) * 10) / 10
	return { slopePerWeek: reg.slope, proj4w, currentAvg }
})

// ===== VO2 max =====
const vo2Estimates = computed(() => {
	const acts = stravaActivities.value
	if (!acts.length) return []

	// Profile max HR override, else the highest max_heartrate ever seen
	const maxHRever = getHRSettings(acts).maxHR
	if (maxHRever < 140) return [] // no usable HR data

	return acts
		.filter((a: any) => {
			const st = (a.sport_type || a.type || '').toLowerCase()
			return st === 'run' && a.average_heartrate && a.average_speed && (a.moving_time || 0) >= 600
		})
		.map((a: any) => {
			const vMin = a.average_speed * 60 // m/s → m/min
			// Oxygen cost at this speed (ACSM formula for running)
			const vo2AtEffort = 3.5 + vMin * 0.2
			// %HRmax → %VO2max (Swain et al. 1994)
			const hrFrac = a.average_heartrate / maxHRever
			const vo2Frac = 1.537 * hrFrac - 0.537
			if (vo2Frac < 0.25) return null // effort too light to be reliable
			const val = Math.round((vo2AtEffort / vo2Frac) * 10) / 10
			if (val < 22 || val > 82) return null // sanity range
			return {
				date: (a.start_date_local || a.start_date || '').slice(0, 10),
				vo2max: val,
				sport: 'run' as const,
			}
		})
		.filter(Boolean)
		.sort((a: any, b: any) => a.date.localeCompare(b.date)) as { date: string; vo2max: number; sport: 'run' }[]
})

const vo2HasData = computed(() => vo2Estimates.value.length >= 3)

// Rolling 28-day average for a given sport
function vo2Rolling(sport: 'run' | 'bike', dates: string[]) {
	const pts = vo2Estimates.value.filter(e => e.sport === sport)
	return dates.map(d => {
		const cutoff = new Date(d)
		cutoff.setDate(cutoff.getDate() - 28)
		const win = pts.filter(e => {
			const ed = new Date(e.date)
			return ed <= new Date(d) && ed >= cutoff
		})
		return win.length ? Math.round((win.reduce((s, e) => s + e.vo2max, 0) / win.length) * 10) / 10 : null
	})
}

const vo2CurrentRun = computed(() => {
	const pts = vo2Estimates.value.filter(e => e.sport === 'run').slice(-8)
	if (!pts.length) return null
	return Math.round((pts.reduce((s, e) => s + e.vo2max, 0) / pts.length) * 10) / 10
})

function vo2Zone(v: number | null) {
	if (!v) return { label: '', color: 'var(--text-muted)' }
	if (v >= 60) return { label: 'Superior', color: '#00c9a7' }
	if (v >= 52) return { label: 'Excellent', color: '#56d364' }
	if (v >= 43) return { label: 'Good', color: '#f0b429' }
	if (v >= 35) return { label: 'Fair', color: '#fb8c00' }
	return { label: 'Poor', color: '#e53935' }
}

// ===== Fitness & Freshness (CTL/ATL/TSB) =====
const dailyEfforts = computed<Record<string, number>>(() => {
	const { maxHR, restHR } = getHRSettings(stravaActivities.value)
	const efforts: Record<string, number> = {}
	const add = (date: string, v: number) => { efforts[date] = (efforts[date] || 0) + v }

	if (maxHR >= 120) {
		for (const a of stravaActivities.value) {
			if (!(a.streams?.heartrate || a.average_heartrate)) continue
			const re = relativeEffort(a, maxHR, restHR)
			const date = (a.start_date_local || a.start_date || '').slice(0, 10)
			if (re && date) add(date, re)
		}
	}
	// Sessions without HR (gym etc.): session-RPE load as a stand-in
	for (const w of completed.value) {
		if (getWorkoutType(w) !== 'gym') continue
		if (w.rpe && w.actualDuration) add(w.date, Math.round(w.rpe * w.actualDuration / 10))
	}
	return efforts
})

const fitnessData = computed(() => fitnessSeries(dailyEfforts.value, 90))
const fitnessHasData = computed(() => Object.keys(dailyEfforts.value).length >= 3 && fitnessData.value.length > 0)
const currentFitness = computed(() => fitnessData.value[fitnessData.value.length - 1] || null)

function buildFitness() {
	if (!fitnessCanvas.value || !fitnessHasData.value) return
	const series = fitnessData.value
	const labels = series.map(p => format(parseISO(p.date), 'd MMM'))
	charts.push(new Chart(fitnessCanvas.value, {
		type: 'line',
		data: {
			labels,
			datasets: [
				{ label: 'Fitness', data: series.map(p => p.fitness), borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,0.10)', borderWidth: 2, pointRadius: 0, tension: 0.35, fill: true },
				{ label: 'Fatigue', data: series.map(p => p.fatigue), borderColor: '#fb8c00', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, tension: 0.35 },
				{ label: 'Form', data: series.map(p => p.form), borderColor: '#56d364', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.35 },
			],
		},
		options: {
			...baseOpts(),
			interaction: { mode: 'index', intersect: false },
			plugins: {
				...baseOpts().plugins,
				legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } },
			},
			scales: {
				...(baseOpts() as any).scales,
				x: { ...(baseOpts() as any).scales.x, ticks: { color: css('--text-muted'), font: { size: 10 }, maxTicksLimit: 10, maxRotation: 0 } },
			},
		} as any,
	}))
}

// ===== Running PRs & Race Predictor =====
function fmtTime(secs: number) {
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = Math.round(secs % 60)
	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`
}

const stravaRunPRs = computed(() => {
	const runs = stravaActivities.value.filter((a: any) => {
		const st = (a.sport_type || a.type || '').toLowerCase()
		return st === 'run' && a.distance && a.moving_time
	})
	// Prefer exact best efforts from imported streams (fastest stretch inside
	// any run); fall back to whole activities near the target distance.
	const bestIn = (effortName: string, minM: number, maxM: number) => {
		let best: number | null = null
		for (const a of runs) {
			const be = a.best_efforts?.find((b: any) => b.name === effortName)
			if (be && (best === null || be.elapsed_time < best)) best = be.elapsed_time
			if (!a.best_efforts?.length && a.distance >= minM && a.distance <= maxM) {
				if (best === null || a.moving_time < best) best = a.moving_time
			}
		}
		return best !== null ? fmtTime(best) : null
	}
	const r = {
		fiveK: bestIn('5 km', 4500, 5800),
		tenK: bestIn('10 km', 9000, 11000),
		half: bestIn('Half marathon', 19000, 22000),
		full: bestIn('Marathon', 40000, 45000),
	}
	return Object.values(r).some(v => v !== null) ? r : null
})

const racePredictor = computed(() => {
	const runs = stravaActivities.value.filter((a: any) => {
		const st = (a.sport_type || a.type || '').toLowerCase()
		return st === 'run' && a.distance >= 5000 && a.moving_time
	})
	if (runs.length < 2) return null
	// Best-pace run as reference (faster = more fit → more reliable predictor)
	const ref = runs.reduce((b: any, a: any) =>
		a.moving_time / a.distance < b.moving_time / b.distance ? a : b
	)
	const riegel = (targetM: number) => ref.moving_time * Math.pow(targetM / ref.distance, 1.06)
	const dateStr = (ref.start_date_local || ref.start_date || '').slice(0, 10)
	const dateLabel = dateStr ? format(parseISO(dateStr), 'd MMM yyyy') : ''
	return {
		fiveK: fmtTime(riegel(5000)),
		tenK: fmtTime(riegel(10000)),
		half: fmtTime(riegel(21097)),
		full: fmtTime(riegel(42195)),
		basedOn: `${fmt(ref.distance / 1000)} km on ${dateLabel}`,
	}
})

// ===== Zone distribution =====
const maxHRDisplay = computed(() => getHRSettings(stravaActivities.value).maxHR)
const restingHR = computed(() => parseInt(localStorage.getItem('restingHR') || '60', 10))

const zonesHasData = computed(() => {
	if (maxHRDisplay.value < 140) return false
	return stravaActivities.value.filter((a: any) => {
		const st = (a.sport_type || a.type || '').toLowerCase()
		return st === 'run' && (a.streams?.heartrate || a.average_heartrate)
	}).length >= 3
})

// ===== Charts =====
const isHeatmap = ref(true)
const heatmapWeeks = ref<any[]>([])
const distanceCanvas = ref<HTMLCanvasElement | null>(null)
const tonnageCanvas = ref<HTMLCanvasElement | null>(null)
const weightCanvas = ref<HTMLCanvasElement | null>(null)
const mixCanvas = ref<HTMLCanvasElement | null>(null)
const monthlyCanvas = ref<HTMLCanvasElement | null>(null)
const vo2Canvas = ref<HTMLCanvasElement | null>(null)
const fitnessCanvas = ref<HTMLCanvasElement | null>(null)
const zoneCanvas = ref<HTMLCanvasElement | null>(null)
const zoneDonutCanvas = ref<HTMLCanvasElement | null>(null)
let charts: Chart[] = []

const stravaActivities = ref<any[]>([])

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

const baseOpts = (yLabel?: string) => ({
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: { display: false },
		tooltip: { backgroundColor: css('--surface-2'), borderColor: css('--border-strong'), borderWidth: 1, titleColor: css('--text-color'), bodyColor: css('--text-secondary'), padding: 10, cornerRadius: 8, displayColors: false },
	},
	scales: {
		x: { ticks: { color: css('--text-muted'), font: { size: 10 } }, grid: { display: false }, border: { display: false } },
		y: { ticks: { color: css('--text-muted'), font: { size: 10 } }, grid: { color: css('--border-color') }, border: { display: false }, title: yLabel ? { display: true, text: yLabel, color: css('--text-muted'), font: { size: 11 } } : undefined },
	},
})

function weekBuckets(count: number) {
	const ws = startOfWeek(new Date(), { weekStartsOn: 1 })
	const out: { start: Date; end: Date; label: string }[] = []
	for (let i = count - 1; i >= 0; i--) {
		const s = subWeeks(ws, i)
		out.push({ start: s, end: endOfWeek(s, { weekStartsOn: 1 }), label: format(s, 'd/M') })
	}
	return out
}

function buildDistance() {
	if (!distanceCanvas.value) return
	const weeks = weekBuckets(12)
	const sum = (type: 'running' | 'bike', wk: { start: Date; end: Date }) =>
		completed.value.filter(w => isWithinInterval(parseISO(w.date), { start: wk.start, end: wk.end }) && getWorkoutType(w) === type).reduce((s, w) => s + (w.distance || 0), 0)
	charts.push(new Chart(distanceCanvas.value, {
		type: 'bar',
		data: { labels: weeks.map(w => w.label), datasets: [
			{ label: 'Running', data: weeks.map(w => sum('running', w)), backgroundColor: getSportColor('running'), borderRadius: 4, maxBarThickness: 16 },
			{ label: 'Bike', data: weeks.map(w => sum('bike', w)), backgroundColor: getSportColor('bike'), borderRadius: 4, maxBarThickness: 16 },
		] },
		options: { ...baseOpts('km'), plugins: { ...baseOpts('km').plugins, legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } } } } as any,
	}))
}

function buildTonnage() {
	if (!tonnageCanvas.value) return
	const weeks = weekBuckets(12)
	const data = weeks.map(wk => completed.value.filter(w => isWithinInterval(parseISO(w.date), { start: wk.start, end: wk.end }) && getWorkoutType(w) === 'gym').reduce((s, w) => s + (w.totalWeightLifted || 0), 0) / 1000)
	charts.push(new Chart(tonnageCanvas.value, {
		type: 'bar',
		data: { labels: weeks.map(w => w.label), datasets: [{ data, backgroundColor: getSportColor('gym'), borderRadius: 5, maxBarThickness: 26 }] },
		options: baseOpts('t'),
	}))
}

function buildWeight() {
	if (!weightCanvas.value) return
	const sorted = [...dailyWeights.value].sort((a, b) => a.date.localeCompare(b.date))
	const goal = localStorage.getItem('goalWeight')
	const goalVal = goal ? parseFloat(goal) : null

	// Build 12-week projection from linear regression
	let projLabels: string[] = []
	let projValues: (number | null)[] = []
	if (sorted.length >= 3) {
		const origin = new Date(sorted[0].date).getTime() / 86400000
		const xs = sorted.map(w => new Date(w.date).getTime() / 86400000 - origin)
		const reg = linReg(xs, sorted.map(w => w.weight))
		if (reg) {
			const lastDate = parseISO(sorted[sorted.length - 1].date)
			const lastX = xs[xs.length - 1]
			for (let i = 1; i <= 6; i++) {
				projLabels.push(format(addDays(lastDate, i * 14), 'd/M'))
				projValues.push(Math.round(reg.predict(lastX + i * 14) * 10) / 10)
			}
		}
	}

	const allLabels = [...sorted.map(w => format(parseISO(w.date), 'd/M')), ...projLabels]
	const actualData: (number | null)[] = [...sorted.map(w => w.weight), ...projLabels.map(() => null)]
	const projData: (number | null)[] = [
		...sorted.map((_, i) => i === sorted.length - 1 ? sorted[i].weight : null),
		...projValues,
	]

	const datasets: any[] = [
		{ label: 'Weight', data: actualData, borderColor: css('--primary-color'), backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0, pointHoverRadius: 4 },
		...(projValues.length ? [{ label: 'Projected', data: projData, borderColor: css('--primary-color'), backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [5, 4], tension: 0.3, pointRadius: 0, pointHoverRadius: 4 }] : []),
		...(goalVal !== null ? [{ label: 'Goal', data: allLabels.map(() => goalVal), borderColor: css('--success-color'), borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0 }] : []),
	]
	charts.push(new Chart(weightCanvas.value, { type: 'line', data: { labels: allLabels, datasets }, options: baseOpts('kg') }))
}

function buildMix() {
	if (!mixCanvas.value) return
	const data = SPORT_TYPES.map(t => completed.value.filter(w => getWorkoutType(w) === t).length)
	charts.push(new Chart(mixCanvas.value, {
		type: 'doughnut',
		data: { labels: SPORT_TYPES.map(t => SPORT_LABELS[t]), datasets: [{ data, backgroundColor: SPORT_TYPES.map(t => getSportColor(t)), borderColor: css('--surface-color'), borderWidth: 2 }] },
		options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { color: css('--text-secondary'), boxWidth: 10, boxHeight: 10, font: { size: 11 }, usePointStyle: true } }, tooltip: { backgroundColor: css('--surface-2'), borderColor: css('--border-strong'), borderWidth: 1, titleColor: css('--text-color'), bodyColor: css('--text-secondary'), padding: 10, cornerRadius: 8 } } } as any,
	}))
}

function buildMonthly() {
	if (!monthlyCanvas.value) return
	const months: Date[] = []
	for (let i = 5; i >= 0; i--) months.push(addMonths(new Date(), -i))
	charts.push(new Chart(monthlyCanvas.value, {
		type: 'bar',
		data: { labels: months.map(m => format(m, 'MMM')), datasets: SPORT_TYPES.map(t => ({ label: SPORT_LABELS[t], data: months.map(m => completed.value.filter(w => getWorkoutType(w) === t && isSameMonth(parseISO(w.date), m)).length), backgroundColor: getSportColor(t), borderRadius: 4 })) },
		options: { ...baseOpts(), plugins: { legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: css('--text-muted') }, border: { display: false } }, y: { stacked: true, grid: { color: css('--border-color') }, ticks: { color: css('--text-muted') }, border: { display: false } } } } as any,
	}))
}

function buildHeatmap() {
	const today = new Date()
	const start = startOfWeek(subYears(today, 1), { weekStartsOn: 1 })
	const end = endOfWeek(today, { weekStartsOn: 1 })
	const dayData: Record<string, number> = {}
	completed.value.forEach(w => { const d = format(parseISO(w.date), 'yyyy-MM-dd'); dayData[d] = (dayData[d] || 0) + 1 })
	const weeks = []
	let cur = start
	while (cur <= end) {
		const days = []
		for (let i = 0; i < 7; i++) {
			const d = addDays(cur, i), ds = format(d, 'yyyy-MM-dd')
			days.push({ dateStr: format(d, 'MMM d, yyyy'), value: dayData[ds] || 0 })
		}
		weeks.push({ monthLabel: cur.getDate() <= 7 ? format(cur, 'MMM') : '', days })
		cur = addWeeks(cur, 1)
	}
	heatmapWeeks.value = weeks
}

function buildVO2() {
	if (!vo2Canvas.value || !vo2HasData.value) return
	const allDates = [...new Set(vo2Estimates.value.map(e => e.date))].sort()
	const labels = allDates.map(d => format(parseISO(d), 'd MMM yy'))
	const runColor = getSportColor('running')

	charts.push(new Chart(vo2Canvas.value, {
		type: 'line',
		data: {
			labels,
			datasets: [
				{
					label: 'VO₂max estimate',
					data: allDates.map(d => {
						const m = vo2Estimates.value.find(e => e.date === d)
						return m ? m.vo2max : null
					}),
					borderColor: runColor,
					borderWidth: 0,
					pointRadius: 5,
					pointHoverRadius: 7,
					pointBackgroundColor: runColor,
					spanGaps: false,
					tension: 0,
					showLine: false,
				},
				{
					label: '28-day rolling avg',
					data: vo2Rolling('run', allDates),
					borderColor: runColor,
					backgroundColor: 'transparent',
					borderWidth: 2,
					pointRadius: 0,
					tension: 0.4,
					spanGaps: true,
				},
			],
		},
		options: {
			...baseOpts('ml/kg/min'),
			plugins: {
				...baseOpts('ml/kg/min').plugins,
				legend: {
					display: true, position: 'bottom',
					labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true },
				},
			},
			scales: {
				...(baseOpts('ml/kg/min') as any).scales,
				y: {
					...(baseOpts('ml/kg/min') as any).scales.y,
					min: 25,
					ticks: { color: css('--text-muted'), font: { size: 10 }, stepSize: 5 },
				},
				x: {
					...(baseOpts('ml/kg/min') as any).scales.x,
					ticks: {
						color: css('--text-muted'), font: { size: 10 },
						maxTicksLimit: 10, maxRotation: 0,
					},
				},
			},
		} as any,
	}))
}

/** HR-carrying runs with per-activity zone seconds (stream-accurate when imported). */
function runZoneData() {
	const { maxHR, restHR } = getHRSettings(stravaActivities.value)
	return stravaActivities.value
		.filter((a: any) => {
			const st = (a.sport_type || a.type || '').toLowerCase()
			return st === 'run' && a.moving_time && (a.streams?.heartrate || a.average_heartrate)
		})
		.map((a: any) => ({
			date: new Date(a.start_date_local || a.start_date),
			zones: timeInZones(a, maxHR, restHR),
		}))
		.filter(r => r.zones)
}

function buildZones() {
	if (!zoneCanvas.value || !zonesHasData.value) return
	const runs = runZoneData()
	const weeks = weekBuckets(12)
	// zone seconds per week
	const weekZones = weeks.map(wk => {
		const sums = new Array(PULSE_ZONES.length).fill(0)
		for (const r of runs) {
			if (r.date >= wk.start && r.date <= wk.end) {
				r.zones!.forEach((t, i) => { sums[i] += t })
			}
		}
		return sums
	})
	const weekTotals = weekZones.map(z => z.reduce((s, t) => s + t, 0))
	const datasets = PULSE_ZONES.map((z, zi) => ({
		label: z.name,
		backgroundColor: z.color,
		data: weeks.map((_, wi) => {
			const total = weekTotals[wi]
			return total ? Math.round((weekZones[wi][zi] / total) * 100) : 0
		}),
		borderRadius: 3,
		maxBarThickness: 22,
	}))
	charts.push(new Chart(zoneCanvas.value, {
		type: 'bar',
		data: { labels: weeks.map(w => w.label), datasets },
		options: {
			...baseOpts('%'),
			plugins: {
				...baseOpts('%').plugins,
				legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } },
				tooltip: {
					...baseOpts('%').plugins.tooltip,
					callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%` },
				},
			},
			scales: {
				x: { stacked: true, grid: { display: false }, ticks: { color: css('--text-muted'), font: { size: 10 } }, border: { display: false } },
				y: {
					stacked: true, max: 100,
					grid: { color: css('--border-color') },
					ticks: { color: css('--text-muted'), font: { size: 10 }, callback: (v: any) => v + '%' },
					border: { display: false },
				},
			},
		} as any,
	}))
}

function buildZoneDonut() {
	if (!zoneDonutCanvas.value || !zonesHasData.value) return
	const { maxHR, restHR } = getHRSettings(stravaActivities.value)
	const cutoff = subWeeks(new Date(), 4)
	const recent = runZoneData().filter(r => r.date >= cutoff)
	const sums = new Array(PULSE_ZONES.length).fill(0)
	for (const r of recent) r.zones!.forEach((t, i) => { sums[i] += t })
	const totalTime = sums.reduce((s, t) => s + t, 0)
	if (!totalTime) return

	const data = sums.map(t => Math.round((t / totalTime) * 100))

	const hrr = maxHR - restHR
	const labels = PULSE_ZONES.map(z => {
		const lo = restHR + hrr * z.min
		const hi = restHR + hrr * z.max
		return `${z.name} (${Math.round(lo)}–${z.max > 1 ? maxHR : Math.round(hi)})`
	})

	charts.push(new Chart(zoneDonutCanvas.value, {
		type: 'doughnut',
		data: {
			labels,
			datasets: [{ data, backgroundColor: PULSE_ZONES.map(z => z.color), borderWidth: 0, hoverOffset: 6 }],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: '60%',
			plugins: {
				legend: {
					display: true,
					position: 'right',
					labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 9 }, usePointStyle: true, padding: 7 },
				},
				tooltip: {
					backgroundColor: css('--surface-2'), borderColor: css('--border-strong'), borderWidth: 1,
					titleColor: css('--text-color'), bodyColor: css('--text-secondary'), padding: 10, cornerRadius: 8, displayColors: false,
					callbacks: { label: (ctx: any) => ` ${ctx.raw}% of run time` },
				},
			},
		} as any,
	}))
}

function heatColor(day: any) {
	if (!day.value) return css('--surface-2')
	const intensity = Math.min(day.value / 3, 1)
	return `color-mix(in srgb, ${getSportColor('running')} ${Math.round((0.3 + intensity * 0.7) * 100)}%, transparent)`
}

function destroyCharts() { charts.forEach(c => c.destroy()); charts = [] }
function setMonthly() { isHeatmap.value = false; nextTick(buildMonthly) }

async function buildAll() {
	destroyCharts()
	await nextTick()
	buildDistance(); buildTonnage(); buildWeight(); buildMix(); buildHeatmap(); buildVO2(); buildZones(); buildZoneDonut(); buildFitness()
	if (!isHeatmap.value) buildMonthly()
}

async function load() {
	const [w, dw, rg] = await Promise.all([db.getWorkouts(), db.getDailyWeights(), db.getRaceGoals()])
	workouts.value = w
	dailyWeights.value = dw
	raceGoals.value = rg
	userName.value = localStorage.getItem('userName') || ''
	// Imported FIT/GPX activities merged with Strava (when still connected)
	try {
		stravaActivities.value = await activityApi.getAllActivities()
	} catch {
		// No activity data — HR-based sections stay hidden
	}
	await buildAll()
}

watch(isHeatmap, v => { if (!v) nextTick(buildMonthly) })

onMounted(load)
onActivated(load)
onUnmounted(destroyCharts)
</script>

<style scoped>
.home-view { padding: 24px 28px 48px; max-width: 1120px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .home-view { padding: 16px 16px 36px; } }

.home-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.greeting { font-size: 1.6rem; font-weight: 400; font-family: var(--font-serif); }
.subgreeting { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; }
.header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.streak-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--warning-soft); color: var(--warning-color); padding: 7px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.primary-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--primary-color); color: #fff; padding: 9px 16px; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; transition: background 0.15s; }
.primary-btn:hover { background: var(--primary-strong); }

.section-head { display: flex; align-items: baseline; gap: 12px; margin: 32px 2px 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); }
.section-head h2 { font-size: 1.05rem; font-weight: 400; font-family: var(--font-serif); letter-spacing: 0; }
.section-note { color: var(--text-muted); font-size: 0.75rem; margin-left: auto; }

/* Metric cards */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
@media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .metric-grid { grid-template-columns: 1fr; } }
.metric-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 16px 18px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.3); }
.metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.metric-label { color: var(--text-secondary); font-size: 0.82rem; }
.metric-ico { color: var(--text-muted); font-size: 1.2rem; }
.metric-ico.run { color: var(--color-running-primary); }
.metric-ico.gym { color: var(--color-gym-primary); }
.metric-value { font-size: 1.7rem; font-weight: 700; line-height: 1; }
.metric-value .unit { font-size: 0.9rem; font-weight: 500; color: var(--text-secondary); }
.metric-sub { margin-top: 8px; font-size: 0.78rem; }
.metric-sub.up { color: var(--success-color); }
.metric-sub.muted, .muted { color: var(--text-muted); }
.metric-split { margin-top: 10px; display: flex; gap: 14px; font-size: 0.76rem; color: var(--text-secondary); }
.metric-split i.sw { width: 8px; height: 8px; border-radius: 2px; display: inline-block; margin-right: 5px; }
.metric-split i.sw.run { background: var(--color-running-primary); }
.metric-split i.sw.bike { background: var(--color-bike-primary); }
.progress-track { margin-top: 12px; height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.progress-fill { height: 100%; background: var(--primary-color); border-radius: 999px; transition: width 0.3s ease; }

/* Row two */
.row-two { display: grid; grid-template-columns: 1.7fr 1fr; gap: 14px; }
@media (max-width: 768px) { .row-two { grid-template-columns: 1fr; } }
.panel { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 4px rgba(0,0,0,0.25); }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-head h2 { font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 7px; }
.text-link { color: var(--primary-color); font-size: 0.82rem; font-weight: 500; }

.week-strip { display: flex; gap: 8px; }
.day-col { flex: 1; text-align: center; text-decoration: none; }
.day-name { display: block; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; }
.day-col.today .day-name { color: var(--primary-color); font-weight: 700; }
.day-box { min-height: 64px; border-radius: var(--radius-sm); background: var(--surface-2); border: 1px solid transparent; padding: 6px 4px; display: flex; flex-direction: column; gap: 4px; transition: border-color 0.15s; }
.day-col.today .day-box { border-color: var(--primary-color); }
.day-col:hover .day-box { border-color: var(--border-strong); }
.day-chip { font-size: 0.66rem; font-weight: 600; padding: 3px 4px; border-radius: 4px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.day-chip.done { background: var(--c); color: #0b0e14; }
.day-empty { color: var(--text-muted); margin: auto; }

.race-panel.urgent {
	border-color: rgba(239, 68, 68, 0.35);
	box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.08), inset 0 1px 0 rgba(255,255,255,0.04);
}
.race-name { font-size: 1.1rem; font-weight: 400; font-family: var(--font-serif); margin: 0; }
.race-date { color: var(--text-secondary); font-size: 0.85rem; margin: 4px 0 16px; }
.race-counts { display: flex; gap: 10px; }
.race-count { flex: 1; text-align: center; background: var(--surface-2); border-radius: var(--radius-sm); padding: 12px 0; }
.rc-num { display: block; font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }
.race-panel.urgent .rc-num { color: var(--danger-color); }
.rc-lbl { font-size: 0.72rem; color: var(--text-muted); }
.race-empty { color: var(--text-secondary); font-size: 0.88rem; }
.race-empty p { margin: 0 0 8px; }

/* Recent activities */
.recent-panel { padding: 6px 8px; }
.recent-row { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: var(--radius-sm); text-decoration: none; color: var(--text-color); transition: background 0.15s; }
.recent-row:hover { background: var(--surface-2); }
.recent-row + .recent-row { border-top: 1px solid var(--border-color); }
.recent-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.recent-name { font-weight: 500; font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-date { color: var(--text-muted); font-size: 0.78rem; margin-left: auto; white-space: nowrap; }
.recent-stat { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); min-width: 64px; text-align: right; }
.recent-chev { color: var(--text-muted); font-size: 1.1rem; flex-shrink: 0; }
.recent-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

/* Charts */
.chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 768px) { .chart-grid { grid-template-columns: 1fr; } }
.chart-card { padding: 16px 18px; }
.chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
.chart-head h3 { font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.note { color: var(--text-muted); font-size: 0.75rem; }
.chart-body { height: 200px; position: relative; }
.chart-body.monthly { height: 300px; }
.heatmap-card { margin-top: 14px; }
.zone-section { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
@media (max-width: 768px) { .zone-section { grid-template-columns: 1fr; } }

.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot.gym { background: var(--color-gym-primary); }
.dot.weight { background: var(--primary-color); }

.seg { display: flex; gap: 4px; background: var(--surface-2); padding: 3px; border-radius: var(--radius-sm); }
.seg button { background: transparent; border: none; color: var(--text-secondary); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 500; font-family: var(--font-family); }
.seg button.active { background: var(--primary-color); color: #fff; }

.heatmap-wrap { display: flex; flex-direction: column; gap: 12px; }
.heatmap { display: flex; gap: 3px; overflow-x: auto; padding-bottom: 4px; }
.hm-days { display: flex; flex-direction: column; gap: 3px; padding-top: 18px; }
.hm-days span { height: 11px; font-size: 8px; line-height: 11px; color: var(--text-muted); text-align: right; padding-right: 5px; }
.hm-weeks { display: flex; gap: 3px; }
.hm-col { display: flex; flex-direction: column; gap: 3px; }
.hm-month { height: 14px; font-size: 9px; color: var(--text-secondary); }
.hm-cell { width: 11px; height: 11px; border-radius: 2px; transition: transform 0.1s; }
.hm-cell:hover { transform: scale(1.4); outline: 1px solid var(--text-color); }
.hm-legend { display: flex; align-items: center; gap: 5px; font-size: 0.7rem; color: var(--text-muted); justify-content: flex-end; }
.hm-legend i { width: 11px; height: 11px; border-radius: 2px; background: var(--color-running-primary); display: inline-block; }

/* PRs */
.pr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 900px) { .pr-grid { grid-template-columns: repeat(2, 1fr); } }
.pr-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.25); }
.pr-label { color: var(--text-secondary); font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
.pr-value { font-size: 1.3rem; font-weight: 700; }

/* Projections */
.pred-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 600px) { .pred-grid { grid-template-columns: 1fr; } }
.pred-card { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; }
.pred-icon { font-size: 1.4rem; color: var(--text-muted); padding-top: 2px; flex-shrink: 0; }
.pred-icon.run { color: var(--color-running-primary); }
.pred-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pred-label { color: var(--text-secondary); font-size: 0.8rem; }
.pred-main { display: flex; align-items: baseline; gap: 8px; }
.pred-main .mono { font-size: 1.5rem; font-weight: 700; line-height: 1; }
.pred-main .unit { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }
.pred-timeframe { font-size: 0.78rem; color: var(--text-muted); }
.pred-trend { font-size: 0.78rem; color: var(--text-muted); }
.pred-trend.pos { color: var(--success-color); }
.pred-trend.neg { color: var(--danger-color); }

/* VO2 max */
.vo2-card { }
.vo2-badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
.vo2-badge {
	display: inline-flex; align-items: center; gap: 6px;
	background: var(--surface-2); border: 1px solid var(--border-color);
	border-radius: var(--radius-sm); padding: 5px 10px; font-size: 0.8rem;
}
.vo2-badge-label { color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
.vo2-badge .mono { font-size: 1.05rem; font-weight: 700; }
.vo2-badge-unit { color: var(--text-muted); font-size: 0.72rem; }
.vo2-zone-chip { font-size: 0.72rem; font-weight: 600; margin-left: 2px; }
.vo2-chart-body { height: 220px; position: relative; margin-top: 14px; }
.vo2-note { margin: 12px 0 0; font-size: 0.72rem; color: var(--text-muted); line-height: 1.5; }

/* Fitness & freshness */
.fitness-chart-body { height: 240px; position: relative; margin-top: 14px; }
.fitness-badges { display: flex; gap: 12px; flex-wrap: wrap; }
.fit-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--text-secondary); }
.fit-badge i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.fit-badge .mono { font-weight: 700; color: var(--text-color); }
</style>
