/**
 * A workout's *real* sport, taken from the recording behind it when there is one.
 *
 * The `workouts.type` column is hand-entered and demonstrably unreliable: running
 * sessions typed `Bike`, a 20-minute threshold workout carrying 31 km at 31 km/h.
 * A FIT file records what the watch saw, so when a workout has a recording we
 * believe the recording.
 *
 * Two ways to find that recording:
 *   1. `stravaActivityId` matches an imported activity's id.
 *   2. Failing that, an imported activity on the same calendar date.
 *
 * (2) matters because most older workouts carry dead Strava ids from before the
 * file-import migration, so id matching alone would resolve almost nothing.
 */
import { activitySport } from './activityStats'
import { getWorkoutType, type SportType } from './workouts'
import type { Workout } from '@/types'

export interface ActivityIndex {
	byId: Map<string, any>
	byDate: Map<string, any[]>
}

const activityDate = (a: any): string => String(a.start_date_local || a.start_date || '').slice(0, 10)

export function buildActivityIndex(activities: any[]): ActivityIndex {
	const byId = new Map<string, any>()
	const byDate = new Map<string, any[]>()
	for (const a of activities) {
		byId.set(String(a.id), a)
		const d = activityDate(a)
		if (!d) continue
		const list = byDate.get(d)
		if (list) list.push(a)
		else byDate.set(d, [a])
	}
	return { byId, byDate }
}

/** Only distance sessions get re-sported — a gym workout must never absorb a run. */
const isResolvable = (type: SportType) => type === 'running' || type === 'bike'

/**
 * The activity that recorded this workout, or null. When several were recorded
 * on the day, prefer the one closest to the workout's own distance — but that
 * distance may itself be wrong, so it only breaks ties, never rejects a match.
 */
export function resolveActivity(workout: Workout, index: ActivityIndex): any | null {
	if (!isResolvable(getWorkoutType(workout))) return null

	if (workout.stravaActivityId != null) {
		const hit = index.byId.get(String(workout.stravaActivityId))
		if (hit) return hit
	}

	const sameDay = index.byDate.get(workout.date)
	if (!sameDay?.length) return null
	if (sameDay.length === 1) return sameDay[0]

	const km = workout.distance
	if (!km) return sameDay[0]
	return sameDay.reduce((best, a) => {
		const d = Math.abs((a.distance ?? 0) / 1000 - km)
		const bd = Math.abs((best.distance ?? 0) / 1000 - km)
		return d < bd ? a : best
	})
}

/** Map the recorded sport onto a workout sport, or null when it doesn't correspond. */
function sportFromActivity(activity: any): SportType | null {
	switch (activitySport(activity)) {
		case 'run': return 'running'
		case 'ride': return 'bike'
		default: return null
	}
}

/**
 * The sport to display and count this workout as. Falls back to the `type`
 * column (via getWorkoutType) whenever there's no recording to trust.
 */
export function effectiveWorkoutType(workout: Workout, index: ActivityIndex): SportType {
	const declared = getWorkoutType(workout)
	if (!isResolvable(declared)) return declared

	const activity = resolveActivity(workout, index)
	if (!activity) return declared

	return sportFromActivity(activity) ?? declared
}

/** The distance the watch recorded, in km, preferred over the typed-in one. */
export function effectiveDistanceKm(workout: Workout, index: ActivityIndex): number | undefined {
	const activity = resolveActivity(workout, index)
	const metres = Number(activity?.distance)
	if (Number.isFinite(metres) && metres > 0) return Math.round((metres / 1000) * 100) / 100
	return workout.distance
}
