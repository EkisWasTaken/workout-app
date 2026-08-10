<script setup lang="ts">
/**
 * Home: today's training, then progress broken out by sport.
 *
 * This page used to be one 2,000-line component holding every chart in the app
 * behind three tabs (Today / Goals / Trends), where "Goals" rendered nothing at
 * all until you had a VDOT and "Trends" mixed running, lifting and body weight
 * into one wall. The statistics now live in per-sport components under
 * `views/home/`, fed by the `stats` store, and only the sports you actually do
 * get a tab.
 */
import {
	computed, defineAsyncComponent, nextTick, onActivated, onMounted, onUnmounted, ref, watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, useMessage } from 'naive-ui'
import Chart from 'chart.js/auto'
import {
	AddOutline, ChevronForwardOutline, CloudUploadOutline,
	FlagOutline, FlameOutline, TrophyOutline, WalkOutline, WarningOutline,
} from '@vicons/ionicons5'
import {
	addDays, differenceInCalendarDays, format, isWithinInterval, parseISO,
	startOfDay, startOfWeek, endOfWeek, subWeeks, subYears,
} from 'date-fns'
// Only one sport tab is ever on screen, and each drags in its own charts — so
// they load on demand rather than bloating the initial bundle.
const RunningTab = defineAsyncComponent(() => import('./home/RunningTab.vue'))
const GymTab = defineAsyncComponent(() => import('./home/GymTab.vue'))
const BikeTab = defineAsyncComponent(() => import('./home/BikeTab.vue'))
const BodyTab = defineAsyncComponent(() => import('./home/BodyTab.vue'))
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import { db } from '@/db'
import { auth } from '@/auth'
import { refreshFitness, currentVdot } from '@/fitness'
import { hydrateSettings, settings, targetForDate, distanceGoals } from '@/settings'
import { getSportColor, isDistanceSport, noteSteps, SPORT_LABELS, SPORT_TYPES } from '@/utils/workouts'
import { importFitFile, fitUpdates } from '@/utils/fitLink'
import { sessionPace } from '@/utils/paceAdvice'
import { fmtTime } from '@/utils/vdot'
import { baseOpts, css, legend, useCharts } from '@/utils/chartTheme'
import {
	activities, completed, dailyWeights, kmOf, loadStats, loaded, raceGoals,
	ramp, recentActivities, sportOf, sportTabs, syncClock, today, workouts,
} from '@/stats'
import type { Workout } from '@/types'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const { add, destroy } = useCharts()

const fmt = (n: number) => {
	const r = Math.round(n * 10) / 10
	return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

// ─── tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'today' | 'running' | 'gym' | 'bike' | 'body'

const tabs = computed(() => [
	{ key: 'today' as TabKey, label: 'Today' },
	...sportTabs.value.map(s => ({ key: s.key as TabKey, label: s.label })),
	{ key: 'body' as TabKey, label: 'Body' },
])

/**
 * The active tab lives in the URL, so a reload keeps your place and you can
 * send someone a link straight to the page you're looking at.
 */
const tab = computed<TabKey>(() => {
	const q = String(route.query.tab || '')
	return tabs.value.some(t => t.key === q) ? (q as TabKey) : 'today'
})

function setTab(key: TabKey) {
	router.replace({ query: { ...route.query, tab: key === 'today' ? undefined : key } })
}

// ─── header ───────────────────────────────────────────────────────────────────

const userName = computed(() => settings.userName)

const greeting = computed(() => {
	const h = today.value.getHours()
	if (h < 12) return 'Good morning'
	if (h < 18) return 'Good afternoon'
	return 'Good evening'
})
const todayLabel = computed(() => format(today.value, 'EEEE, d MMMM'))
const todayStr = computed(() => format(today.value, 'yyyy-MM-dd'))

const weekStart = computed(() => startOfWeek(today.value, { weekStartsOn: 1 }))
const weekEnd = computed(() => endOfWeek(today.value, { weekStartsOn: 1 }))

const weekStreak = computed(() => {
	let streak = 0
	for (let i = 0; i < 104; i++) {
		const s = subWeeks(weekStart.value, i)
		const e = subWeeks(weekEnd.value, i)
		const has = completed.value.some(w => isWithinInterval(parseISO(w.date), { start: s, end: e }))
		if (has) streak++
		else if (i === 0) continue
		else break
	}
	return streak
})

// ─── onboarding ───────────────────────────────────────────────────────────────

/** Dismissal is per account, so one user hiding it doesn't hide it for another. */
const dismissKey = computed(() => `onboardingDismissed:${auth.user?.id ?? 'anon'}`)
const dismissed = ref(false)

function dismissOnboarding() {
	dismissed.value = true
	localStorage.setItem(dismissKey.value, '1')
}

const steps = computed(() => [
	{ key: 'name', label: 'Tell us your name', done: !!settings.userName, to: '/profile' },
	{ key: 'plan', label: 'Plan your first session', done: workouts.value.length > 0, to: '/schedule' },
	{ key: 'done', label: 'Complete a session', done: completed.value.length > 0, to: '/schedule' },
	{ key: 'weight', label: 'Log your weight', done: dailyWeights.value.length > 0, to: '/schedule' },
	{
		key: 'goal',
		label: 'Set a goal',
		done: raceGoals.value.length > 0 || Object.keys(distanceGoals).length > 0,
		to: '/profile',
	},
])

const stepsDone = computed(() => steps.value.filter(s => s.done).length)

/**
 * Shown until the checklist is finished or explicitly dismissed. It also
 * disappears once someone has five sessions logged — by then they clearly know
 * their way around and the card is just clutter.
 */
const showOnboarding = computed(() =>
	loaded.value && !dismissed.value && stepsDone.value < steps.value.length && completed.value.length < 5)

// ─── today ────────────────────────────────────────────────────────────────────

const todaysWorkouts = computed(() => workouts.value.filter(w => w.date === todayStr.value))

/** "Nothing planned" and "you planned a rest day" are different states. */
const todayState = computed<'empty' | 'rest' | 'sessions'>(() => {
	if (!todaysWorkouts.value.length) return 'empty'
	if (todaysWorkouts.value.every(w => sportOf(w) === 'rest')) return 'rest'
	return 'sessions'
})
const todayAllDone = computed(() =>
	todaysWorkouts.value.length > 0 && todaysWorkouts.value.every(w => w.isCompleted === 1))

const busyId = ref<number | null>(null)
const busyKind = ref<'complete' | 'file' | null>(null)
const fitInput = ref<HTMLInputElement | null>(null)
const pendingFitWorkout = ref<Workout | null>(null)

async function reload() {
	await loadStats()
	await refreshFitness()
}

async function completeToday(w: Workout) {
	if (w.isCompleted === 1 || busyId.value !== null) return
	busyId.value = w.id
	busyKind.value = 'complete'
	try {
		await db.completeWorkout({ id: w.id, isCompleted: 1 })
		await reload()
	} catch (e) {
		console.error('Failed to complete workout', e)
		message.error("Couldn't save that. Check your connection and try again.")
	} finally {
		busyId.value = null
		busyKind.value = null
	}
}

const canAttach = (w: Workout) => isDistanceSport(sportOf(w))

function pickFit(w: Workout) {
	if (busyId.value !== null) return
	pendingFitWorkout.value = w
	fitInput.value?.click()
}

async function onFitPicked(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0]
	if (fitInput.value) fitInput.value.value = ''
	const w = pendingFitWorkout.value
	pendingFitWorkout.value = null
	if (!file || !w) return

	busyId.value = w.id
	busyKind.value = 'file'
	const wasDone = w.isCompleted === 1
	try {
		const imported = await importFitFile(file)
		await db.completeWorkout({ id: w.id, isCompleted: 1, ...fitUpdates(imported) })
		await reload()
		if (imported.duplicate && !imported.activityId) {
			message.warning('That file was already imported but could not be matched automatically.')
		} else if (wasDone) {
			message.success('Recording updated.')
		} else {
			message.success(imported.duplicate
				? 'Completed — linked the existing recording.'
				: 'Completed and linked to your recording.')
		}
	} catch (err: any) {
		const msg = String(err?.message || err)
		// Storage not provisioned is our problem, not something a user can fix.
		message.error(msg.startsWith('MISSING_TABLE')
			? "Activity storage isn't set up on this account yet — let the app owner know."
			: "That file couldn't be read. Make sure it's a .fit, .gpx or .tcx export.")
	} finally {
		busyId.value = null
		busyKind.value = null
	}
}

const todayPace = (w: Workout) => sessionPace(w, {
	currentVdot: currentVdot.value,
	goalFor: (date: string) => {
		const t = targetForDate(date)
		return t ? { vdot: t.neededVdot, distanceM: t.distanceM, name: t.name, terrain: t.terrainFactor } : null
	},
})

const sportColor = (w: Workout) => getSportColor(sportOf(w))
const sessionSteps = (w: Workout) => noteSteps(w)

// ─── this week ────────────────────────────────────────────────────────────────

const weekDays = computed(() =>
	Array.from({ length: 7 }, (_, i) => {
		const d = addDays(weekStart.value, i)
		const ds = format(d, 'yyyy-MM-dd')
		return {
			key: ds,
			name: format(d, 'EEEEE'),
			isToday: ds === todayStr.value,
			workouts: workouts.value.filter(w => w.date === ds),
		}
	}))

const chipLabel = (w: Workout) => {
	const t = sportOf(w)
	const km = kmOf(w)
	if (isDistanceSport(t) && km) return `${fmt(km)}k`
	return t === 'rest' ? 'rest' : t.slice(0, 3)
}

const weekSessions = computed(() => {
	const planned = workouts.value.filter(w =>
		isWithinInterval(parseISO(w.date), { start: weekStart.value, end: weekEnd.value }) && sportOf(w) !== 'rest')
	const done = planned.filter(w => w.isCompleted === 1)
	return { planned: planned.length, done: done.length }
})

// ─── race hero ────────────────────────────────────────────────────────────────

const nextRace = computed(() =>
	raceGoals.value
		.filter(g => differenceInCalendarDays(parseISO(g.date), startOfDay(today.value)) >= 0)
		.sort((a, b) => a.date.localeCompare(b.date))[0] || null)

const nextRaceDays = computed(() =>
	nextRace.value ? differenceInCalendarDays(parseISO(nextRace.value.date), startOfDay(today.value)) : null)

const formatRaceDate = (d: string) => format(parseISO(d), 'd MMM yyyy')

const goalRaceSecs = computed(() => nextRace.value?.goal_time_secs ?? null)

// ─── recent PRs ───────────────────────────────────────────────────────────────

const recentPRs = computed(() => {
	const out: string[] = []
	const weekAgo = addDays(today.value, -7)
	for (const name of ['1 km', '5 km', '10 km', 'Half marathon']) {
		let bestT: number | null = null
		let bestDate: Date | null = null
		for (const a of activities.value) {
			const be = a.best_efforts?.find((b: any) => b.name === name)
			if (be && (bestT === null || be.elapsed_time < bestT)) {
				bestT = be.elapsed_time
				bestDate = new Date(a.start_date_local || a.start_date)
			}
		}
		if (bestT !== null && bestDate && bestDate >= weekAgo) out.push(`New ${name} best — ${fmtTime(bestT)}`)
	}
	return out
})

// ─── activity heatmap & sport mix ─────────────────────────────────────────────

const heatmapWeeks = ref<any[]>([])
const mixCanvas = ref<HTMLCanvasElement | null>(null)

function buildHeatmap() {
	const start = startOfWeek(subYears(today.value, 1), { weekStartsOn: 1 })
	const counts = new Map<string, number>()
	for (const w of completed.value) counts.set(w.date, (counts.get(w.date) || 0) + 1)

	const weeks: any[] = []
	let cursor = start
	let lastMonth = -1
	while (cursor <= today.value) {
		const days = Array.from({ length: 7 }, (_, i) => {
			const d = addDays(cursor, i)
			const ds = format(d, 'yyyy-MM-dd')
			return { dateStr: ds, value: counts.get(ds) || 0, future: d > today.value }
		})
		const m = cursor.getMonth()
		weeks.push({ days, monthLabel: m !== lastMonth ? format(cursor, 'MMM') : '' })
		lastMonth = m
		cursor = addDays(cursor, 7)
	}
	heatmapWeeks.value = weeks
}

function heatColor(day: any) {
	if (day.future) return 'transparent'
	if (!day.value) return css('--surface-2')
	const intensity = Math.min(day.value / 3, 1)
	return `color-mix(in srgb, ${getSportColor('running')} ${Math.round((0.3 + intensity * 0.7) * 100)}%, transparent)`
}

function buildMix() {
	if (!mixCanvas.value) return
	const counts = SPORT_TYPES
		.filter(t => t !== 'rest')
		.map(t => ({ type: t, n: completed.value.filter(w => sportOf(w) === t).length }))
		.filter(c => c.n > 0)
	if (!counts.length) return

	add(new Chart(mixCanvas.value, {
		type: 'doughnut',
		data: {
			labels: counts.map(c => SPORT_LABELS[c.type]),
			datasets: [{
				data: counts.map(c => c.n),
				backgroundColor: counts.map(c => getSportColor(c.type)),
				borderWidth: 0,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: '62%',
			plugins: { ...baseOpts().plugins, legend: legend() },
		} as any,
	}))
}

async function buildTodayCharts() {
	destroy()
	await nextTick()
	if (tab.value !== 'today') return
	buildHeatmap()
	buildMix()
}

// ─── lifecycle ────────────────────────────────────────────────────────────────

async function boot() {
	syncClock()
	dismissed.value = localStorage.getItem(dismissKey.value) === '1'
	await hydrateSettings()
	await loadStats()
	await buildTodayCharts()
}

/** A tab left open overnight must not keep calling yesterday "today". */
function onVisible() {
	if (document.visibilityState === 'visible') syncClock()
}

onMounted(() => {
	boot()
	document.addEventListener('visibilitychange', onVisible)
})
onActivated(boot)
onUnmounted(() => document.removeEventListener('visibilitychange', onVisible))

watch(tab, buildTodayCharts)
watch(completed, () => { if (tab.value === 'today') buildTodayCharts() })
</script>

<template>
	<div class="home-view">
		<header class="home-header">
			<div>
				<h1 class="greeting">{{ greeting }}<span v-if="userName">, {{ userName }}</span></h1>
				<p class="subgreeting">{{ todayLabel }}</p>
			</div>
			<div class="header-actions">
				<span v-if="weekStreak > 0" class="streak-badge">
					<n-icon class="flame" :component="FlameOutline" /> {{ weekStreak }}-week streak
				</span>
				<router-link to="/schedule" class="primary-btn">
					<n-icon :component="AddOutline" /> Plan workout
				</router-link>
			</div>
		</header>

		<!-- First-run checklist. A new account otherwise lands on a page of dashes. -->
		<section v-if="showOnboarding" class="onboarding">
			<div class="ob-head">
				<div>
					<h2>Get set up</h2>
					<p>{{ stepsDone }} of {{ steps.length }} done — each one switches on more of your stats.</p>
				</div>
				<button class="ob-dismiss" @click="dismissOnboarding">Dismiss</button>
			</div>
			<ul class="ob-steps">
				<li v-for="s in steps" :key="s.key" :class="{ done: s.done }">
					<span class="ob-check">{{ s.done ? '✓' : '' }}</span>
					<router-link v-if="!s.done" :to="s.to">{{ s.label }}</router-link>
					<span v-else>{{ s.label }}</span>
				</li>
			</ul>
		</section>

		<nav class="tabbar" role="tablist">
			<button
				v-for="t in tabs"
				:key="t.key"
				role="tab"
				:aria-selected="tab === t.key"
				:class="{ active: tab === t.key }"
				@click="setTab(t.key)"
			>
				{{ t.label }}
			</button>
		</nav>

		<!-- ─── Today ─────────────────────────────────────────────────────── -->
		<template v-if="tab === 'today'">
			<section class="panel today-card">
				<div class="today-head">
					<h2>Today</h2>
					<span v-if="todayAllDone" class="today-status done">All done ✓</span>
					<span v-else-if="todayState === 'rest'" class="today-status rest">Rest day</span>
				</div>

				<p v-if="todayState === 'rest'" class="today-note">Rest day on the plan. Recovery is training.</p>
				<div v-else-if="todayState === 'empty'" class="today-empty">
					<p class="today-note">Nothing planned for today.</p>
					<router-link to="/schedule" class="text-link">Add a session →</router-link>
				</div>

				<div v-else class="today-sessions">
					<div
						v-for="w in todaysWorkouts"
						:key="w.id"
						class="today-session"
						:class="{ done: w.isCompleted === 1 }"
					>
						<span class="ts-dot" :style="{ background: sportColor(w) }"></span>
						<div class="ts-body">
							<div class="ts-top">
								<router-link :to="`/workout/${w.id}`" class="ts-name">{{ w.name }}</router-link>
								<span v-if="w.isCompleted === 1" class="ts-done">✓</span>
							</div>
							<div class="ts-pills">
								<span v-if="kmOf(w)" class="ts-pill">{{ fmt(kmOf(w)!) }} km</span>
								<span v-if="w.duration" class="ts-pill">{{ w.duration }} min</span>
								<span
									v-if="todayPace(w)"
									class="ts-pill pace mono"
									:class="'basis-' + todayPace(w)!.basis"
									:title="todayPace(w)!.explain"
								>
									{{ todayPace(w)!.zone }} · {{ todayPace(w)!.value
									}}<template v-if="todayPace(w)!.basis !== 'planned'">/km</template>
								</span>
								<span v-if="w.gymType" class="ts-pill">{{ w.gymType }}</span>
							</div>
							<ul v-if="sessionSteps(w).length" class="ts-steps">
								<li v-for="(step, i) in sessionSteps(w)" :key="i">{{ step }}</li>
							</ul>
						</div>
						<div class="ts-actions">
							<button
								v-if="w.isCompleted !== 1"
								class="ts-complete"
								:disabled="busyId !== null"
								@click="completeToday(w)"
							>
								{{ busyId === w.id && busyKind === 'complete' ? 'Saving…' : 'Complete' }}
							</button>
							<button
								v-if="canAttach(w)"
								class="ts-file"
								:disabled="busyId !== null"
								@click="pickFit(w)"
								:title="w.isCompleted === 1 ? 'Replace or attach a recording' : 'Complete with a .fit/.gpx/.tcx recording'"
							>
								<n-icon :component="CloudUploadOutline" />
								<span class="ts-file-lbl">
									{{ busyId === w.id && busyKind === 'file'
										? 'Importing…'
										: (w.isCompleted === 1 ? 'Recording' : 'File') }}
								</span>
							</button>
						</div>
					</div>
				</div>
				<input
					ref="fitInput" type="file" style="display: none"
					accept=".fit,.gpx,.tcx,.gz,application/gzip"
					@change="onFitPicked"
				/>
			</section>

			<section v-if="nextRace" class="hero" :class="{ urgent: nextRaceDays !== null && nextRaceDays <= 14 }">
				<div class="hero-left">
					<span class="hero-kicker"><n-icon :component="FlagOutline" /> Next race</span>
					<h2 class="hero-race">{{ nextRace.name }}</h2>
					<p class="hero-sub">{{ formatRaceDate(nextRace.date) }}</p>
					<div v-if="goalRaceSecs !== null" class="hero-chips">
						<span class="hero-chip"><span class="hc-lbl">Goal</span><span class="mono">{{ fmtTime(goalRaceSecs) }}</span></span>
					</div>
				</div>
				<div class="hero-count">
					<span class="hero-days mono">{{ nextRaceDays }}</span>
					<span class="hero-days-lbl">days to go</span>
					<span class="hero-weeks">{{ Math.ceil((nextRaceDays || 0) / 7) }} weeks</span>
				</div>
			</section>

			<div v-if="recentPRs.length" class="pr-banner">
				<span class="pr-banner-ico"><n-icon :component="TrophyOutline" /></span>
				<span v-for="p in recentPRs" :key="p" class="pr-banner-chip">{{ p }}</span>
			</div>

			<div v-if="ramp.verdict === 'sharp'" class="stat-banner warn">
				<n-icon :component="WarningOutline" />
				<span>{{ ramp.message }}</span>
			</div>

			<section class="panel week-panel">
				<div class="panel-head">
					<h2>This week</h2>
					<span class="week-count">{{ weekSessions.done }} of {{ weekSessions.planned }} done</span>
					<router-link to="/schedule" class="text-link">Open schedule →</router-link>
				</div>
				<div class="week-strip">
					<router-link
						v-for="day in weekDays"
						:key="day.key"
						to="/schedule"
						class="day-col"
						:class="{ today: day.isToday }"
					>
						<span class="day-name">{{ day.name }}</span>
						<div class="day-box">
							<template v-if="day.workouts.length">
								<span
									v-for="w in day.workouts"
									:key="w.id"
									class="day-chip"
									:class="{ done: w.isCompleted === 1 }"
									:style="{ '--c': sportColor(w) }"
									:title="w.name"
								>{{ chipLabel(w) }}<span v-if="w.isCompleted === 1"> ✓</span></span>
							</template>
							<span v-else class="day-empty">·</span>
						</div>
					</router-link>
				</div>
			</section>

			<template v-if="completed.length">
				<SectionHead title="Consistency" note="every session, last 12 months" />
				<section class="panel stat-card">
					<div class="heatmap-wrap">
						<div class="heatmap">
							<div class="hm-days">
								<span></span>
								<span v-for="(d, i) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="i">{{ d }}</span>
							</div>
							<div class="hm-weeks">
								<div v-for="(week, wi) in heatmapWeeks" :key="wi" class="hm-col">
									<span class="hm-month">{{ week.monthLabel }}</span>
									<div
										v-for="(day, di) in week.days"
										:key="di"
										class="hm-cell"
										:style="{ backgroundColor: heatColor(day) }"
										:title="`${day.dateStr}: ${day.value || 0} session(s)`"
									></div>
								</div>
							</div>
						</div>
						<div class="hm-legend">
							<span>Less</span>
							<i v-for="n in 4" :key="n" :style="{ opacity: 0.25 + n * 0.18 }"></i>
							<span>More</span>
						</div>
					</div>
				</section>

				<SectionHead title="Training mix" note="all completed sessions" />
				<section class="mix-row">
					<div class="panel stat-card mix-card">
						<div class="stat-chart mix-chart"><canvas ref="mixCanvas"></canvas></div>
					</div>
					<div class="panel recent-panel">
						<router-link
							v-for="w in recentActivities"
							:key="w.id"
							:to="`/workout/${w.id}`"
							class="recent-row"
						>
							<span class="recent-dot" :style="{ background: sportColor(w) }"></span>
							<span class="recent-name">{{ w.name }}</span>
							<span class="recent-date">{{ format(parseISO(w.date), 'EEE d MMM') }}</span>
							<n-icon class="recent-chev" :component="ChevronForwardOutline" />
						</router-link>
					</div>
				</section>
			</template>

			<EmptyState
				v-else-if="loaded"
				:icon="WalkOutline"
				title="Nothing completed yet"
				body="Once you finish your first session, your consistency calendar and training mix appear here — and the sport tabs above start tracking your progress."
				action-label="Go to schedule"
				action-to="/schedule"
			/>
		</template>

		<RunningTab v-else-if="tab === 'running'" />
		<GymTab v-else-if="tab === 'gym'" />
		<BikeTab v-else-if="tab === 'bike'" />
		<BodyTab v-else-if="tab === 'body'" />
	</div>
</template>

<style scoped>
.home-view { padding: 24px 28px 48px; max-width: 1120px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .home-view { padding: 16px 16px 36px; } }

.home-header {
	display: flex; justify-content: space-between; align-items: flex-start;
	gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
}
.greeting { font-size: 1.35rem; font-weight: 400; font-family: var(--font-serif); }
.subgreeting { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.85rem; }
.header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.streak-badge {
	display: inline-flex; align-items: center; gap: 6px;
	background: var(--warning-soft); color: var(--warning-color);
	padding: 7px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600;
}
.streak-badge .flame { animation: flame-pulse 2.6s ease-in-out infinite; }
@keyframes flame-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }

.primary-btn {
	display: inline-flex; align-items: center; gap: 6px;
	background: var(--primary-color); color: #fff;
	padding: 8px 14px; border-radius: var(--radius-sm);
	font-size: 0.84rem; font-weight: 600;
}
.primary-btn:hover { background: var(--primary-strong); }

/* Onboarding */
.onboarding {
	background: var(--surface-color);
	border: 1px solid var(--border-strong);
	border-radius: var(--radius);
	padding: 15px 17px;
	margin-bottom: 16px;
}
.ob-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.ob-head h2 { font-size: 0.96rem; font-weight: 600; font-family: var(--font-family); margin: 0; }
.ob-head p { margin: 3px 0 0; font-size: 0.8rem; color: var(--text-secondary); }
.ob-dismiss {
	background: none; border: none; cursor: pointer; padding: 2px 4px;
	font-family: inherit; font-size: 0.78rem; color: var(--text-muted);
}
.ob-dismiss:hover { color: var(--text-secondary); }
.ob-steps { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 18px; }
.ob-steps li { display: flex; align-items: center; gap: 7px; font-size: 0.83rem; }
.ob-steps li.done { color: var(--text-muted); }
.ob-check {
	display: inline-flex; align-items: center; justify-content: center;
	width: 17px; height: 17px; border-radius: 50%;
	border: 1.5px solid var(--border-strong);
	font-size: 0.66rem; color: var(--success-color); flex-shrink: 0;
}
.ob-steps li.done .ob-check { border-color: var(--success-color); background: var(--success-soft); }

/* Tabs */
.tabbar { display: flex; gap: 2px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); overflow-x: auto; }
.tabbar button {
	background: transparent; border: none; border-bottom: 2px solid transparent;
	color: var(--text-muted); font-family: inherit; font-size: 0.88rem; font-weight: 500;
	padding: 9px 16px; cursor: pointer; white-space: nowrap;
	transition: color 0.15s, border-color 0.15s;
}
.tabbar button:hover { color: var(--text-secondary); }
.tabbar button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }

.panel {
	background: var(--surface-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	box-shadow: inset 0 1px 0 var(--border-subtle);
}

/* Today */
.today-card { padding: 16px 18px; margin-bottom: 14px; }
.today-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.today-head h2 { font-size: 1rem; font-weight: 600; font-family: var(--font-family); margin: 0; }
.today-status { font-size: 0.74rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.today-status.done { color: var(--success-color); background: var(--success-soft); }
.today-status.rest { color: var(--text-muted); background: var(--surface-2); }
.today-note { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
.today-empty { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }

.today-sessions { display: flex; flex-direction: column; gap: 10px; }
.today-session {
	display: flex; align-items: flex-start; gap: 11px; padding: 12px;
	background: var(--surface-2); border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
}
.today-session.done { opacity: 0.62; }
.ts-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.ts-body { flex: 1; min-width: 0; }
.ts-top { display: flex; align-items: center; gap: 7px; }
.ts-name { font-weight: 600; font-size: 0.95rem; color: var(--text-color); }
.ts-name:hover { color: var(--primary-color); }
.ts-done { color: var(--success-color); font-weight: 700; }
.ts-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.ts-pill {
	font-size: 0.74rem; color: var(--text-secondary); background: var(--surface-color);
	border: 1px solid var(--border-color); padding: 2px 9px; border-radius: 999px;
}
.ts-pill.pace { cursor: help; }
.ts-pill.pace.basis-fitness { color: var(--color-running-primary); border-color: color-mix(in srgb, var(--color-running-primary) 40%, transparent); }
.ts-pill.pace.basis-goal { color: var(--primary-color); border-color: var(--primary-soft); background: var(--primary-soft); }
.ts-pill.pace.basis-planned { color: var(--text-muted); font-family: inherit; }
.ts-steps { margin: 9px 0 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.ts-steps li { position: relative; padding-left: 15px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }
.ts-steps li::before {
	content: ''; position: absolute; left: 3px; top: 7px;
	width: 4px; height: 4px; border-radius: 50%; background: var(--text-muted);
}
.ts-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.ts-complete, .ts-file {
	display: inline-flex; align-items: center; justify-content: center; gap: 5px;
	padding: 6px 11px; border-radius: var(--radius-sm); cursor: pointer;
	font-family: inherit; font-size: 0.76rem; font-weight: 600;
	border: 1px solid var(--border-strong); background: var(--surface-color);
	color: var(--text-secondary);
}
.ts-complete { background: var(--primary-color); border-color: var(--primary-color); color: #fff; }
.ts-complete:disabled, .ts-file:disabled { opacity: 0.55; cursor: default; }
.ts-file-lbl { white-space: nowrap; }

/* Race hero */
.hero {
	display: flex; justify-content: space-between; align-items: center; gap: 18px;
	flex-wrap: wrap; padding: 17px 19px; margin-bottom: 14px;
	background: linear-gradient(135deg, var(--primary-soft) 0%, var(--surface-color) 62%);
	border: 1px solid var(--border-color); border-radius: var(--radius);
}
.hero.urgent { background: linear-gradient(135deg, var(--warning-soft) 0%, var(--surface-color) 62%); }
.hero-kicker {
	display: inline-flex; align-items: center; gap: 6px;
	font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);
}
.hero-race { font-size: 1.25rem; margin: 5px 0 2px; }
.hero-sub { margin: 0; font-size: 0.82rem; color: var(--text-secondary); }
.hero-chips { display: flex; gap: 8px; margin-top: 9px; }
.hero-chip {
	display: inline-flex; align-items: baseline; gap: 6px;
	font-size: 0.76rem; padding: 3px 10px; border-radius: 999px;
	background: var(--surface-2); color: var(--text-secondary);
}
.hc-lbl { color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; }
.hero-count { display: flex; flex-direction: column; align-items: flex-end; }
.hero-days { font-size: 2.3rem; font-weight: 700; line-height: 1; color: var(--text-color); }
.hero-days-lbl { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.hero-weeks { font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; }

/* PR banner */
.pr-banner {
	display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
	padding: 10px 14px; margin-bottom: 14px;
	background: var(--success-soft); border-radius: var(--radius);
}
.pr-banner-ico { color: var(--success-color); display: flex; }
.pr-banner-chip { font-size: 0.79rem; font-weight: 600; color: var(--success-color); }

/* This week */
.week-panel { padding: 15px 17px; margin-bottom: 4px; }
.panel-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.panel-head h2 { font-size: 1rem; font-weight: 600; font-family: var(--font-family); margin: 0; }
.week-count { font-size: 0.76rem; color: var(--text-muted); }
.text-link { margin-left: auto; font-size: 0.8rem; color: var(--primary-color); }
.text-link:hover { text-decoration: underline; }

.week-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.day-col { display: flex; flex-direction: column; align-items: center; gap: 6px; text-decoration: none; }
.day-name { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; }
.day-col.today .day-name { color: var(--primary-color); font-weight: 700; }
.day-box {
	width: 100%; min-height: 52px; display: flex; flex-direction: column;
	align-items: center; justify-content: center; gap: 3px; padding: 5px 3px;
	background: var(--surface-2); border: 1px solid var(--border-color);
	border-radius: var(--radius-sm); box-sizing: border-box;
}
.day-col.today .day-box { border-color: var(--primary-color); }
.day-chip {
	font-size: 0.63rem; font-weight: 600; padding: 1px 6px; border-radius: 999px;
	color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent);
	max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.day-chip.done { opacity: 0.6; }
.day-empty { color: var(--text-muted); font-size: 0.9rem; }

/* Heatmap */
.stat-card { padding: 14px 16px 16px; }
.heatmap-wrap { overflow-x: auto; }
.heatmap { display: flex; gap: 4px; min-width: max-content; }
.hm-days { display: flex; flex-direction: column; gap: 3px; padding-top: 15px; }
.hm-days span { height: 11px; font-size: 0.58rem; color: var(--text-muted); line-height: 11px; }
.hm-weeks { display: flex; gap: 3px; }
.hm-col { display: flex; flex-direction: column; gap: 3px; }
.hm-month { height: 12px; font-size: 0.58rem; color: var(--text-muted); white-space: nowrap; }
.hm-cell { width: 11px; height: 11px; border-radius: 2px; }
.hm-legend { display: flex; align-items: center; gap: 4px; margin-top: 10px; font-size: 0.66rem; color: var(--text-muted); }
.hm-legend i { width: 11px; height: 11px; border-radius: 2px; background: var(--color-running-primary); display: inline-block; }

/* Mix + recent */
.mix-row { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(260px, 1.3fr); gap: 12px; }
@media (max-width: 768px) { .mix-row { grid-template-columns: 1fr; } }
.mix-chart { height: 190px; }
.recent-panel { padding: 6px 4px; }
.recent-row {
	display: flex; align-items: center; gap: 10px;
	padding: 9px 12px; border-radius: var(--radius-sm); text-decoration: none;
}
.recent-row:hover { background: var(--surface-hover); }
.recent-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.recent-name {
	flex: 1; min-width: 0; font-size: 0.84rem; color: var(--text-color);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.recent-date { font-size: 0.74rem; color: var(--text-muted); white-space: nowrap; }
.recent-chev { color: var(--text-muted); flex-shrink: 0; }
</style>
