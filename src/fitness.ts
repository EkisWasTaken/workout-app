/**
 * Reactive current-fitness store.
 *
 * Both the schedule (for pace advice) and Home (for goal tracking) need to know
 * what VDOT you can actually race today. Fetch the activities once, here.
 */
import { ref, computed } from 'vue'
import { activityApi } from './activities'
import { settings, raceGoals, targets } from './settings'
import {
	raceVdotSamples, effortVdotSamples, currentVdot as computeCurrentVdot,
	vdotTrendPerMonth, rollingBestSeries, goalProgress, type GoalProgress,
} from './utils/fitness'
import type { Target } from './types'

const activities = ref<any[]>([])
export const fitnessLoaded = ref(false)

let hydrating: Promise<void> | null = null

/** Idempotent, and concurrent callers share one fetch. */
export function hydrateFitness(): Promise<void> {
	if (hydrating) return hydrating
	hydrating = (async () => {
		try {
			activities.value = await activityApi.getAllActivities()
		} catch (e) {
			console.warn('[fitness] no activity data', e)
		} finally {
			fitnessLoaded.value = true
		}
	})()
	return hydrating
}

/** Let a view that already fetched activities share them rather than refetch. */
export function setActivities(acts: any[]) {
	activities.value = acts
	fitnessLoaded.value = true
}

const raceSamples = computed(() => raceVdotSamples(raceGoals.list))
const effortSamples = computed(() => effortVdotSamples(activities.value))

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
