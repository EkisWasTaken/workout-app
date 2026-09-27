import { describe, expect, it } from 'vitest'
import { TARGET_ZONES, isFreeformTarget, zoneOptionFor } from './targetZones'
import { matchZone } from './vdot'
import { paceParts } from './paceAdvice'
import type { Workout } from '@/types'

const workout = (targetPace: string): Workout =>
	({ id: 1, date: '2026-10-05', name: 'Session', targetPace } as Workout)

describe('TARGET_ZONES', () => {
	// The entire contract: a label the schedule can't place derives no pace.
	it('offers only labels the pace engine recognises', () => {
		for (const zone of TARGET_ZONES) {
			expect(matchZone(zone.value), zone.value).not.toBeNull()
		}
	})

	it('offers labels that survive the round trip through paceParts as a bare zone', () => {
		for (const zone of TARGET_ZONES) {
			const parts = paceParts(workout(zone.value))
			expect(parts, zone.value).not.toBeNull()
			expect(parts!.zone).toBe(zone.value)
			// No digits, so nothing is treated as a written-in pace.
			expect(parts!.value).toBeNull()
		}
	})

	it('has exactly one race-pace entry, and it resolves against the goal', () => {
		const racey = TARGET_ZONES.filter(z => matchZone(z.value) === 'marathon')
		expect(racey).toHaveLength(1)
		expect(racey[0].value).toBe('Race pace')
	})

	it('has no duplicate values', () => {
		const values = TARGET_ZONES.map(z => z.value)
		expect(new Set(values).size).toBe(values.length)
	})
})

describe('zoneOptionFor', () => {
	it('finds a zone the picker wrote, whatever the casing', () => {
		expect(zoneOptionFor('Threshold')?.value).toBe('Threshold')
		expect(zoneOptionFor('threshold')?.value).toBe('Threshold')
		expect(zoneOptionFor('  Easy  ')?.value).toBe('Easy')
	})

	it('is null for nothing at all', () => {
		expect(zoneOptionFor('')).toBeNull()
		expect(zoneOptionFor(null)).toBeNull()
		expect(zoneOptionFor(undefined)).toBeNull()
	})

	it('leaves a written-out prescription alone', () => {
		expect(zoneOptionFor('E 6:00-6:20/km; strides 6-8x100 m')).toBeNull()
		expect(zoneOptionFor('Threshold 4:45–4:55/km')).toBeNull()
	})

	it('does not quietly turn the marathon zone into race pace', () => {
		// They share a zone key but not a meaning: race pace comes from the goal,
		// the marathon zone from current fitness.
		expect(zoneOptionFor('Marathon')).toBeNull()
	})
})

describe('isFreeformTarget', () => {
	it('is true only for text the picker cannot own', () => {
		expect(isFreeformTarget('Easy')).toBe(false)
		expect(isFreeformTarget('')).toBe(false)
		expect(isFreeformTarget(undefined)).toBe(false)
		expect(isFreeformTarget('4:30/km alternating')).toBe(true)
	})
})
