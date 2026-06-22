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

/** Read the live CSS variable for a sport color (set from the DB at runtime). */
export function getSportColor(type: SportType): string {
	const v = getComputedStyle(document.documentElement)
		.getPropertyValue(`--color-${type}-primary`)
		.trim()
	return v || '#9aa7b8'
}

export const isDistanceSport = (type: SportType) => type === 'running' || type === 'bike'
