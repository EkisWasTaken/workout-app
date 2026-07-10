/**
 * Reactive current-fitness store.
 *
 * Both the schedule (for pace advice) and Home (for goal tracking) need to know
 * what VDOT you can actually race today. Everything downstream is computed, so
 * the moment a workout is completed or a file imported, call `refreshFitness()`
 * and every pace, projection and goal verdict re-derives.
 */
import { ref, computed } from 'vue'
import { activityApi } from './activities'
import { db } from './db'
import { settings, raceGoals, targets } from './settings'
import {
	raceVdotSamples, effortVdotSamples, loggedRunVdotSamples,
	currentVdot as computeCurrentVdot,
	vdotTrendPerMonth, rollingBestSeries, goalProgress, type GoalProgress,
} from './utils/fitness'
import { buildActivityIndex, resolveActivity } from './utils/workoutSport'
import { getWorkoutType } from './utils/workouts'
import type { Target, Workout } from './types'

const activities = ref<any[]>([])
const workouts = ref<Workout[]>([])
export const fitnessLoaded = ref(false)

let inflight: Promise<void> | null = null

async function fetchAll(): Promise<void> {
	const [acts, ws] = await Promise.all([
		activityApi.getAllActivities().catch(e => { console.warn('[fitness] no activity data', e); return [] }),
		db.getWorkouts().catch(e => { console.warn('[fitness] no workout data', e); return [] as Workout[] }),
	])
	activities.value = acts
	workouts.value = ws
	fitnessLoaded.value = true
}

/** Idempotent: concurrent callers share one fetch, repeat callers get the cache. */
export function hydrateFitness(): Promise<void> {
	return (inflight ??= fetchAll())
}

/**
 * Re-read everything. Call after completing a workout, importing a FIT file, or
 * editing a session — otherwise VDOT keeps reporting the fitness you had at page
 * load, which is exactly what it used to do.
 */
export function refreshFitness(): Promise<void> {
	inflight = fetchAll()
	return inflight
}

/** Let a view that already fetched activities share them rather than refetch. */
export function setActivities(acts: any[]) {
	activities.value = acts
	fitnessLoaded.value = true
}

/** Same, for the workout list. */
export function setWorkouts(ws: Workout[]) {
	workouts.value = ws
}

const raceSamples = computed(() => raceVdotSamples(raceGoals.list))

const activitySamples = computed(() => effortVdotSamples(activities.value))

/**
 * Hand-logged runs, excluding any that have a recording — the recording already
 * contributed a (better) sample for that run, and counting both would double it.
 */
const loggedSamples = computed(() => {
	const index = buildActivityIndex(activities.value)
	const runs = workouts.value
		.filter(w => w.isCompleted === 1 && getWorkoutType(w) === 'running')
		.filter(w => !resolveActivity(w, index))
		.filter(w => w.distance && w.actualDuration)
		.map(w => ({ date: w.date, name: w.name, distanceKm: w.distance!, minutes: w.actualDuration! }))
	return loggedRunVdotSamples(runs)
})

const effortSamples = computed(() =>
	[...activitySamples.value, ...loggedSamples.value].sort((a, b) => a.date.localeCompare(b.date)))

/** Every VDOT reading we have, oldest first — races and training efforts. */
export const vdotSamples = computed(() =>
	[...raceSamples.value, ...effortSamples.value].sort((a, b) => a.date.localeCompare(b.date)))

/**
 * What you could race today. Override > recent race > recent training effort.
 * Null when there's nothing to go on, in which case no pace advice is shown.
 */
export const currentFitness = computed(() =>
	computeCurrentVdot(raceSamples.value, effortSamples.value, settings.vdotOverride))

export const currentVdot = computed<number | null>(() => currentFitness.value?.vdot ?? null)

/** What the data suggests, ignoring the override — shown next to the override field. */
export const derivedFitness = computed(() =>
	computeCurrentVdot(raceSamples.value, effortSamples.value, null))

/**
 * The fitness line: best VDOT recorded in the trailing 90 days, at weekly points.
 *
 * Races belong in here alongside training efforts. It's a maximum, not a fit, so
 * a race can only raise the line — which is exactly what a race is for. (Fitting
 * a regression through raw samples was the old bug: easy runs imply a low VDOT,
 * so a base block read as a fitness collapse. A trailing max only falls when a
 * good effort ages out.)
 */
export const fitnessLine = computed(() => rollingBestSeries(vdotSamples.value, 12))

/** VDOT gained per 30 days, fitted to the fitness line. Null when nothing new was measured. */
export const vdotTrend = computed(() => vdotTrendPerMonth(vdotSamples.value, 12))

export interface TrackedTarget extends Target {
	progress: GoalProgress
}

/** Every target with its gap, projection and verdict — the "am I on track" table. */
export const trackedTargets = computed<TrackedTarget[]>(() => {
	const cur = currentVdot.value
	if (cur === null) return []
	return targets.value
		.map(t => ({ ...t, progress: goalProgress(t.neededVdot, cur, vdotTrend.value, t.date) }))
		.sort((a, b) => {
			// dated goals first, soonest first; undated last
			if (a.date && b.date) return a.date.localeCompare(b.date)
			if (a.date) return -1
			if (b.date) return 1
			return a.neededVdot - b.neededVdot
		})
})
