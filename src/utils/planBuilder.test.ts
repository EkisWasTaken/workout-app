import { describe, it, expect } from 'vitest'
import { addDays, format, parseISO, getDay, differenceInCalendarDays } from 'date-fns'
import {
	buildPlan, planProblems, planWeekCount, planSessions, runDays, qualityDays,
	qualityCount, weeklyVolumes, phaseFor, taperWeeks, longRunCapKm, isDeloadWeek,
	MIN_WEEKS, MAX_LONG_RUN_KM, DELOAD_EVERY, type PlanInput,
} from './planBuilder'
import { matchZone } from './vdot'

/** A 12-week build to a 30 km race, gym on Mon/Wed/Fri, long run Saturday. */
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
	startDate: '2026-07-06',
	raceDate: '2026-09-26',
	raceName: 'Lidingöloppet',
	distanceM: 30000,
	runsPerWeek: 5,
	startKm: 40,
	peakKm: 60,
	longRunDay: 6,
	easyOnlyDays: [1, 3, 5],
	...over,
})

describe('planWeekCount', () => {
	it('counts whole weeks from the first Monday through race week', () => {
		// 2026-07-06 is a Monday; 2026-09-26 is the Saturday of week 12.
		expect(planWeekCount(input())).toBe(12)
	})

	it('snaps a mid-week start back to that week’s Monday', () => {
		expect(planWeekCount(input({ startDate: '2026-07-09' }))).toBe(12)
	})
})

describe('planProblems', () => {
	it('accepts a sane plan', () => {
		expect(planProblems(input())).toEqual([])
	})

	it('rejects a race too close to build anything', () => {
		const p = planProblems(input({ startDate: '2026-09-14' }))
		expect(p.map(x => x.field)).toContain('weeks')
	})

	it('rejects a peak below where the athlete already is', () => {
		expect(planProblems(input({ startKm: 60, peakKm: 40 })).map(x => x.field)).toContain('volume')
	})

	it('rejects more than roughly doubling weekly volume', () => {
		expect(planProblems(input({ startKm: 20, peakKm: 60 })).map(x => x.field)).toContain('volume')
	})

	it('rejects an unrunnable number of runs per week', () => {
		expect(planProblems(input({ runsPerWeek: 1 })).map(x => x.field)).toContain('runsPerWeek')
		expect(planProblems(input({ runsPerWeek: 8 })).map(x => x.field)).toContain('runsPerWeek')
	})

	it('refuses to build when anything is wrong', () => {
		expect(buildPlan(input({ startKm: 20, peakKm: 60 }))).toBeNull()
	})
})

describe('runDays', () => {
	it('always includes the long run day first', () => {
		expect(runDays(5, 6)[0]).toBe(6)
	})

	it('returns exactly the number of distinct days asked for', () => {
		for (let n = 2; n <= 7; n++) {
			for (let long = 0; long < 7; long++) {
				const days = runDays(n, long)
				expect(days).toHaveLength(n)
				expect(new Set(days).size).toBe(n)
				expect(days.every(d => d >= 0 && d <= 6)).toBe(true)
			}
		}
	})

	it('spreads the runs rather than bunching them', () => {
		const days = runDays(5, 6).sort((a, b) => a - b)
		const gaps = days.map((d, i) => ((i === 0 ? days[days.length - 1]! - 7 : days[i - 1]) * -1 + d))
		// Five runs across seven days: never more than two days off in a row.
		expect(Math.max(...gaps)).toBeLessThanOrEqual(3)
	})
})

describe('qualityDays', () => {
	it('keeps hard days off the gym days when enough days are free', () => {
		const days = runDays(5, 6)
		expect(qualityDays(days, 6, 2, [1]).every(d => d !== 1)).toBe(true)
	})

	it('spends its free days first, then falls back to a gym day', () => {
		// Run days Sat/Sun/Tue/Wed/Fri against gym Mon/Wed/Fri leaves exactly one
		// clean day (Tue), so the second hard session has to share with a lift.
		const q = qualityDays(runDays(5, 6), 6, 2, [1, 3, 5])
		expect(q).toContain(2)
		expect(q.filter(d => [1, 3, 5].includes(d))).toHaveLength(1)
	})

	it('never schedules quality on the long run day', () => {
		const days = runDays(5, 6)
		expect(qualityDays(days, 6, 2, [])).not.toContain(6)
	})

	it('drops the gym constraint rather than the session when nothing else is free', () => {
		const days = runDays(3, 6) // Sat + two others
		const everythingBusy = [0, 1, 2, 3, 4, 5]
		expect(qualityDays(days, 6, 1, everythingBusy)).toHaveLength(1)
	})

	it('asks for nothing when the phase wants no quality', () => {
		expect(qualityDays(runDays(5, 6), 6, 0, [])).toEqual([])
	})
})

describe('qualityCount', () => {
	it('keeps base and taper to a single hard session', () => {
		expect(qualityCount('base', 5)).toBe(1)
		expect(qualityCount('taper', 5)).toBe(1)
	})

	it('runs two hard sessions in build and peak when volume allows', () => {
		expect(qualityCount('build', 5)).toBe(2)
		expect(qualityCount('peak', 6)).toBe(2)
		expect(qualityCount('build', 4)).toBe(1)
	})

	it('gives a two-run week no intensity in base at all', () => {
		expect(qualityCount('base', 2)).toBe(0)
	})
})

describe('weeklyVolumes', () => {
	it('starts where the athlete is and peaks where asked', () => {
		const v = weeklyVolumes(12, 40, 60, 3)
		expect(v[0]).toBe(40)
		expect(Math.max(...v)).toBe(60)
	})

	it('steps back every fourth week', () => {
		const v = weeklyVolumes(12, 40, 60, 3)
		expect(v[DELOAD_EVERY - 1]).toBeLessThan(v[DELOAD_EVERY - 2])
	})

	it('sheds volume through the taper and finishes smallest', () => {
		const v = weeklyVolumes(12, 40, 60, 3)
		const taper = v.slice(-3)
		expect(taper[0]).toBeGreaterThan(taper[1])
		expect(taper[1]).toBeGreaterThan(taper[2])
		expect(v[v.length - 1]).toBe(Math.min(...v))
	})

	it('never sets a new high more than ~10% above the previous high', () => {
		// Coming out of a deload the jump off *last week* is large and harmless;
		// what matters is how fast the ceiling itself rises.
		const v = weeklyVolumes(12, 40, 60, 3)
		let high = v[0]
		for (const km of v) {
			if (km > high) {
				expect(km / high).toBeLessThanOrEqual(1.12)
				high = km
			}
		}
	})
})

describe('phases', () => {
	it('gives longer races a longer taper', () => {
		expect(taperWeeks(5000)).toBe(1)
		expect(taperWeeks(21097)).toBe(2)
		expect(taperWeeks(30000)).toBe(3)
	})

	it('runs base → build → peak → taper in order', () => {
		const seen = Array.from({ length: 12 }, (_, i) => phaseFor(i + 1, 12, 3))
		expect(seen[0]).toBe('base')
		expect(seen[seen.length - 1]).toBe('taper')
		const order = ['base', 'build', 'peak', 'taper']
		let last = 0
		for (const p of seen) {
			const at = order.indexOf(p)
			expect(at).toBeGreaterThanOrEqual(last)
			last = at
		}
	})

	it('never calls the final build week a deload', () => {
		expect(isDeloadWeek(9, 12, 3)).toBe(false)
	})
})

describe('longRunCapKm', () => {
	it('lets short races run well over race distance', () => {
		expect(longRunCapKm(5000)).toBe(10)
	})

	it('caps the long run below race distance for the long stuff', () => {
		expect(longRunCapKm(30000)).toBeCloseTo(25.5, 5)
		expect(longRunCapKm(42195)).toBe(MAX_LONG_RUN_KM)
	})
})

describe('buildPlan', () => {
	const plan = buildPlan(input())!

	it('builds a week per week, ending on race week', () => {
		expect(plan.weeks).toHaveLength(12)
		expect(plan.weeks[0].index).toBe(1)
		expect(plan.weeks[plan.weeks.length - 1]!.sessions.some(s => s.kind === 'race')).toBe(true)
	})

	it('puts the race on race day, at race distance, exactly once', () => {
		const races = planSessions(plan).filter(s => s.kind === 'race')
		expect(races).toHaveLength(1)
		expect(races[0].date).toBe('2026-09-26')
		expect(races[0].distanceKm).toBe(30)
		expect(races[0].name).toBe('Lidingöloppet')
	})

	it('does not double-book race day with an ordinary session', () => {
		const onRaceDay = planSessions(plan).filter(s => s.date === '2026-09-26')
		expect(onRaceDay).toHaveLength(1)
	})

	it('writes zones the pace engine understands, never raw paces', () => {
		for (const s of planSessions(plan)) {
			expect(matchZone(s.zone)).not.toBeNull()
			// A zone label is a name, not a number — paces are derived later.
			expect(s.zone).not.toMatch(/\d/)
		}
	})

	it('keeps every session inside the plan window', () => {
		const start = parseISO('2026-07-06')
		for (const s of planSessions(plan)) {
			expect(differenceInCalendarDays(parseISO(s.date), start)).toBeGreaterThanOrEqual(0)
			expect(parseISO(s.date) <= parseISO('2026-09-26')).toBe(true)
		}
	})

	it('runs the long run on the chosen day, every week', () => {
		for (const w of plan.weeks) {
			const long = w.sessions.find(s => s.kind === 'long')
			if (!long) continue
			expect(getDay(parseISO(long.date))).toBe(6)
		}
	})

	it('never puts a hard session the day after the long run', () => {
		for (const w of plan.weeks) {
			const long = w.sessions.find(s => s.kind === 'long')
			if (!long) continue
			const after = format(addDays(parseISO(long.date), 1), 'yyyy-MM-dd')
			const onAfter = w.sessions.find(s => s.date === after)
			if (onAfter) expect(onAfter.kind).not.toBe('quality')
		}
	})

	it('puts at least one hard session on a non-gym day each week it can', () => {
		// Three gym days out of five run days means the odd tempo lands on one;
		// the guarantee is that they don't ALL have to.
		for (const w of plan.weeks) {
			const quality = w.sessions.filter(s => s.kind === 'quality')
			if (quality.length < 2) continue
			expect(quality.some(s => ![1, 3, 5].includes(getDay(parseISO(s.date))))).toBe(true)
		}
	})

	it('keeps the long run under the cap for the distance', () => {
		const cap = longRunCapKm(30000)
		for (const s of planSessions(plan)) {
			if (s.kind === 'long') expect(s.distanceKm!).toBeLessThanOrEqual(cap)
		}
	})

	it('lands each week near its volume target', () => {
		for (const w of plan.weeks) {
			if (w.sessions.some(s => s.kind === 'race')) continue
			const actual = w.sessions.reduce((sum, s) => sum + (s.distanceKm || 0), 0)
			// Rounding to half-kilometres, over up to five sessions.
			expect(Math.abs(actual - w.targetKm)).toBeLessThanOrEqual(3)
		}
	})

	it('tapers the long run down in the final weeks', () => {
		const longOf = (i: number) => plan.weeks[i].sessions.find(s => s.kind === 'long')?.distanceKm ?? 0
		expect(longOf(11)).toBeLessThan(longOf(8))
	})

	it('gives the day after the long run a recovery run, not an easy one', () => {
		const week = plan.weeks[4]
		const sunday = week.sessions.find(s => getDay(parseISO(s.date)) === 0)
		if (sunday) {
			expect(sunday.kind).toBe('recovery')
			expect(sunday.zone).toBe('Recovery')
		}
	})

	it('reports a peak matching the biggest week it actually planned', () => {
		expect(plan.peakKm).toBe(Math.max(...plan.weeks.map(w => w.targetKm)))
		expect(plan.totalKm).toBeGreaterThan(0)
	})

	it('scales down to a short plan for a short race', () => {
		const short = buildPlan(input({
			raceDate: '2026-08-08', distanceM: 5000, raceName: 'Parkrun',
			runsPerWeek: 3, startKm: 20, peakKm: 28, easyOnlyDays: [],
		}))!
		expect(short.weeks.length).toBeGreaterThanOrEqual(MIN_WEEKS)
		expect(planSessions(short).filter(s => s.kind === 'race')).toHaveLength(1)
	})
})
