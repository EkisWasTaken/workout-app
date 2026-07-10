/**
 * The pace to show on a planned session.
 *
 * Paces are *derived*, never stored. A session records its zone ("Easy",
 * "Threshold", "Race pace"); the number is computed at render time. Change a
 * goal, or get fitter, and the whole schedule updates — no rewriting the plan.
 *
 * Two sources, and conflating them is the trap:
 *
 *   Easy, recovery, threshold, VO₂, reps  →  your CURRENT fitness.
 *     The paces your body can absorb today. Prescribing them from an ambitious
 *     goal turns easy days into tempos.
 *
 *   Race-pace sessions                    →  the GOAL that session trains for.
 *     Rehearsing goal pace is the entire point of a race-pace workout.
 *
 * When a session's zone can't be recognised — legacy rows carrying a whole
 * prescription in the field, like "E 6:00-6:20/km; strides 6-8x100 m" — the
 * written text is shown verbatim and nothing is derived.
 */
import type { Workout } from '@/types'
import {
	paceTable, matchZone, racePaceSecPerKm, fmtPace, fmtPaceRange, type ZoneKey,
} from './vdot'

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
	return key === 'marathon' && /race pace|goal/i.test(zoneLabel)
}

/** The goal a session on `date` is training for, resolved by the caller. */
export interface GoalAtDate {
	vdot: number
	distanceM: number
	name: string
}

export interface PaceSources {
	/** VDOT you can race today. Drives every training zone. */
	currentVdot: number | null
	/** The next dated goal on or after a session's date. Drives race-pace sessions. */
	goalFor: (date: string) => GoalAtDate | null
}

export type PaceBasis = 'fitness' | 'goal' | 'planned'

export interface SessionPace {
	/** Zone name to show ("Easy", "Lidingöloppet pace", or the raw label). */
	zone: string
	/** The pace itself: a range for training zones, a single value for race pace. */
	value: string
	basis: PaceBasis
	/** Human explanation of where the number came from. */
	explain: string
}

/**
 * The pace for this session. Null when the workout carries no pace at all.
 *
 * Falls back to the written text whenever the zone is unrecognised, or the VDOT
 * that zone depends on is unknown — better a stale number than a wrong one.
 */
export function sessionPace(workout: Workout, sources: PaceSources): SessionPace | null {
	const parts = paceParts(workout)
	if (!parts) return null

	const planned = (): SessionPace => ({
		zone: parts.zone === 'Target' ? 'Planned' : parts.zone,
		value: parts.value,
		basis: 'planned',
		explain: 'Written on the session. No zone recognised, so nothing is derived.',
	})

	const key = matchZone(parts.zone)
	if (!key) return planned()

	if (isRacePaceZone(parts.zone, key)) {
		const goal = sources.goalFor(workout.date)
		if (!goal) return planned()
		const pace = racePaceSecPerKm(goal.vdot, goal.distanceM)
		return {
			zone: `${goal.name} pace`,
			value: fmtPace(pace),
			basis: 'goal',
			explain: `From your ${goal.name} goal (VDOT ${goal.vdot}). Change the goal and this changes with it.`,
		}
	}

	if (sources.currentVdot === null) return planned()
	const zone = paceTable(sources.currentVdot).find(z => z.key === key)!
	return {
		zone: zone.label,
		value: fmtPaceRange(zone),
		basis: 'fitness',
		explain: `From your current fitness (VDOT ${sources.currentVdot}) — the pace you can absorb today, not a goal pace.`,
	}
}
