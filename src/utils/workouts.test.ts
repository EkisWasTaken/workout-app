import { describe, expect, it } from 'vitest'
import { canonicalWorkoutType, getWorkoutType, gymSplit } from './workouts'
import type { Workout } from '@/types'

const w = (over: Partial<Workout>): Workout =>
	({ id: 1, date: '2026-10-05', name: 'Session', ...over } as Workout)

describe('canonicalWorkoutType', () => {
	// The edit dialog's <select> matches its options exactly, so the casing the
	// database happens to hold has to be normalised before it gets there.
	it('returns the casing the forms use', () => {
		expect(canonicalWorkoutType(w({ type: 'gym' }))).toBe('Gym')
		expect(canonicalWorkoutType(w({ type: 'Gym' }))).toBe('Gym')
		expect(canonicalWorkoutType(w({ type: 'GYM' }))).toBe('Gym')
		expect(canonicalWorkoutType(w({ type: 'running' }))).toBe('Running')
		expect(canonicalWorkoutType(w({ type: 'Bike' }))).toBe('Bike')
	})

	it('maps the aliases the importer accepts onto the same labels', () => {
		expect(canonicalWorkoutType(w({ type: 'strength' }))).toBe('Gym')
		expect(canonicalWorkoutType(w({ type: 'run' }))).toBe('Running')
		expect(canonicalWorkoutType(w({ type: 'cycling' }))).toBe('Bike')
		expect(canonicalWorkoutType(w({ type: 'rest day' }))).toBe('Rest')
	})

	it('falls back to the name when there is no type, like getWorkoutType does', () => {
		expect(canonicalWorkoutType(w({ name: 'Easy run' }))).toBe('Running')
		expect(canonicalWorkoutType(w({ name: 'Push day at the gym' }))).toBe('Gym')
		expect(canonicalWorkoutType(w({ name: 'Something else' }))).toBe('Other')
	})

	it('always returns one of the options the form offers', () => {
		const options = ['Running', 'Gym', 'Bike', 'Rest', 'Other']
		for (const type of ['gym', 'Gym', 'run', 'RUNNING', 'cycle', 'rest', 'other', 'nonsense', '']) {
			expect(options, type).toContain(canonicalWorkoutType(w({ type, name: 'Untitled' })))
		}
	})

	it('agrees with getWorkoutType', () => {
		for (const type of ['gym', 'Running', 'bike', 'rest', 'other']) {
			const one = w({ type })
			expect(canonicalWorkoutType(one).toLowerCase()).toBe(getWorkoutType(one))
		}
	})
})

describe('gymSplit', () => {
	it('collapses however a split is written', () => {
		expect(gymSplit('Push')).toBe('Push')
		expect(gymSplit('push (deload)')).toBe('Push')
		expect(gymSplit('Leg day')).toBe('Legs')
	})

	it('keeps an unrecognised split under its own name', () => {
		expect(gymSplit('upper')).toBe('Upper')
	})

	it('falls back to Other when there is nothing to go on', () => {
		expect(gymSplit('')).toBe('Other')
		expect(gymSplit(null)).toBe('Other')
	})
})
