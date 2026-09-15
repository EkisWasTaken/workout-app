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
 * Read a live palette colour out of the stylesheet, so charts drawn in JS use
 * the same tokens as the CSS rather than a second, drifting copy of the hexes.
 *
 * getComputedStyle forces a style recalc, and this is called once per workout
 * chip inside render loops — so results are memoised. Call `clearSportColorCache`
 * after writing new colors to the document.
 */
const colorCache = new Map<string, string>()

export function cssColor(name: string, fallback: string): string {
	const hit = colorCache.get(name)
	if (hit !== undefined) return hit

	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
	colorCache.set(name, v)
	return v
}

export function getSportColor(type: SportType): string {
	return cssColor(`--color-${type}-primary`, '#94a3b8')
}

export function clearSportColorCache(): void {
	colorCache.clear()
}

export const isDistanceSport = (type: SportType) => type === 'running' || type === 'bike'

/**
 * Normalise a gym workout's free-text `gymType` into a split label for stats.
 * Push/Pull/Legs are recognised however they're written; anything else keeps
 * its own name (title-cased), and a blank falls back to "Other".
 */
export function gymSplit(gymType?: string | null): string {
	const t = (gymType || '').trim().toLowerCase()
	if (!t) return 'Other'
	if (t.includes('push')) return 'Push'
	if (t.includes('pull')) return 'Pull'
	if (t.includes('leg')) return 'Legs'
	return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Break a workout's notes into readable steps for a "session plan" list. */
export function noteSteps(workout: Workout): string[] {
	const raw = (workout.notes || '').trim()
	if (!raw) return []
	return raw.split(/(?<=[.!?])\s+(?=[A-Z0-9🎯🏁])/).map(s => s.trim()).filter(Boolean)
}
