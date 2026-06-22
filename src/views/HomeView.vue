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
import type { Workout, DailyWeight, RaceGoal } from '@/types'
import { getWorkoutType, getSportColor, isDistanceSport, SPORT_TYPES, SPORT_LABELS } from '@/utils/workouts'

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

// ===== Charts =====
const isHeatmap = ref(true)
const heatmapWeeks = ref<any[]>([])
const distanceCanvas = ref<HTMLCanvasElement | null>(null)
const tonnageCanvas = ref<HTMLCanvasElement | null>(null)
const weightCanvas = ref<HTMLCanvasElement | null>(null)
const mixCanvas = ref<HTMLCanvasElement | null>(null)
const monthlyCanvas = ref<HTMLCanvasElement | null>(null)
let charts: Chart[] = []

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
	const datasets: any[] = [{ label: 'Weight', data: sorted.map(w => w.weight), borderColor: css('--primary-color'), backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0, pointHoverRadius: 4 }]
	if (goalVal !== null) datasets.push({ label: 'Goal', data: sorted.map(() => goalVal), borderColor: css('--success-color'), borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0 })
	charts.push(new Chart(weightCanvas.value, { type: 'line', data: { labels: sorted.map(w => format(parseISO(w.date), 'd/M')), datasets }, options: baseOpts('kg') }))
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
	buildDistance(); buildTonnage(); buildWeight(); buildMix(); buildHeatmap()
	if (!isHeatmap.value) buildMonthly()
}

async function load() {
	const [w, dw, rg] = await Promise.all([db.getWorkouts(), db.getDailyWeights(), db.getRaceGoals()])
	workouts.value = w
	dailyWeights.value = dw
	raceGoals.value = rg
	userName.value = localStorage.getItem('userName') || ''
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
.greeting { font-size: 1.6rem; font-weight: 700; }
.subgreeting { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; }
.header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.streak-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--warning-soft); color: var(--warning-color); padding: 7px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.primary-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--primary-color); color: #fff; padding: 9px 16px; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; transition: background 0.15s; }
.primary-btn:hover { background: var(--primary-strong); }

.section-head { display: flex; align-items: baseline; gap: 12px; margin: 28px 2px 14px; }
.section-head h2 { font-size: 1.1rem; font-weight: 600; }
.section-note { color: var(--text-muted); font-size: 0.8rem; }

/* Metric cards */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
@media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .metric-grid { grid-template-columns: 1fr; } }
.metric-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 16px 18px; }
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
.panel { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 18px 20px; }
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

.race-panel.urgent { border-color: var(--danger-color); }
.race-name { font-size: 1.1rem; font-weight: 700; margin: 0; }
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
.pr-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.pr-label { color: var(--text-secondary); font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
.pr-value { font-size: 1.3rem; font-weight: 700; }
</style>
