/**
 * The reactive store behind the Home statistics.
 *
 * Home used to load workouts, weights and activities itself and derive every
 * number inline, which is how it grew to two thousand lines. Now each sport tab
 * is its own component reading from here, in the same module-singleton style as
 * `settings.ts` and `fitness.ts`.
 *
 * `today` is a ref rather than a captured `new Date()`. The old code took the
 * date once when the component's setup ran, so a tab left open overnight kept
 * reporting yesterday as "today" — wrong week strip, wrong streak, wrong
 * everything. It now re-reads whenever the tab regains focus.
 */
import { computed, ref } from 'vue'
import { db } from './db'
import { activityApi } from './activities'
import { settings } from './settings'
import { setActivities, setWorkouts } from './fitness'
import { parseISO } from 'date-fns'
import { buildActivityIndex, effectiveDistanceKm, effectiveWorkoutType, resolveActivity } from './utils/workoutSport'
import { activitySport } from './utils/activityStats'
import { observedMaxHR, relativeEffort } from './utils/analysis'
import { isDistanceSport, type SportType } from './utils/workouts'
import {
	actDate, bestEffortProgress, bikeProgress, bodyProgress, gymProgress,
	runningProgress, trainingLoad, volumeRamp, weeklyTotals, type Act, type DistanceSession,
} from './utils/progress'
import type { DailyWeight, RaceGoal, Workout } from './types'

// ─── raw data ─────────────────────────────────────────────────────────────────

export const workouts = ref<Workout[]>([])
export const activities = ref<Act[]>([])
export const dailyWeights = ref<DailyWeight[]>([])
export const raceGoals = ref<RaceGoal[]>([])
export const loaded = ref(false)
export const loading = ref(false)

/** "Now", re-read on demand rather than frozen at component setup. */
export const today = ref(new Date())

/** Call when the tab regains focus so a long-lived session doesn't drift. */
export function syncClock(): void {
	const fresh = new Date()
	// Only churn reactive dependents when the calendar day actually turned.
	if (fresh.toDateString() !== today.value.toDateString()) today.value = fresh
}

export async function loadStats(): Promise<void> {
	loading.value = true
	try {
		const [w, dw, rg] = await Promise.all([
			db.getWorkouts(),
			db.getDailyWeights().catch(() => [] as DailyWeight[]),
			db.getRaceGoals().catch(() => [] as RaceGoal[]),
		])
		workouts.value = w
		dailyWeights.value = dw
		raceGoals.value = rg
		setWorkouts(w) // completing a session here must move the fitness store too

		try {
			const acts = await activityApi.getAllActivities()
			activities.value = acts
			setActivities(acts) // share the fetch rather than have fitness.ts refetch
		} catch {
			activities.value = []
		}
		syncClock()
		loaded.value = true
	} finally {
		loading.value = false
	}
}

/** Drop everything on sign-out so one account's numbers never show to another. */
export function resetStats(): void {
	workouts.value = []
	activities.value = []
	dailyWeights.value = []
	raceGoals.value = []
	loaded.value = false
}

// ─── derived basics ───────────────────────────────────────────────────────────

/**
 * A workout's real sport and distance come from the recording behind it when
 * there is one — the hand-typed `type` column is demonstrably unreliable.
 */
export const activityIndex = computed(() => buildActivityIndex(activities.value))
export const sportOf = (w: Workout): SportType => effectiveWorkoutType(w, activityIndex.value)
export const kmOf = (w: Workout): number | undefined => effectiveDistanceKm(w, activityIndex.value)

export const completed = computed(() => workouts.value.filter(w => w.isCompleted === 1))

/**
 * Max and resting HR, shared by every heart-rate number in the app — Home and
 * the workout page must never disagree about which zone a run was in.
 */
export const hrSettings = computed(() => {
	const override = settings.maxHR
	const maxHR = override && override > 100 ? override : observedMaxHR(activities.value)
	return {
		maxHR: maxHR >= 140 ? maxHR : null,
		restHR: settings.restingHR || 60,
		/** True when max HR was inferred from recordings rather than set in Profile. */
		inferred: !(override && override > 100),
	}
})

/**
 * Every completed session of a distance sport, counted exactly once.
 *
 * A logged workout with a recording behind it takes the recording's date and
 * distance; a logged workout without one keeps its typed distance; and a
 * recording imported without a workout still counts. Volume used to come from
 * workouts while run counts came from recordings, so the two could disagree
 * about how many runs you'd done.
 */
function distanceSessions(sport: 'running' | 'bike'): DistanceSession[] {
	const want = sport === 'running' ? 'run' : 'ride'
	const used = new Set<string>()
	const out: DistanceSession[] = []
	for (const w of completed.value) {
		if (sportOf(w) !== sport) continue
		const a = resolveActivity(w, activityIndex.value)
		const linked = a && activitySport(a) === want && !used.has(String(a.id)) ? a : null
		if (linked) used.add(String(linked.id))
		const km = linked && linked.distance > 0 ? linked.distance / 1000 : (w.distance ?? 0)
		out.push({ date: linked ? actDate(linked) : parseISO(w.date), km, activity: linked })
	}
	for (const a of activities.value) {
		if (activitySport(a) !== want || used.has(String(a.id))) continue
		out.push({ date: actDate(a), km: (a.distance || 0) / 1000, activity: a })
	}
	return out
}

export const runSessions = computed(() => distanceSessions('running'))
export const bikeSessions = computed(() => distanceSessions('bike'))

const kmByWeek = (sessions: DistanceSession[], weeks: number) =>
	weeklyTotals(sessions, s => s.date, s => s.km, weeks, today.value)

export const runKmByWeek = computed(() => kmByWeek(runSessions.value, 12))
export const bikeKmByWeek = computed(() => kmByWeek(bikeSessions.value, 12))

export const gymSessions = computed(() => completed.value.filter(w => sportOf(w) === 'gym'))

/** The latest weigh-in, for the bike power estimate. 75 kg when there is none. */
const riderKg = computed(() => {
	const latest = [...dailyWeights.value].sort((a, b) => b.date.localeCompare(a.date))[0]
	return latest?.weight > 0 ? latest.weight : 75
})

// ─── per-sport progress ───────────────────────────────────────────────────────

export const running = computed(() => runningProgress({
	sessions: runSessions.value,
	activities: activities.value,
	maxHR: hrSettings.value.maxHR,
	restHR: hrSettings.value.restHR,
	today: today.value,
}))

export const gym = computed(() => gymProgress(gymSessions.value, today.value))

export const bike = computed(() => bikeProgress({
	sessions: bikeSessions.value,
	activities: activities.value,
	maxHR: hrSettings.value.maxHR,
	restHR: hrSettings.value.restHR,
	riderKg: riderKg.value,
	today: today.value,
}))

export const body = computed(() =>
	bodyProgress(dailyWeights.value, settings.goalWeight, today.value))

export const load = computed(() =>
	trainingLoad(activities.value, hrSettings.value.maxHR, hrSettings.value.restHR, 120, today.value))

export const bests = computed(() => bestEffortProgress(activities.value, 90, today.value))

export const ramp = computed(() => volumeRamp(runSessions.value, today.value))

/**
 * Every session's heart-rate load, for the weekly effort comparison.
 *
 * Sessions recorded without heart rate contribute nothing rather than a zero —
 * a missing reading is not an easy week, and averaging it in as one would drag
 * the whole baseline down.
 */
export const effortPoints = computed(() => {
	const { maxHR, restHR } = hrSettings.value
	if (!maxHR) return []
	return activities.value.flatMap(a => {
		const effort = relativeEffort(a, maxHR, restHR)
		return effort === null ? [] : [{ date: actDate(a), effort }]
	})
})

// ─── which tabs to show ───────────────────────────────────────────────────────

export interface SportTab {
	key: 'running' | 'gym' | 'bike'
	label: string
	sessions: number
}

/**
 * Only offer a sport the user actually does.
 *
 * A friend who exclusively lifts has no use for a Running tab, and an empty one
 * is noise rather than an invitation. Tabs are ordered by how much of it they
 * do, so the sport you care about is the one next to Today.
 */
export const sportTabs = computed<SportTab[]>(() => {
	const candidates: SportTab[] = [
		{ key: 'running', label: 'Running', sessions: runSessions.value.length },
		{ key: 'gym', label: 'Gym', sessions: gymSessions.value.length },
		{ key: 'bike', label: 'Bike', sessions: bikeSessions.value.length },
	]
	return candidates.filter(t => t.sessions > 0).sort((a, b) => b.sessions - a.sessions)
})

/** Completed sessions of any distance sport, newest first. */
export const recentActivities = computed(() =>
	[...completed.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6))

export const hasAnyDistanceWork = computed(() =>
	completed.value.some(w => isDistanceSport(sportOf(w))))
