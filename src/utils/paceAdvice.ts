/**
 * Pace advice for a planned session.
 *
 * Two different VDOTs feed this, and conflating them is the whole trap:
 *
 *   Easy, recovery, threshold, VO₂, reps  →  your CURRENT fitness.
 *     These are the paces your body can absorb today. Prescribing them from an
 *     ambitious goal turns easy days into tempos.
 *
 *   Race-pace sessions                    →  the ACTIVE GOAL's VDOT.
 *     Rehearsing goal pace is the entire point of a race-pace workout.
 *
 * The pace written on the session always wins. This only surfaces drift.
 */
import type { Workout } from '@/types'
import {
	paceTable, paceMid, matchZone, parsePaceValue, racePaceSecPerKm,
	fmtPace, fmtPaceRange, type ZoneKey,
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

/** A race-pace session rehearses the goal; every other zone trains current fitness. */
export function isRacePaceZone(zoneLabel: string, key: ZoneKey): boolean {
	return key === 'marathon' && /race pace/i.test(zoneLabel)
}

export interface DerivedPace {
	/** The implied pace, formatted — a range, or a single value for race pace. */
	label: string
	/** Seconds per km the derived pace is slower (+) or faster (−) than the written one. */
	delta: number
	/** Which VDOT this came from, so the tooltip can say why. */
	basis: 'current' | 'goal'
}

export interface PaceSources {
	/** VDOT you can race today. Drives every training zone. */
	currentVdot: number | null
	/** VDOT of the target you're training for. Drives race-pace sessions only. */
	goalVdot: number | null
	/** Distance of that target, metres — so "30k race pace" resolves properly. */
	goalDistanceM: number | null
}

/**
 * The pace this session's zone implies, when it differs from the written pace by
 * at least PACE_DRIFT_THRESHOLD_S. Null when there's no basis, no recognisable
 * zone, no parseable written pace, or the two already agree.
 */
export function derivedPaceFor(workout: Workout, sources: PaceSources): DerivedPace | null {
	const parts = paceParts(workout)
	if (!parts) return null

	const key = matchZone(parts.zone)
	if (!key) return null

	const written = parsePaceValue(parts.value)
	if (written === null) return null

	const racePace = isRacePaceZone(parts.zone, key)
	const basis: 'current' | 'goal' = racePace ? 'goal' : 'current'
	const vdot = racePace ? sources.goalVdot : sources.currentVdot
	if (vdot === null) return null

	let derivedMid: number
	let label: string

	if (racePace && sources.goalDistanceM) {
		derivedMid = racePaceSecPerKm(vdot, sources.goalDistanceM)
		label = fmtPace(derivedMid)
	} else {
		const zone = paceTable(vdot).find(z => z.key === key)!
		derivedMid = paceMid(zone)
		label = fmtPaceRange(zone)
	}

	const delta = derivedMid - written
	return Math.abs(delta) >= PACE_DRIFT_THRESHOLD_S ? { label, delta, basis } : null
}
