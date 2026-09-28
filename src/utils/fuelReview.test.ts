import { describe, it, expect } from 'vitest'
import { addDays, format, parseISO } from 'date-fns'
import { buildEnergyPlan, KCAL_PER_KG, type EnergyPlanInput, type EnergySession, type EnergyWeek } from './energy'
import {
	reviewFuelWeek, fuelTrend, NOISE_KCAL_PER_DAY,
	type FuelWeekReview, type LoggedSession,
} from './fuelReview'

const MONDAY = '2026-07-06'

/** Gym Mon/Wed/Fri, runs Tue/Thu, long run Saturday, Sunday off. */
function weekSessions(monday = MONDAY): LoggedSession[] {
	const plan: [number, Omit<LoggedSession, 'date' | 'done'>][] = [
		[0, { sport: 'gym', durationMin: 60 }],
		[1, { sport: 'running', km: 10 }],
		[2, { sport: 'gym', durationMin: 60 }],
		[3, { sport: 'running', km: 8 }],
		[4, { sport: 'gym', durationMin: 60 }],
		[5, { sport: 'running', km: 20 }],
	]
	return plan.map(([offset, s]) => ({
		date: format(addDays(parseISO(monday), offset), 'yyyy-MM-dd'),
		done: true,
		...s,
	}))
}

const asPlanned = (s: LoggedSession[]): EnergySession[] =>
	s.map(x => ({ date: x.date, sport: x.sport, km: x.km, durationMin: x.durationMin }))

const planInput = (over: Partial<EnergyPlanInput> = {}): EnergyPlanInput => ({
	startWeightKg: 82,
	goalWeightKg: 76,
	heightCm: 183,
	age: 30,
	sex: 'male',
	activityLevel: 'light',
	startDate: MONDAY,
	endDate: '2026-09-26',
	sessions: asPlanned(weekSessions()),
	...over,
})

/** The first week of a normal plan — the thing a review grades against. */
function week(over: Partial<EnergyPlanInput> = {}): EnergyWeek {
	return buildEnergyPlan(planInput(over))!.weeks[0]
}

/**
 * The weight change that a given daily intake would actually produce, so a test
 * can say "they ate X" and get the scale reading that implies.
 */
function weighAfter(w: EnergyWeek, sessions: LoggedSession[], intakePerDay: number): number {
	const done = sessions.filter(s => s.done)
	const burn = w.baselineKcal * 7 + done.reduce((sum, s) => sum + sessionKcalOf(s, w.startWeightKg), 0)
	return w.startWeightKg + (intakePerDay * 7 - burn) / KCAL_PER_KG
}

/** Mirrors energy.ts's pricing, so the fixtures don't drift from the model. */
function sessionKcalOf(s: LoggedSession, kg: number): number {
	if (s.sport === 'running' && (s.actualKm ?? s.km)) return Math.round(0.9 * kg * (s.actualKm ?? s.km)!)
	const mins = s.actualMin ?? s.durationMin ?? 60
	const mets = { running: 8, bike: 6, gym: 4, other: 3 }[s.sport]
	return Math.round(((mets * 3.5 * kg) / 200) * mins)
}

describe('reviewFuelWeek — the training half', () => {
	it('counts a fully completed week as full adherence', () => {
		const w = week()
		const r = reviewFuelWeek({ week: w, sessions: weekSessions(), startWeightKg: 82, endWeightKg: 81.5 })
		expect(r.adherencePct).toBe(100)
		expect(r.loadPct).toBe(100)
		expect(r.completed.sessions).toBe(6)
	})

	it('prices the burn from what was done, not from what was planned', () => {
		const w = week()
		const sessions = weekSessions().map(s => (s.km === 20 ? { ...s, done: false } : s))
		const r = reviewFuelWeek({ week: w, sessions, startWeightKg: 82, endWeightKg: 81.8 })
		expect(r.completed.sessions).toBe(5)
		expect(r.actualBurnPerDay).toBeLessThan(r.plannedBurnPerDay)
		// A skipped 20 km at 82 kg is ~1,476 kcal, ~211 a day.
		expect(r.plannedBurnPerDay - r.actualBurnPerDay).toBeGreaterThan(180)
	})

	it('uses the recorded distance over the planned one', () => {
		const w = week()
		const short = weekSessions().map(s => (s.km === 20 ? { ...s, actualKm: 12 } : s))
		const long = weekSessions().map(s => (s.km === 20 ? { ...s, actualKm: 26 } : s))
		const a = reviewFuelWeek({ week: w, sessions: short, startWeightKg: 82, endWeightKg: 81.6 })
		const b = reviewFuelWeek({ week: w, sessions: long, startWeightKg: 82, endWeightKg: 81.6 })
		expect(b.actualBurnPerDay).toBeGreaterThan(a.actualBurnPerDay)
		expect(b.completed.km).toBeGreaterThan(a.completed.km)
	})

	it('only holds you to the sessions whose day has arrived', () => {
		const w = week()
		// Wednesday: Mon and Tue done, the rest untouched.
		const sessions = weekSessions().map((s, i) => ({ ...s, done: i < 2 }))
		const r = reviewFuelWeek({ week: w, sessions, startWeightKg: 82, endWeightKg: 81.9, throughDay: 2 })
		expect(r.adherencePct).toBe(67) // 2 of the 3 due by Wednesday
		expect(r.due.sessions).toBe(3)
		expect(r.planned.sessions).toBe(6)
		expect(r.complete).toBe(false)
	})

	it('measures load against what was due, not against the whole week', () => {
		const w = week()
		// Monday only, and Monday's session was done: that is 100%, not 17%.
		const sessions = weekSessions().map((s, i) => ({ ...s, done: i === 0 }))
		const r = reviewFuelWeek({ week: w, sessions, startWeightKg: 82, endWeightKg: 82, throughDay: 0 })
		expect(r.loadPct).toBe(100)
		expect(r.adherencePct).toBe(100)
		expect(r.message).not.toMatch(/sessions missed/)
	})

	it('stays quiet about a shortfall too small to move the deficit', () => {
		const w = week()
		// Every run done, one gym session skipped — under 50 kcal a day.
		const sessions = weekSessions().map(s => (s.sport === 'gym' && s.date.endsWith('06') ? { ...s, done: false } : s))
		const r = reviewFuelWeek({ week: w, sessions, startWeightKg: 82, endWeightKg: 81.5 })
		expect(r.message).not.toMatch(/less than the targets assumed/)
	})

	it('says nothing about adherence when nothing was planned', () => {
		const w = week({ sessions: [] })
		const r = reviewFuelWeek({ week: w, sessions: [], startWeightKg: 82, endWeightKg: 81.6 })
		expect(r.adherencePct).toBeNull()
		expect(r.loadPct).toBeNull()
	})
})

describe('reviewFuelWeek — working intake back from the scale', () => {
	it('recovers an intake it was never told', () => {
		const w = week()
		const sessions = weekSessions()
		const ate = 2400
		const r = reviewFuelWeek({
			week: w, sessions,
			startWeightKg: w.startWeightKg,
			endWeightKg: weighAfter(w, sessions, ate),
		})
		expect(r.impliedIntakePerDay).toBeCloseTo(ate, -1)
	})

	it('reports the gap against the target, signed the intuitive way', () => {
		const w = week()
		const sessions = weekSessions()
		const over = reviewFuelWeek({
			week: w, sessions,
			startWeightKg: w.startWeightKg,
			endWeightKg: weighAfter(w, sessions, w.intakeKcal / 7 + 600),
		})
		expect(over.intakeGapPerDay).toBeGreaterThan(0)
		expect(over.verdict).toBe('over')

		const under = reviewFuelWeek({
			week: w, sessions,
			startWeightKg: w.startWeightKg,
			endWeightKg: weighAfter(w, sessions, w.intakeKcal / 7 - 600),
		})
		expect(under.intakeGapPerDay).toBeLessThan(0)
		expect(under.verdict).toBe('under')
	})

	it('calls a small gap on-track rather than inventing a trend', () => {
		const w = week()
		const sessions = weekSessions()
		const r = reviewFuelWeek({
			week: w, sessions,
			startWeightKg: w.startWeightKg,
			endWeightKg: weighAfter(w, sessions, w.intakeKcal / 7 + NOISE_KCAL_PER_DAY * 0.5),
		})
		expect(r.verdict).toBe('on-track')
		expect(r.message).toMatch(/Nothing to change/)
	})

	it('blames the missed training, not the diet, when the training was missed', () => {
		const w = week()
		const sessions = weekSessions().map(s => (s.km === 20 ? { ...s, done: false } : s))
		const r = reviewFuelWeek({
			week: w, sessions,
			startWeightKg: w.startWeightKg,
			endWeightKg: weighAfter(w, sessions, w.intakeKcal / 7),
		})
		// Ate exactly to target, so the implied intake is right even though the
		// week's deficit came up short.
		expect(r.verdict).toBe('on-track')
		expect(r.message).toMatch(/of the training due so far/)
		expect(r.message).toMatch(/kcal a day less than the targets assumed/)
	})

	it('holds off entirely without weigh-ins at both ends', () => {
		const w = week()
		const r = reviewFuelWeek({ week: w, sessions: weekSessions(), startWeightKg: null, endWeightKg: 81 })
		expect(r.impliedIntakePerDay).toBeNull()
		expect(r.verdict).toBe('unknown')
		expect(r.unknownReason).toBe('weight')
		expect(r.message).toMatch(/no food logging required/)
	})

	it('refuses a verdict two days into a week', () => {
		const w = week()
		const r = reviewFuelWeek({
			week: w, sessions: weekSessions(), startWeightKg: 82, endWeightKg: 81.7, throughDay: 1,
		})
		expect(r.verdict).toBe('unknown')
		expect(r.unknownReason).toBe('partial')
	})

	it('demands a bigger gap from a part-week than a whole one', () => {
		const w = week()
		const sessions = weekSessions()
		// A gap that a full week would call, presented over four days.
		const gap = NOISE_KCAL_PER_DAY * 1.2
		const whole = reviewFuelWeek({
			week: w, sessions,
			startWeightKg: w.startWeightKg,
			endWeightKg: weighAfter(w, sessions, w.intakeKcal / 7 + gap),
		})
		expect(whole.verdict).toBe('over')

		// The same overshoot, but only four days of scale data behind it. The
		// week's own deficit has to be in the fixture or "the same gap" isn't.
		const four = sessions.slice(0, 4)
		const burn4 = w.baselineKcal * 4 + four.reduce((s, x) => s + sessionKcalOf(x, w.startWeightKg), 0)
		const target4 = w.days.slice(0, 4).reduce((s, d) => s + d.intakeKcal, 0)
		const partial = reviewFuelWeek({
			week: w, sessions: four,
			startWeightKg: w.startWeightKg,
			endWeightKg: w.startWeightKg + (target4 + gap * 4 - burn4) / KCAL_PER_KG,
			throughDay: 3,
		})
		expect(partial.intakeGapPerDay).toBeCloseTo(gap, -1)
		expect(partial.verdict).toBe('on-track')
	})

	it('carries the dates of the week it graded', () => {
		const r = reviewFuelWeek({ week: week(), sessions: weekSessions(), startWeightKg: 82, endWeightKg: 81.5 })
		expect(r.weekStart).toBe(MONDAY)
		expect(r.weekEnd).toBe('2026-07-12')
		expect(r.complete).toBe(true)
	})
})

describe('fuelTrend', () => {
	const measured = (gap: number, i: number): FuelWeekReview => {
		const w = week()
		const sessions = weekSessions(format(addDays(parseISO(MONDAY), i * 7), 'yyyy-MM-dd'))
		return reviewFuelWeek({
			week: w, sessions,
			startWeightKg: w.startWeightKg,
			endWeightKg: weighAfter(w, sessions, w.intakeKcal / 7 + gap),
		})
	}

	it('says so when no week could be measured', () => {
		const w = week()
		const unmeasured = reviewFuelWeek({ week: w, sessions: weekSessions(), startWeightKg: null, endWeightKg: null })
		const t = fuelTrend([unmeasured])
		expect(t.measured).toBe(0)
		expect(t.verdict).toBe('unknown')
		expect(t.gapPerDay).toBeNull()
	})

	it('will not call a trend off one week', () => {
		const t = fuelTrend([measured(0, 0)])
		expect(t.measured).toBe(1)
		expect(t.message).toMatch(/One measured week so far/)
	})

	it('averages the gap across the weeks it could measure', () => {
		const t = fuelTrend([measured(400, 0), measured(600, 1), measured(500, 2), measured(500, 3)])
		expect(t.measured).toBe(4)
		expect(t.gapPerDay).toBeGreaterThan(450)
		expect(t.gapPerDay).toBeLessThan(550)
		expect(t.verdict).toBe('over')
	})

	it('sees a gap over four weeks that one week could not', () => {
		// 180 kcal a day is inside a single week's noise and outside four weeks'.
		const small = 180
		expect(measured(small, 0).verdict).toBe('on-track')
		const t = fuelTrend([measured(small, 0), measured(small, 1), measured(small, 2), measured(small, 3)])
		expect(t.verdict).toBe('over')
		expect(t.message).toMatch(/past what water can explain/)
	})

	it('calls four honest weeks on-track, and says why that is trustworthy', () => {
		const t = fuelTrend([measured(40, 0), measured(-60, 1), measured(20, 2), measured(-30, 3)])
		expect(t.verdict).toBe('on-track')
		expect(t.message).toMatch(/real answer, not noise/)
	})

	it('ignores unmeasurable weeks rather than counting them as zero', () => {
		const w = week()
		const blank = reviewFuelWeek({ week: w, sessions: weekSessions(), startWeightKg: null, endWeightKg: null })
		const t = fuelTrend([blank, measured(500, 1), measured(500, 2), blank])
		expect(t.measured).toBe(2)
		expect(t.gapPerDay).toBeGreaterThan(450)
	})
})
