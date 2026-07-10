import { describe, it, expect } from 'vitest'
import { activitySport } from './activityStats'

describe('activitySport', () => {
	it.each([
		['Run', 'run'], ['Ride', 'ride'], ['Walk', 'walk'],
		['Hike', 'hike'], ['Swim', 'swim'], ['Workout', 'other'], ['WeightTraining', 'other'],
	])('maps %s to %s', (sport_type, expected) => {
		expect(activitySport({ sport_type })).toBe(expected)
	})

	it('falls back to `type` and is case-insensitive', () => {
		expect(activitySport({ type: 'ride' })).toBe('ride')
		expect(activitySport({ sport_type: 'RUN' })).toBe('run')
	})

	it('never guesses a sport from the activity name', () => {
		// "Vätternrundan" is a bike ride whose name contains "run".
		expect(activitySport({ sport_type: 'Ride', name: 'Vätternrundan' })).toBe('ride')
		// And a run must not become a ride because it is called "Långlöp".
		expect(activitySport({ sport_type: 'Run', name: 'Långlöp' })).toBe('run')
	})

	it('is other for a missing sport', () => {
		expect(activitySport({})).toBe('other')
		expect(activitySport(null)).toBe('other')
	})
})
