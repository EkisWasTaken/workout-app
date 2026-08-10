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
import { buildActivityIndex, effectiveDistanceKm, effectiveWorkoutType } from './utils/workoutSport'
import { isDistanceSport, type SportType } from './utils/workouts'
import {
	bestEffortProgress, bikeProgress, bodyProgress, gymProgress,
	runningProgress, trainingLoad, volumeRamp, weekWindows, type Act,
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

export const hrSettings = computed(() => {
	const observed = Math.max(0, ...activities.value.map(a => a.max_heartrate || 0))
	const override = settings.maxHR
	const maxHR = override && override > 100 ? override : observed
	return { maxHR: maxHR >= 140 ? maxHR : null, restHR: settings.restingHR || 60 }
})

/** Weekly kilometres for one sport, oldest first, ending with the current week. */
function kmByWeek(sport: SportType, weeks: number): number[] {
	return weekWindows(weeks, today.value).map(wk =>
		completed.value
			.filter(w => {
				const d = new Date(w.date)
				return d >= wk.start && d <= wk.end && sportOf(w) === sport
			})
			.reduce((sum, w) => sum + (kmOf(w) || 0), 0))
}

export const runKmByWeek = computed(() => kmByWeek('running', 12))
export const bikeKmByWeek = computed(() => kmByWeek('bike', 12))

// ─── per-sport progress ───────────────────────────────────────────────────────

export const running = computed(() => runningProgress({
	activities: activities.value,
	runKmByWeek: runKmByWeek.value,
	maxHR: hrSettings.value.maxHR,
	restHR: hrSettings.value.restHR,
	today: today.value,
}))

export const gym = computed(() =>
	gymProgress(completed.value.filter(w => sportOf(w) === 'gym'), today.value))

export const bike = computed(() =>
	bikeProgress(activities.value, bikeKmByWeek.value, hrSettings.value.maxHR, today.value))

export const body = computed(() =>
	bodyProgress(dailyWeights.value, settings.goalWeight, today.value))

export const load = computed(() =>
	trainingLoad(activities.value, hrSettings.value.maxHR, hrSettings.value.restHR, 120, today.value))

export const bests = computed(() => bestEffortProgress(activities.value, 90, today.value))

export const ramp = computed(() => volumeRamp(runKmByWeek.value))

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
	const count = (s: SportType) => completed.value.filter(w => sportOf(w) === s).length
	const candidates: SportTab[] = [
		{ key: 'running', label: 'Running', sessions: count('running') },
		{ key: 'gym', label: 'Gym', sessions: count('gym') },
		{ key: 'bike', label: 'Bike', sessions: count('bike') },
	]
	return candidates.filter(t => t.sessions > 0).sort((a, b) => b.sessions - a.sessions)
})

/** Completed sessions of any distance sport, newest first. */
export const recentActivities = computed(() =>
	[...completed.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6))

export const hasAnyDistanceWork = computed(() =>
	completed.value.some(w => isDistanceSport(sportOf(w))))
