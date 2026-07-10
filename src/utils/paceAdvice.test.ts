import { describe, it, expect } from 'vitest'
import { paceParts, derivedPaceFor, isRacePaceZone, type PaceSources } from './paceAdvice'
import type { Workout } from '@/types'

const w = (targetPace?: string): Workout =>
	({ id: 1, date: '2026-07-10', name: 'S', targetPace }) as Workout

/** Current fitness 44.1 (his 1:42 half); goal 49.8 (sub-20 5k). */
const SOURCES: PaceSources = { currentVdot: 44.1, goalVdot: 49.8, goalDistanceM: 5000 }

describe('paceParts', () => {
	it('splits zone from value', () => {
		expect(paceParts(w('Threshold 4:45–4:55/km'))).toEqual({ zone: 'Threshold', value: '4:45–4:55' })
	})
	it('falls back to a bare target', () => {
		expect(paceParts(w('5:30'))).toEqual({ zone: 'Target', value: '5:30' })
	})
	it('is null with no pace', () => {
		expect(paceParts(w())).toBeNull()
	})
})

describe('isRacePaceZone', () => {
	it('only fires for an explicit race-pace label', () => {
		expect(isRacePaceZone('30k race pace', 'marathon')).toBe(true)
		expect(isRacePaceZone('Marathon', 'marathon')).toBe(false)
		expect(isRacePaceZone('Threshold', 'threshold')).toBe(false)
	})
})

describe('derivedPaceFor — which VDOT drives which zone', () => {
	it('easy runs come from CURRENT fitness, not the goal', () => {
		// Written 5:45–6:15 (mid 6:00). Current 44.1 => easy mid ~5:54, only 6s off.
		const d = derivedPaceFor(w('Easy 5:45–6:15/km'), SOURCES)!
		expect(d.basis).toBe('current')
		// The sub-20 goal would have demanded ~5:21 — nearly 40 s/km faster.
		const fromGoal = derivedPaceFor(w('Easy 5:45–6:15/km'), { ...SOURCES, currentVdot: 49.8 })!
		expect(Math.abs(fromGoal.delta)).toBeGreaterThan(Math.abs(d.delta) + 25)
	})

	it('threshold comes from current fitness', () => {
		const d = derivedPaceFor(w('Threshold 5:30/km'), SOURCES)!
		expect(d.basis).toBe('current')
	})

	it('a race-pace session comes from the GOAL, at the goal distance', () => {
		const d = derivedPaceFor(w('5k race pace 4:30/km'), SOURCES)!
		expect(d.basis).toBe('goal')
		expect(d.label).toBe('4:00')          // 20:00 over 5 km
		expect(d.delta).toBe(-30)             // 30 s/km faster than written
	})

	it('resolves race pace against the goal distance, not the marathon zone', () => {
		const at30k = derivedPaceFor(w('30k race pace 5:30/km'), { currentVdot: 44.1, goalVdot: 44.1, goalDistanceM: 30000 })!
		const at5k = derivedPaceFor(w('5k race pace 5:30/km'), { currentVdot: 44.1, goalVdot: 44.1, goalDistanceM: 5000 })!
		expect(at30k.label).not.toBe(at5k.label)
		expect(at5k.label < at30k.label).toBe(true)   // 5k pace is quicker
	})

	it('stays quiet when the written pace already agrees', () => {
		// Current 44.1 threshold mid is 4:49; writing 4:45–4:55 (mid 4:50) is 1s off.
		expect(derivedPaceFor(w('Threshold 4:45–4:55/km'), SOURCES)).toBeNull()
	})

	it('is null for a training zone when current fitness is unknown', () => {
		expect(derivedPaceFor(w('Easy 5:45–6:15/km'), { ...SOURCES, currentVdot: null })).toBeNull()
	})

	it('is null for a race-pace session when no goal is set', () => {
		expect(derivedPaceFor(w('5k race pace 4:30/km'), { ...SOURCES, goalVdot: null })).toBeNull()
	})

	it('a missing goal does not silence ordinary zones', () => {
		const d = derivedPaceFor(w('Easy 5:00/km'), { currentVdot: 44.1, goalVdot: null, goalDistanceM: null })
		expect(d).not.toBeNull()
		expect(d!.basis).toBe('current')
	})

	it('ignores gym sessions and unlabelled paces', () => {
		expect(derivedPaceFor(w(), SOURCES)).toBeNull()
		expect(derivedPaceFor(w('Push day'), SOURCES)).toBeNull()
	})
})
