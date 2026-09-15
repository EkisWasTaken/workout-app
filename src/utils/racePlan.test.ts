import { describe, it, expect } from 'vitest'
import {
	racePlan, checkGoal, defaultSegmentM, raceWeekNote, fmtKm, SPLIT_FRACTION,
} from './racePlan'

const HALF = 21097
const total = (p: NonNullable<ReturnType<typeof racePlan>>) =>
	p.segments.reduce((s, x) => s + x.splitSecs, 0)

describe('racePlan', () => {
	it('rejects inputs that cannot be paced', () => {
		expect(racePlan(0, 6300)).toBeNull()
		expect(racePlan(10000, 0)).toBeNull()
		expect(racePlan(10000, 2400, 'even', 0)).toBeNull()
	})

	it('splits add up to the goal time exactly', () => {
		for (const strategy of ['even', 'negative', 'positive'] as const) {
			const p = racePlan(HALF, 6300, strategy, 1000)!
			expect(total(p)).toBeCloseTo(6300, 6)
			expect(p.segments[p.segments.length - 1]!.elapsedSecs).toBeCloseTo(6300, 6)
		}
	})

	it('covers the full distance, with a short final segment on odd distances', () => {
		const p = racePlan(HALF, 6300, 'even', 5000)!
		expect(p.segments[p.segments.length - 1]!.atM).toBe(HALF)
		expect(p.segments[p.segments.length - 1]!.lengthM).toBe(HALF - 20000)
		expect(p.segments.map(s => s.index)).toEqual([1, 2, 3, 4, 5])
	})

	it('holds one pace throughout on an even plan', () => {
		const p = racePlan(10000, 2400, 'even', 1000)!
		const paces = p.segments.map(s => Math.round(s.paceSecPerKm))
		expect(new Set(paces).size).toBe(1)
		expect(paces[0]).toBe(240)
	})

	it('starts slow and finishes fast on a negative split', () => {
		const p = racePlan(10000, 2400, 'negative', 1000)!
		const first = p.segments[0].paceSecPerKm
		const last = p.segments[p.segments.length - 1]!.paceSecPerKm
		expect(first).toBeGreaterThan(p.avgPaceSecPerKm)
		expect(last).toBeLessThan(p.avgPaceSecPerKm)
		// Monotonically getting faster, never a step backwards.
		for (let i = 1; i < p.segments.length; i++) {
			expect(p.segments[i].paceSecPerKm).toBeLessThan(p.segments[i - 1].paceSecPerKm)
		}
	})

	it('mirrors the negative split when told to fade', () => {
		const neg = racePlan(10000, 2400, 'negative', 1000)!
		const pos = racePlan(10000, 2400, 'positive', 1000)!
		const avg = neg.avgPaceSecPerKm
		expect(pos.segments[0].paceSecPerKm - avg).toBeCloseTo(avg - neg.segments[0].paceSecPerKm, 6)
	})

	it('spreads the opening offset by the configured fraction', () => {
		const p = racePlan(10000, 2400, 'negative', 1000)!
		// Opening pace sits SPLIT_FRACTION above average; the band brackets it.
		const opening = p.avgPaceSecPerKm * (1 + SPLIT_FRACTION)
		expect(p.openingBand[0]).toBeCloseTo(opening - 3, 6)
		expect(p.openingBand[1]).toBeCloseTo(opening + 3, 6)
		expect(p.openingBand[0]).toBeLessThan(p.openingBand[1])
	})

	it('puts halfway behind schedule on a negative split and level on an even one', () => {
		const even = racePlan(10000, 2400, 'even', 1000)!
		expect(even.halfwaySecs).toBeCloseTo(1200, 6)

		const neg = racePlan(10000, 2400, 'negative', 1000)!
		expect(neg.halfwaySecs).toBeGreaterThan(1200)
		// Slower first half, but only by a handful of seconds.
		expect(neg.halfwaySecs - 1200).toBeLessThan(15)
	})

	it('interpolates halfway when it falls inside a segment', () => {
		// 5 km blocks over a half marathon: halfway (10.5 km) is mid-block.
		const p = racePlan(HALF, 6300, 'even', 5000)!
		expect(p.halfwaySecs).toBeCloseTo(3150, 1)
	})

	it('picks kilometre splits for short races and 5 km blocks for long ones', () => {
		expect(defaultSegmentM(5000)).toBe(1000)
		expect(defaultSegmentM(10000)).toBe(1000)
		expect(defaultSegmentM(HALF)).toBe(5000)
		expect(defaultSegmentM(30000)).toBe(5000)
	})
})

describe('checkGoal', () => {
	it('says nothing useful without a fitness reading', () => {
		const c = checkGoal(30000, 9000, null)
		expect(c.verdict).toBe('unknown')
		expect(c.predictedSecs).toBeNull()
		expect(c.deltaSecs).toBeNull()
	})

	it('calls a goal matching current fitness on-track', () => {
		// Find the time this VDOT actually predicts, then ask for exactly that.
		const predicted = checkGoal(10000, 2400, 50).predictedSecs!
		expect(checkGoal(10000, Math.round(predicted), 50).verdict).toBe('on-track')
	})

	it('grades goals by how far inside or beyond the prediction they sit', () => {
		const predicted = checkGoal(10000, 2400, 50).predictedSecs!
		// 4% faster than predicted is a stretch; 10% faster is not happening.
		expect(checkGoal(10000, predicted * 0.96, 50).verdict).toBe('stretch')
		expect(checkGoal(10000, predicted * 0.9, 50).verdict).toBe('unrealistic')
		// 5% slower than predicted leaves time on the table.
		expect(checkGoal(10000, predicted * 1.05, 50).verdict).toBe('ahead')
	})

	it('uses percentages, so the same gap reads differently by distance', () => {
		const short = checkGoal(5000, 2400, 50).predictedSecs!
		const long = checkGoal(30000, 2400, 50).predictedSecs!
		// 90 seconds is 7.5% of a ~20 minute 5 km and 1.2% of a ~2 hour 30 km:
		// the same gap in seconds, opposite verdicts.
		expect(checkGoal(5000, short - 90, 50).verdict).toBe('unrealistic')
		expect(checkGoal(30000, long - 90, 50).verdict).toBe('on-track')
	})

	it('makes a hilly course slower, so the same goal gets harder', () => {
		const flat = checkGoal(30000, 9000, 50, 1.0)
		const hilly = checkGoal(30000, 9000, 50, 1.1)
		expect(hilly.predictedSecs!).toBeGreaterThan(flat.predictedSecs!)
		expect(hilly.deltaSecs!).toBeGreaterThan(flat.deltaSecs!)
	})
})

describe('raceWeekNote', () => {
	it('only speaks inside the final fortnight', () => {
		expect(raceWeekNote(-1)).toBeNull()
		expect(raceWeekNote(15)).toBeNull()
		expect(raceWeekNote(14)).not.toBeNull()
	})

	it('gives one instruction per phase', () => {
		expect(raceWeekNote(0)!.title).toBe('Race day')
		expect(raceWeekNote(1)!.title).toBe('Tomorrow')
		expect(raceWeekNote(4)!.title).toBe('Race week')
		expect(raceWeekNote(10)!.title).toBe('Taper')
	})
})

describe('fmtKm', () => {
	it('drops the decimal on whole kilometres', () => {
		expect(fmtKm(5000)).toBe('5 km')
		expect(fmtKm(21097)).toBe('21.1 km')
	})
})
