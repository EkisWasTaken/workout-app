import { describe, it, expect } from 'vitest'
import { paceParts, sessionPace, isRacePaceZone, type PaceSources, type GoalAtDate } from './paceAdvice'
import type { Workout } from '@/types'

const w = (targetPace?: string, date = '2026-07-10'): Workout =>
	({ id: 1, date, name: 'S', targetPace }) as Workout

const FIVE_K: GoalAtDate = { vdot: 49.9, distanceM: 5000, name: '5 km' }
const LIDINGO: GoalAtDate = { vdot: 44.6, distanceM: 30000, name: 'Lidingöloppet' }

/** Current fitness 44.9; a 5k goal in August, a 30k in September. */
const SOURCES: PaceSources = {
	currentVdot: 44.9,
	goalFor: (date) => (date <= '2026-08-08' ? FIVE_K : date <= '2026-09-26' ? LIDINGO : null),
}

describe('paceParts', () => {
	it('splits zone from value', () => {
		expect(paceParts(w('Threshold 4:45–4:55/km'))).toEqual({ zone: 'Threshold', value: '4:45–4:55' })
	})
	it('leaves an unparseable prescription whole', () => {
		const raw = 'E 6:00-6:20/km; strides 6-8x100 m'
		expect(paceParts(w(raw))).toEqual({ zone: 'Target', value: raw })
	})
	it('is null with no pace', () => {
		expect(paceParts(w())).toBeNull()
	})
})

describe('isRacePaceZone', () => {
	it('fires for race-pace and goal labels only', () => {
		expect(isRacePaceZone('30k race pace', 'marathon')).toBe(true)
		expect(isRacePaceZone('Goal', 'marathon')).toBe(true)
		expect(isRacePaceZone('Marathon', 'marathon')).toBe(false)
		expect(isRacePaceZone('Threshold', 'threshold')).toBe(false)
	})
})

describe('sessionPace — which VDOT drives which zone', () => {
	it('derives easy pace from CURRENT fitness, not the goal', () => {
		const p = sessionPace(w('Easy 5:45–6:15/km'), SOURCES)!
		expect(p.basis).toBe('fitness')
		expect(p.zone).toBe('Easy')
		expect(p.value).toBe('5:29–6:08')            // VDOT 44.9, not the sub-20 goal's 49.9
		expect(p.explain).toMatch(/current fitness/)
	})

	it('derives threshold and VO₂ from current fitness too', () => {
		expect(sessionPace(w('Threshold 4:45–4:55/km'), SOURCES)!.basis).toBe('fitness')
		expect(sessionPace(w('Intervals 4:20–4:30/km'), SOURCES)!.basis).toBe('fitness')
	})

	it('derives a race-pace session from the goal it trains for', () => {
		const p = sessionPace(w('Goal 4:00–4:20/km', '2026-08-01'), SOURCES)!
		expect(p.basis).toBe('goal')
		expect(p.zone).toBe('5 km pace')
		expect(p.value).toBe('4:00')                 // 19:59 over 5 km
	})

	/** A September session must rehearse September's race, not August's 5k. */
	it('picks the goal that follows the session date, not the soonest goal overall', () => {
		const sept = sessionPace(w('Race pace 5:00–5:10/km', '2026-09-01'), SOURCES)!
		expect(sept.zone).toBe('Lidingöloppet pace')
		const aug = sessionPace(w('Race pace 5:00–5:10/km', '2026-08-01'), SOURCES)!
		expect(aug.zone).toBe('5 km pace')
	})

	it('re-derives when the goal changes — the whole point', () => {
		const slower: PaceSources = { ...SOURCES, goalFor: () => ({ ...FIVE_K, vdot: 44.1 }) }
		const a = sessionPace(w('Goal 4:00–4:20/km'), SOURCES)!.value
		const b = sessionPace(w('Goal 4:00–4:20/km'), slower)!.value
		expect(a).not.toBe(b)
		expect(b > a).toBe(true)                     // an easier goal is a slower pace
	})

	it('re-derives when fitness changes', () => {
		const fitter: PaceSources = { ...SOURCES, currentVdot: 49.9 }
		expect(sessionPace(w('Easy 5:45–6:15/km'), fitter)!.value)
			.not.toBe(sessionPace(w('Easy 5:45–6:15/km'), SOURCES)!.value)
	})
})

describe('sessionPace — falling back to what was written', () => {
	it('shows a legacy prescription verbatim', () => {
		const raw = 'E 6:00-6:20/km; strides 6-8x100 m'
		const p = sessionPace(w(raw), SOURCES)!
		expect(p.basis).toBe('planned')
		expect(p.value).toBe(raw)
		expect(p.zone).toBe('Planned')
	})

	it('falls back when current fitness is unknown', () => {
		const p = sessionPace(w('Easy 5:45–6:15/km'), { ...SOURCES, currentVdot: null })!
		expect(p.basis).toBe('planned')
		expect(p.value).toBe('5:45–6:15')
	})

	it('falls back when no goal covers a race-pace session', () => {
		const p = sessionPace(w('Goal 4:00–4:20/km', '2027-01-01'), SOURCES)!
		expect(p.basis).toBe('planned')
		expect(p.value).toBe('4:00–4:20')
	})

	it('a missing goal does not silence ordinary zones', () => {
		const p = sessionPace(w('Easy 5:45–6:15/km'), { currentVdot: 44.9, goalFor: () => null })!
		expect(p.basis).toBe('fitness')
	})

	it('is null for sessions with no pace at all', () => {
		expect(sessionPace(w(), SOURCES)).toBeNull()
	})
})
