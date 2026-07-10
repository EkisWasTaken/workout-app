import { describe, it, expect } from 'vitest'
import { buildActivityIndex, resolveActivity, effectiveWorkoutType, effectiveDistanceKm } from './workoutSport'
import type { Workout } from '@/types'

const w = (over: Partial<Workout>): Workout =>
	({ id: 1, date: '2026-04-05', name: 'S', ...over }) as Workout

const act = (over: Record<string, any>) => ({
	id: 1, sport_type: 'Run', start_date_local: '2026-04-05', distance: 18000, ...over,
})

describe('resolveActivity', () => {
	it('matches on stravaActivityId when it points at an imported activity', () => {
		const idx = buildActivityIndex([act({ id: 42, start_date_local: '2026-01-01' })])
		const found = resolveActivity(w({ type: 'Bike', stravaActivityId: 42 as any, date: '2026-01-01' }), idx)
		expect(found?.id).toBe(42)
	})

	it('falls back to the same date when the id is a dead Strava id', () => {
		const idx = buildActivityIndex([act({ id: 7 })])
		// 17045921530.0 is one of the pre-migration Strava ids: it resolves to nothing.
		const found = resolveActivity(w({ type: 'Bike', stravaActivityId: '17045921530.0' as any }), idx)
		expect(found?.id).toBe(7)
	})

	it('never resolves a gym or rest workout', () => {
		const idx = buildActivityIndex([act({ id: 7 })])
		expect(resolveActivity(w({ type: 'Gym' }), idx)).toBeNull()
		expect(resolveActivity(w({ type: 'Rest' }), idx)).toBeNull()
	})

	it('picks the closest distance when two activities share a date', () => {
		const idx = buildActivityIndex([
			act({ id: 1, distance: 8000 }),
			act({ id: 2, sport_type: 'Ride', distance: 40000 }),
		])
		expect(resolveActivity(w({ type: 'Bike', distance: 38 }), idx)?.id).toBe(2)
		expect(resolveActivity(w({ type: 'running', distance: 8.1 }), idx)?.id).toBe(1)
	})

	it('is null when nothing was recorded that day', () => {
		const idx = buildActivityIndex([act({ start_date_local: '2026-04-06' })])
		expect(resolveActivity(w({ type: 'running' }), idx)).toBeNull()
	})
})

describe('effectiveWorkoutType', () => {
	it('corrects a run that was typed Bike', () => {
		// "Långlöp" (long run), typed Bike, recorded by the watch as a Run.
		const idx = buildActivityIndex([act({ sport_type: 'Run' })])
		expect(effectiveWorkoutType(w({ name: 'Långlöp', type: 'Bike' }), idx)).toBe('running')
	})

	it('corrects a ride that was typed running', () => {
		const idx = buildActivityIndex([act({ sport_type: 'Ride', distance: 31164 })])
		expect(effectiveWorkoutType(w({ name: 'Troskel 20min', type: 'running', distance: 31.164 }), idx)).toBe('bike')
	})

	it('keeps the declared type when there is no recording', () => {
		const idx = buildActivityIndex([])
		expect(effectiveWorkoutType(w({ name: 'Långlöp', type: 'Bike' }), idx)).toBe('bike')
		expect(effectiveWorkoutType(w({ name: 'Easy run', type: 'running' }), idx)).toBe('running')
	})

	it('leaves gym and rest alone even when an activity shares the date', () => {
		const idx = buildActivityIndex([act({ sport_type: 'Run' })])
		expect(effectiveWorkoutType(w({ name: 'Push', type: 'Gym' }), idx)).toBe('gym')
		expect(effectiveWorkoutType(w({ name: 'Rest', type: 'Rest' }), idx)).toBe('rest')
	})

	it('keeps the declared type when the recording is neither run nor ride', () => {
		const idx = buildActivityIndex([act({ sport_type: 'Swim' })])
		expect(effectiveWorkoutType(w({ name: 'Easy', type: 'running' }), idx)).toBe('running')
	})
})

describe('effectiveDistanceKm', () => {
	it('prefers the recorded distance over the typed one', () => {
		const idx = buildActivityIndex([act({ distance: 8014 })])
		expect(effectiveDistanceKm(w({ type: 'running', distance: 8 }), idx)).toBe(8.01)
	})

	it('falls back to the typed distance with no recording', () => {
		expect(effectiveDistanceKm(w({ type: 'running', distance: 12 }), buildActivityIndex([]))).toBe(12)
	})

	it('is undefined when neither exists', () => {
		expect(effectiveDistanceKm(w({ type: 'running' }), buildActivityIndex([]))).toBeUndefined()
	})
})
