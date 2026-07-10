import type { Workout } from '@/types'

export type SportType = 'gym' | 'running' | 'bike' | 'rest' | 'other'

export const SPORT_TYPES: SportType[] = ['gym', 'running', 'bike', 'rest', 'other']

export const SPORT_LABELS: Record<SportType, string> = {
	gym: 'Gym',
	running: 'Running',
	bike: 'Bike',
	rest: 'Rest',
	other: 'Other',
}

/** Resolve a workout to one of the known sport types, falling back to name heuristics. */
export function getWorkoutType(workout: Workout): SportType {
	if (workout.type) {
		const t = workout.type.toLowerCase()
		if (t === 'gym' || t === 'strength') return 'gym'
		if (t === 'running' || t === 'run') return 'running'
		if (t === 'bike' || t === 'cycling' || t === 'cycle') return 'bike'
		if (t === 'rest' || t === 'rest day') return 'rest'
		if (t === 'other') return 'other'
	}
	const n = workout.name.toLowerCase()
	if (n.includes('gym') || n.includes('strength') || n.includes('weights')) return 'gym'
	if (n.includes('run') || n.includes('jog')) return 'running'
	if (n.includes('bike') || n.includes('cycle') || n.includes('cycling')) return 'bike'
	if (n.includes('rest')) return 'rest'
	return 'other'
}

/**
 * Read the live CSS variable for a sport color (set from the DB at runtime).
 *
 * getComputedStyle forces a style recalc, and this is called once per workout
 * chip inside render loops — so results are memoised. Call `clearSportColorCache`
 * after writing new colors to the document.
 */
const sportColorCache = new Map<SportType, string>()

export function getSportColor(type: SportType): string {
	const hit = sportColorCache.get(type)
	if (hit !== undefined) return hit

	const v = getComputedStyle(document.documentElement)
		.getPropertyValue(`--color-${type}-primary`)
		.trim() || '#9aa7b8'
	sportColorCache.set(type, v)
	return v
}

export function clearSportColorCache(): void {
	sportColorCache.clear()
}

export const isDistanceSport = (type: SportType) => type === 'running' || type === 'bike'

/** Break a workout's notes into readable steps for a "session plan" list. */
export function noteSteps(workout: Workout): string[] {
	const raw = (workout.notes || '').trim()
	if (!raw) return []
	return raw.split(/(?<=[.!?])\s+(?=[A-Z0-9🎯🏁])/).map(s => s.trim()).filter(Boolean)
}
