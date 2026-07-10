/**
 * Comparing the pace written on a planned session against the pace your goal
 * implies. The written pace is always authoritative — this only surfaces drift.
 */
import type { Workout } from '@/types'
import {
	paceTable, paceMid, matchZone, parsePaceValue, racePaceSecPerKm,
	fmtPace, fmtPaceRange,
} from './vdot'

/** Below this, the two paces agree closely enough to be worth staying quiet about. */
export const PACE_DRIFT_THRESHOLD_S = 5

/** Split a target-pace string ("Threshold 4:45–4:55/km") into a zone and a value. */
export function paceParts(workout: Workout): { zone: string; value: string } | null {
	const raw = (workout.targetPace || '').trim()
	if (!raw) return null
	const m = raw.match(/^(.+?)\s+([\d:]+(?:[–-][\d:]+)?)\s*\/?\s*km$/)
	if (m) return { zone: m[1].trim(), value: m[2] }
	return { zone: 'Target', value: raw }
}

export interface DerivedPace {
	/** The goal-implied pace, formatted — a range, or a single value for race pace. */
	label: string
	/** Seconds per km the derived pace is slower (+) or faster (−) than the written one. */
	delta: number
}

/**
 * The pace `goalVdot` implies for this session's zone, when it differs from the
 * written pace by at least PACE_DRIFT_THRESHOLD_S. Null when there's no goal, no
 * recognisable zone, no parseable written pace, or the two already agree.
 *
 * `raceKm` lets "30k race pace" resolve against the actual goal race rather than
 * falling back to the generic marathon zone.
 */
export function derivedPaceFor(
	workout: Workout,
	goalVdot: number | null,
	raceKm: number | null,
): DerivedPace | null {
	if (goalVdot === null) return null

	const parts = paceParts(workout)
	if (!parts) return null

	const key = matchZone(parts.zone)
	if (!key) return null

	const written = parsePaceValue(parts.value)
	if (written === null) return null

	const isRacePace = key === 'marathon' && /race pace/i.test(parts.zone) && raceKm !== null
	let derivedMid: number
	let label: string

	if (isRacePace) {
		derivedMid = racePaceSecPerKm(goalVdot, raceKm! * 1000)
		label = fmtPace(derivedMid)
	} else {
		const zone = paceTable(goalVdot).find(z => z.key === key)!
		derivedMid = paceMid(zone)
		label = fmtPaceRange(zone)
	}

	const delta = derivedMid - written
	return Math.abs(delta) >= PACE_DRIFT_THRESHOLD_S ? { label, delta } : null
}
