import { describe, it, expect } from 'vitest'
import { addDays, parseISO, startOfWeek, format } from 'date-fns'
import {
	weekReview, usualRange, verdictFor, historyThrough, dayIndex,
	MIN_HISTORY_WEEKS, type EffortPoint, type PlannedItem,
} from './weekReview'

// 2026-09-16 is a Wednesday, so "through day" is 2 (Mon=0).
const WED = parseISO('2026-09-16')
const MONDAY = startOfWeek(WED, { weekStartsOn: 1 })

const day = (offset: number) => format(addDays(MONDAY, offset), 'yyyy-MM-dd')

const session = (offset: number, over: Partial<PlannedItem> = {}): PlannedItem => ({
	date: day(offset),
	name: 'Easy run',
	km: 10,
	done: false,
	isRest: false,
	...over,
})

/** `perWeek` effort on the given weekday offset, for each of the last `weeks` weeks. */
const historyEfforts = (weeks: number, offset: number, effort: number): EffortPoint[] =>
	Array.from({ length: weeks }, (_, i) => ({
		date: addDays(MONDAY, -7 * (i + 1) + offset),
		effort,
	}))

describe('dayIndex', () => {
	it('starts the week on Monday', () => {
		expect(dayIndex(MONDAY)).toBe(0)
		expect(dayIndex(WED)).toBe(2)
		expect(dayIndex(addDays(MONDAY, 6))).toBe(6)
	})
})

describe('historyThrough', () => {
	it('counts only the days up to the same point in each past week', () => {
		const efforts = [
			{ date: addDays(MONDAY, -7), effort: 50 },      // last Monday
			{ date: addDays(MONDAY, -7 + 2), effort: 30 },  // last Wednesday
			{ date: addDays(MONDAY, -7 + 5), effort: 99 },  // last Saturday — after the cut
		]
		expect(historyThrough(efforts, 2, 1, MONDAY)).toEqual([80])
	})

	it('excludes the current week entirely', () => {
		const efforts = [{ date: addDays(MONDAY, 1), effort: 100 }]
		expect(historyThrough(efforts, 6, 4, MONDAY)).toEqual([0, 0, 0, 0])
	})

	it('returns the weeks oldest first', () => {
		const efforts = [
			{ date: addDays(MONDAY, -14), effort: 10 },
			{ date: addDays(MONDAY, -7), effort: 20 },
		]
		expect(historyThrough(efforts, 0, 2, MONDAY)).toEqual([10, 20])
	})
})

describe('usualRange', () => {
	it('stays silent until there is enough history', () => {
		expect(usualRange([])).toBeNull()
		expect(usualRange([100, 100])).toBeNull()
		expect(usualRange(Array(MIN_HISTORY_WEEKS).fill(100))).not.toBeNull()
	})

	it('ignores weeks with no training at all', () => {
		// Two real weeks and four blanks is not three weeks of history.
		expect(usualRange([0, 0, 0, 0, 100, 110])).toBeNull()
	})

	it('brackets a steady block with a tolerance band', () => {
		const r = usualRange([100, 100, 100, 100])!
		expect(r[0]).toBeCloseTo(88, 5)
		expect(r[1]).toBeCloseTo(112, 5)
	})

	it('widens to the middle half when weeks vary a lot', () => {
		const r = usualRange([40, 80, 100, 120, 160])!
		expect(r[0]).toBeLessThanOrEqual(80)
		expect(r[1]).toBeGreaterThanOrEqual(120)
	})
})

describe('verdictFor', () => {
	it('is unknown without a range', () => {
		expect(verdictFor(100, null)).toBe('unknown')
	})

	it('reads the ends of the band inclusively', () => {
		expect(verdictFor(88, [88, 112])).toBe('in-range')
		expect(verdictFor(112, [88, 112])).toBe('in-range')
		expect(verdictFor(87, [88, 112])).toBe('below')
		expect(verdictFor(113, [88, 112])).toBe('above')
	})
})

describe('weekReview', () => {
	it('counts only sessions whose day has arrived as missed', () => {
		const r = weekReview({
			today: WED,
			efforts: [],
			week: [
				session(0, { done: true }),   // Monday, done
				session(1),                   // Tuesday, skipped
				session(2, { done: true }),   // Wednesday, done
				session(5),                   // Saturday, still to come
			],
		})
		expect(r.missed.map(m => m.date)).toEqual([day(1)])
		expect(r.adherencePct).toBe(67)
		expect(r.planned.sessions).toBe(4)
		expect(r.completed.sessions).toBe(2)
	})

	it('ignores rest days on both sides of the ledger', () => {
		const r = weekReview({
			today: WED,
			efforts: [],
			week: [session(0, { done: true }), session(1, { isRest: true, km: 0, name: 'Rest' })],
		})
		expect(r.planned.sessions).toBe(1)
		expect(r.missed).toEqual([])
		expect(r.adherencePct).toBe(100)
	})

	it('prefers the distance actually run over the distance planned', () => {
		const r = weekReview({
			today: WED,
			efforts: [],
			week: [session(0, { done: true, km: 10, actualKm: 12.4 }), session(5, { km: 20 })],
		})
		expect(r.completed.km).toBe(12.4)
		expect(r.planned.km).toBe(30)
		expect(r.kmPct).toBe(41)
		expect(r.longestKm).toBe(12.4)
	})

	it('has no opinion on adherence before the week has started', () => {
		const r = weekReview({ today: MONDAY, efforts: [], week: [session(5)] })
		expect(r.adherencePct).toBeNull()
		expect(r.missed).toEqual([])
	})

	it('compares this week against the same point in past weeks', () => {
		// Six past weeks of 100 effort by Wednesday; this week has 100 too.
		const r = weekReview({
			today: WED,
			week: [],
			efforts: [
				...historyEfforts(6, 1, 100),
				{ date: addDays(MONDAY, 1), effort: 100 },
			],
		})
		expect(r.effort).toBe(100)
		expect(r.effortVerdict).toBe('in-range')
		expect(r.message).toContain('usual range')
	})

	it('does not count a past week’s weekend against a midweek total', () => {
		// Past weeks did 100 on Tuesday and another 400 on Saturday. Compared at
		// Wednesday, only the 100 counts — otherwise every week looks light.
		const efforts = [
			...historyEfforts(6, 1, 100),
			...historyEfforts(6, 5, 400),
			{ date: addDays(MONDAY, 1), effort: 100 },
		]
		const r = weekReview({ today: WED, week: [], efforts })
		expect(r.effortRange).toEqual([88, 112])
		expect(r.effortVerdict).toBe('in-range')
	})

	it('flags a week that is working harder than usual', () => {
		const r = weekReview({
			today: WED,
			week: [],
			efforts: [...historyEfforts(6, 1, 100), { date: addDays(MONDAY, 1), effort: 200 }],
		})
		expect(r.effortVerdict).toBe('above')
		expect(r.message).toContain('harder')
	})

	it('flags a week that is coasting', () => {
		const r = weekReview({
			today: WED,
			week: [],
			efforts: [...historyEfforts(6, 1, 100), { date: addDays(MONDAY, 1), effort: 20 }],
		})
		expect(r.effortVerdict).toBe('below')
		expect(r.message).toContain('easier')
	})

	it('says so plainly when there is no history to compare against', () => {
		const r = weekReview({ today: WED, week: [session(0)], efforts: [] })
		expect(r.effortVerdict).toBe('unknown')
		expect(r.effortRange).toBeNull()
		expect(r.message).toMatch(/comparing/)
	})

	it('mentions outstanding sessions alongside the effort verdict', () => {
		const r = weekReview({
			today: WED,
			week: [session(0), session(1)],
			efforts: [...historyEfforts(6, 1, 100), { date: addDays(MONDAY, 1), effort: 100 }],
		})
		expect(r.message).toContain('usual range')
		expect(r.message).toContain('2 sessions still outstanding')
	})

	it('reports the week whole once it is Sunday', () => {
		const sunday = addDays(MONDAY, 6)
		const r = weekReview({
			today: sunday,
			week: [session(0, { done: true })],
			efforts: [...historyEfforts(6, 1, 100), { date: addDays(MONDAY, 1), effort: 100 }],
		})
		expect(r.throughDay).toBe(6)
		expect(r.message).toMatch(/^This week/)
	})
})
