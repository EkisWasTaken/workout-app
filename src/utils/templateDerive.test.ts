import { describe, it, expect } from 'vitest'
import { templatesFromWorkoutRows, type WorkoutRowLike } from './templateDerive'

// A slice of the real workout_schedule.csv shape, with the repeats + variants it contains.
const rows: WorkoutRowLike[] = [
	{ name: 'Push', type: 'gym', gymType: 'Push', duration: '55', notes: 'Push — bench…' },
	{ name: 'Easy run', type: 'running', targetPace: 'Easy 5:45–6:15/km', duration: '42', distance: '7' },
	{ name: 'Legs', type: 'gym', gymType: 'Legs', duration: '55', notes: 'Legs — squat…' },
	{ name: 'Easy bike (cross-train)', type: 'cycling', duration: '50', notes: 'Easy spin.' },
	{ name: 'Rest', type: 'rest', duration: '0', notes: 'Full rest.' },
	{ name: 'Long run 18k', type: 'running', targetPace: 'Easy 5:45–6:15/km', duration: '108', distance: '18', notes: 'Ease in…' },
	{ name: 'Long run 22k', type: 'running', targetPace: 'Easy 5:45–6:15/km', duration: '132', distance: '22', notes: 'Even effort…' },
	// Gym variants that must collapse into their base split:
	{ name: 'Push (light)', type: 'gym', gymType: 'Push', duration: '35', notes: 'Deload.' },
	{ name: 'Legs (deload)', type: 'gym', gymType: 'Legs', duration: '40', notes: 'Deload.' },
	// Exact repeats:
	{ name: 'Easy run', type: 'running', targetPace: 'Easy 5:45–6:15/km', duration: '48', distance: '8' },
]

describe('templatesFromWorkoutRows', () => {
	it('collapses gym sessions by split but keeps distance sessions by full name', () => {
		const out = templatesFromWorkoutRows(rows)
		expect(out.map(t => t.name)).toEqual([
			'Push', 'Easy run', 'Legs', 'Easy bike (cross-train)', 'Long run 18k', 'Long run 22k',
		])
	})

	it('names gym templates by the clean split, dropping "(light)"/"(deload)"', () => {
		const gym = templatesFromWorkoutRows(rows).filter(t => t.kind === 'gym')
		expect(gym.map(t => t.name)).toEqual(['Push', 'Legs'])
		expect(gym.every(t => t.workout_type === t.name)).toBe(true)
	})

	it('keeps each long run distinct with its own distance and notes', () => {
		const byName = Object.fromEntries(templatesFromWorkoutRows(rows).map(t => [t.name, t]))
		expect(byName['Long run 18k'].distance).toBe(18)
		expect(byName['Long run 22k'].distance).toBe(22)
		expect(byName['Long run 18k'].notes).toContain('Ease in')
	})

	it('maps sport → template kind', () => {
		const byName = Object.fromEntries(templatesFromWorkoutRows(rows).map(t => [t.name, t]))
		expect(byName['Push'].kind).toBe('gym')
		expect(byName['Easy run'].kind).toBe('run')
		expect(byName['Easy bike (cross-train)'].kind).toBe('bike')
	})

	it('puts pace/distance on runs, not on gym splits', () => {
		const byName = Object.fromEntries(templatesFromWorkoutRows(rows).map(t => [t.name, t]))
		expect(byName['Push'].target_pace).toBeNull()
		expect(byName['Easy run'].target_pace).toBe('Easy 5:45–6:15/km')
		expect(byName['Easy run'].distance).toBe(7)
	})

	it('skips sessions already in the library (matched by the same dedup key)', () => {
		const out = templatesFromWorkoutRows(rows, [
			{ name: 'Push', kind: 'gym', workout_type: 'Push' },
			{ name: 'Long run 18k', kind: 'run' },
		])
		expect(out.map(t => t.name)).toEqual([
			'Easy run', 'Legs', 'Easy bike (cross-train)', 'Long run 22k',
		])
	})

	it('ignores rows without a name', () => {
		expect(templatesFromWorkoutRows([{ type: 'running' }, { name: '  ', type: 'gym' }])).toEqual([])
	})
})
