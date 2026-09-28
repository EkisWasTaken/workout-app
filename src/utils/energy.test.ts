import { describe, it, expect } from 'vitest'
import { addDays, format, parseISO } from 'date-fns'
import {
	bmr, baselineBurn, intakeFloor, sessionKcal, macrosFor, bmi,
	buildEnergyPlan, energyProblems, planWeeks, maxRateKgPerWeek, weeksAtMaxRate,
	energySport, KCAL_PER_KG, MAX_DEFICIT_FRACTION, PROTEIN_G_PER_KG,
	type EnergyPlanInput, type EnergySession,
} from './energy'

/**
 * A 12-week block from a Monday: gym Mon/Wed/Fri, runs Tue/Thu, long run
 * Saturday, Sunday off. Roughly the schedule the plan builder produces.
 */
function sessions(from = '2026-07-06', weeks = 12): EnergySession[] {
	const monday = parseISO(from)
	const week: [number, Omit<EnergySession, 'date'>][] = [
		[0, { sport: 'gym', durationMin: 60 }],
		[1, { sport: 'running', km: 10 }],
		[2, { sport: 'gym', durationMin: 60 }],
		[3, { sport: 'running', km: 8 }],
		[4, { sport: 'gym', durationMin: 60 }],
		[5, { sport: 'running', km: 20 }],
	]
	const out: EnergySession[] = []
	for (let w = 0; w < weeks; w++) {
		for (const [offset, s] of week) {
			out.push({ date: format(addDays(monday, w * 7 + offset), 'yyyy-MM-dd'), ...s })
		}
	}
	return out
}

const input = (over: Partial<EnergyPlanInput> = {}): EnergyPlanInput => ({
	startWeightKg: 82,
	goalWeightKg: 76,
	heightCm: 183,
	age: 30,
	sex: 'male',
	activityLevel: 'light',
	startDate: '2026-07-06',
	endDate: '2026-09-26',
	sessions: sessions(),
	...over,
})

describe('bmr', () => {
	it('follows Mifflin-St Jeor for men', () => {
		// 10*80 + 6.25*180 - 5*30 + 5 = 1780
		expect(bmr({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' })).toBe(1780)
	})

	it('and for women', () => {
		// 10*65 + 6.25*168 - 5*30 - 161 = 1389
		expect(bmr({ weightKg: 65, heightCm: 168, age: 30, sex: 'female' })).toBe(1389)
	})

	it('falls as weight comes off', () => {
		const heavy = bmr({ weightKg: 90, heightCm: 180, age: 30, sex: 'male' })
		const light = bmr({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' })
		expect(heavy - light).toBe(100)
	})
})

describe('baselineBurn', () => {
	it('multiplies BMR by the life factor only, leaving training to be added', () => {
		const stats = { weightKg: 80, heightCm: 180, age: 30, sex: 'male' as const, activityLevel: 'light' as const }
		expect(baselineBurn(stats)).toBe(Math.round(1780 * 1.3))
	})
})

describe('intakeFloor', () => {
	it('is BMR when BMR is the higher of the two', () => {
		expect(intakeFloor({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' })).toBe(1780)
	})

	it('is the absolute floor for a small person with a low BMR', () => {
		// 10*45 + 6.25*150 - 5*60 - 161 = 926 → floored at 1200
		expect(intakeFloor({ weightKg: 45, heightCm: 150, age: 60, sex: 'female' })).toBe(1200)
	})
})

describe('sessionKcal', () => {
	it('prices a run from distance and body weight', () => {
		expect(sessionKcal({ date: '2026-07-06', sport: 'running', km: 10 }, 80)).toBe(720)
	})

	it('scales with the athlete', () => {
		const light = sessionKcal({ date: '2026-07-06', sport: 'running', km: 10 }, 60)
		const heavy = sessionKcal({ date: '2026-07-06', sport: 'running', km: 10 }, 100)
		expect(heavy).toBeGreaterThan(light)
	})

	it('falls back to duration when there is no distance', () => {
		const kcal = sessionKcal({ date: '2026-07-06', sport: 'gym', durationMin: 60 }, 80)
		// 4 METs net × 3.5 × 80 / 200 = 5.6 kcal/min
		expect(kcal).toBe(336)
	})

	it('assumes a typical session length when nothing is given at all', () => {
		expect(sessionKcal({ date: '2026-07-06', sport: 'gym' }, 80)).toBe(336)
	})

	it('never returns nothing for a real session', () => {
		for (const sport of ['running', 'bike', 'gym', 'other'] as const) {
			expect(sessionKcal({ date: '2026-07-06', sport }, 70)).toBeGreaterThan(0)
		}
	})
})

describe('macrosFor', () => {
	it('sets protein from body weight and the mode', () => {
		const m = macrosFor(2500, 2500, 80, 'lose')
		expect(m.proteinG).toBe(Math.round(PROTEIN_G_PER_KG.lose * 80))
	})

	it('keeps fat constant across the week and lets carbs carry the training', () => {
		const rest = macrosFor(2200, 2600, 80, 'lose')
		const long = macrosFor(3400, 2600, 80, 'lose')
		expect(long.fatG).toBe(rest.fatG)
		expect(long.proteinG).toBe(rest.proteinG)
		expect(long.carbsG).toBeGreaterThan(rest.carbsG)
	})

	it('adds up to roughly the target', () => {
		const m = macrosFor(2800, 2800, 80, 'maintain')
		const kcal = m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9
		expect(Math.abs(kcal - 2800)).toBeLessThan(25)
	})

	it('never goes below the fat floor on a very low target', () => {
		const m = macrosFor(1400, 1400, 90, 'lose')
		expect(m.fatG).toBeGreaterThanOrEqual(Math.round(0.7 * 90))
	})
})

describe('planWeeks', () => {
	it('counts whole weeks from the first Monday through the end week', () => {
		expect(planWeeks('2026-07-06', '2026-09-26')).toBe(12)
	})

	it('snaps a mid-week start back to that week’s Monday', () => {
		expect(planWeeks('2026-07-09', '2026-09-26')).toBe(12)
	})
})

describe('maxRateKgPerWeek', () => {
	it('is 1% of body weight for loss, up to a kilo', () => {
		expect(maxRateKgPerWeek(80, 'lose')).toBeCloseTo(0.8)
		expect(maxRateKgPerWeek(120, 'lose')).toBe(1.0)
	})

	it('is slower for gaining, because the gain is meant to be muscle', () => {
		expect(maxRateKgPerWeek(80, 'gain')).toBeCloseTo(0.4)
	})
})

describe('weeksAtMaxRate', () => {
	it('slows down as the athlete gets lighter', () => {
		// A flat 1%-of-the-starting-weight rate would say ceil(12 / 0.9) = 14 weeks.
		// The real rate falls with the weight, so it takes longer than that.
		expect(weeksAtMaxRate(90, 78)).toBeGreaterThan(14)
	})

	it('is zero when already there', () => {
		expect(weeksAtMaxRate(80, 80)).toBe(0)
	})
})

describe('energyProblems', () => {
	it('accepts a sane plan', () => {
		expect(energyProblems(input())).toEqual([])
	})

	it('rejects an implausible height', () => {
		expect(energyProblems(input({ heightCm: 60 })).map(p => p.field)).toContain('stats')
	})

	it('rejects a missing current weight', () => {
		expect(energyProblems(input({ startWeightKg: 0 })).map(p => p.field)).toContain('weight')
	})

	it('rejects an end date before the start', () => {
		expect(energyProblems(input({ endDate: '2026-06-01' })).map(p => p.field)).toContain('dates')
	})
})

describe('buildEnergyPlan', () => {
	it('returns null when the inputs are unusable', () => {
		expect(buildEnergyPlan(input({ startWeightKg: 0 }))).toBeNull()
	})

	it('builds one week per plan week, seven days each', () => {
		const plan = buildEnergyPlan(input())!
		expect(plan.weeks).toHaveLength(12)
		for (const w of plan.weeks) expect(w.days).toHaveLength(7)
	})

	it('knows which direction it is going', () => {
		expect(buildEnergyPlan(input())!.mode).toBe('lose')
		expect(buildEnergyPlan(input({ goalWeightKg: 88 }))!.mode).toBe('gain')
		expect(buildEnergyPlan(input({ goalWeightKg: 82.2 }))!.mode).toBe('maintain')
	})

	it('feeds a long-run day more than a rest day', () => {
		const week = buildEnergyPlan(input())!.weeks[0]
		const long = week.days.find(d => d.trainingKcal === Math.max(...week.days.map(x => x.trainingKcal)))!
		const rest = week.days.find(d => d.trainingKcal === 0)!
		expect(long.intakeKcal).toBeGreaterThan(rest.intakeKcal)
		expect(long.macros.carbsG).toBeGreaterThan(rest.macros.carbsG)
	})

	it('holds the same deficit across the week, whatever the day costs', () => {
		// Identical on every day the intake floor doesn't lift — which is the
		// point: eating more on a long-run day is fuelling, not a day off.
		const week = buildEnergyPlan(input())!.weeks[0]
		const floor = intakeFloor({ weightKg: week.startWeightKg, heightCm: 183, age: 30, sex: 'male' })
		const free = week.days.filter(d => d.intakeKcal > floor).map(d => d.deficitKcal)
		expect(new Set(free).size).toBe(1)
	})

	it('lifts a rest day to the floor rather than prescribing less than BMR', () => {
		const plan = buildEnergyPlan(input({ goalWeightKg: 74 }))!
		const week = plan.weeks[0]
		const floor = intakeFloor({ weightKg: week.startWeightKg, heightCm: 183, age: 30, sex: 'male' })
		const rest = week.days.find(d => d.trainingKcal === 0)!
		expect(rest.intakeKcal).toBe(floor)
		// …and that shallower deficit is reflected in the projection, not hidden.
		expect(week.changeKg).toBeCloseTo((week.intakeKcal - week.burnKcal) / KCAL_PER_KG, 2)
	})

	it('never prescribes less than the intake floor', () => {
		const plan = buildEnergyPlan(input({ startWeightKg: 70, goalWeightKg: 58, endDate: '2026-08-16' }))!
		const floor = intakeFloor({ weightKg: 58, heightCm: 183, age: 30, sex: 'male' })
		for (const w of plan.weeks) {
			for (const d of w.days) expect(d.intakeKcal).toBeGreaterThanOrEqual(floor)
		}
	})

	it('never cuts more than a quarter off what you burn', () => {
		const plan = buildEnergyPlan(input({ goalWeightKg: 60, endDate: '2026-08-16' }))!
		for (const w of plan.weeks) {
			expect(w.intakeKcal).toBeGreaterThanOrEqual(w.burnKcal * (1 - MAX_DEFICIT_FRACTION) - 7)
		}
	})

	it('projects the weight forward from the week’s own energy balance', () => {
		const w = buildEnergyPlan(input())!.weeks[0]
		expect(w.changeKg).toBeCloseTo((w.intakeKcal - w.burnKcal) / KCAL_PER_KG, 2)
		expect(w.endWeightKg).toBeCloseTo(w.startWeightKg + w.changeKg, 1)
	})

	it('re-solves each week off the previous week’s projected weight', () => {
		const plan = buildEnergyPlan(input())!
		for (let i = 1; i < plan.weeks.length; i++) {
			expect(plan.weeks[i].startWeightKg).toBeCloseTo(plan.weeks[i - 1].endWeightKg, 1)
		}
	})

	it('gets cheaper to run as the weight comes off', () => {
		const plan = buildEnergyPlan(input())!
		const first = plan.weeks[0]
		const last = plan.weeks[plan.weeks.length - 1]
		expect(last.bmrKcal).toBeLessThan(first.bmrKcal)
		expect(last.trainingKcal).toBeLessThan(first.trainingKcal)
	})

	it('reaches a realistic goal inside the window and dates it', () => {
		const plan = buildEnergyPlan(input())!
		expect(plan.reachedInPlan).toBe(true)
		expect(plan.goalWeekIndex).not.toBeNull()
		expect(plan.goalDate).not.toBeNull()
		expect(plan.projectedWeightKg).toBeLessThanOrEqual(76.2)
	})

	it('stops losing once it is there, rather than overshooting', () => {
		const plan = buildEnergyPlan(input())!
		const after = plan.weeks[plan.weeks.length - 1]
		expect(after.endWeightKg).toBeGreaterThan(plan.goalWeightKg - 1)
	})

	it('says so, with a date, when the goal cannot be reached in time', () => {
		const plan = buildEnergyPlan(input({ goalWeightKg: 62 }))!
		expect(plan.reachedInPlan).toBe(false)
		expect(plan.goalDate).not.toBeNull()
		expect(plan.goalDate! > plan.weeks[plan.weeks.length - 1].startDate).toBe(true)
		expect(plan.notes.some(n => n.level === 'warn' && /isn't reachable/.test(n.message))).toBe(true)
	})

	it('calls a near miss arriving on time rather than warning about it', () => {
		// A goal reached in the final week can interpolate to a day or two past the
		// end date. That is a rounding artefact, not a reason to move the race.
		const plan = buildEnergyPlan(input({ endDate: '2026-09-24' }))!
		const short = Math.abs(plan.projectedWeightKg - plan.goalWeightKg)
		expect(short).toBeLessThan(0.3)
		expect(plan.notes.some(n => /isn't reachable/.test(n.message))).toBe(false)
		expect(plan.notes.some(n => n.level === 'info' && /on time/.test(n.message))).toBe(true)
	})

	it('warns when the goal weight is underweight for the height', () => {
		const plan = buildEnergyPlan(input({ goalWeightKg: 58 }))!
		expect(plan.notes.some(n => n.level === 'error' && /underweight/.test(n.message))).toBe(true)
	})

	it('warns when there is no training on the calendar to fuel', () => {
		const plan = buildEnergyPlan(input({ sessions: [] }))!
		expect(plan.notes.some(n => /nothing on the calendar/.test(n.message))).toBe(true)
		for (const w of plan.weeks) expect(w.trainingKcal).toBe(0)
	})

	it('adds a surplus rather than a deficit when gaining', () => {
		const plan = buildEnergyPlan(input({ goalWeightKg: 86 }))!
		expect(plan.avgDeficitPerDay).toBeLessThan(0)
		expect(plan.projectedWeightKg).toBeGreaterThan(plan.startWeightKg)
	})

	it('eats what it burns on a maintenance plan', () => {
		const plan = buildEnergyPlan(input({ goalWeightKg: 82 }))!
		expect(Math.abs(plan.avgDeficitPerDay)).toBeLessThan(30)
		expect(plan.notes.some(n => /maintenance plan/.test(n.message))).toBe(true)
	})

	it('counts training into the burn, so the burn beats the baseline', () => {
		const plan = buildEnergyPlan(input())!
		const w = plan.weeks[0]
		expect(w.burnKcal).toBe(w.baselineKcal * 7 + w.trainingKcal)
		expect(plan.avgBurnPerDay).toBeGreaterThan(w.baselineKcal)
	})

	it('leaves the days after the end date unscheduled but still fed', () => {
		// 2026-09-26 is a Saturday, so the final week's Sunday falls past the end.
		const plan = buildEnergyPlan(input())!
		const last = plan.weeks[plan.weeks.length - 1]
		const sunday = last.days[6]
		expect(sunday.trainingKcal).toBe(0)
		expect(sunday.intakeKcal).toBeGreaterThan(0)
	})
})

describe('energySport', () => {
	it('maps the type column however it was cased', () => {
		expect(energySport('Running')).toBe('running')
		expect(energySport('gym')).toBe('gym')
		expect(energySport('Bike')).toBe('bike')
	})

	it('falls back to the session name', () => {
		expect(energySport('', 'Threshold intervals run')).toBe('running')
		expect(energySport(undefined, 'Push day — gym')).toBe('gym')
	})

	it('prices nothing for a rest day', () => {
		expect(energySport('Rest')).toBeNull()
		expect(energySport('', 'Rest')).toBeNull()
	})

	it('treats anything else as a generic session rather than dropping it', () => {
		expect(energySport('Other', 'Yoga')).toBe('other')
	})
})

describe('bmi', () => {
	it('is weight over height squared, in metres', () => {
		expect(bmi(80, 180)).toBeCloseTo(24.7, 1)
	})

	it('is zero rather than infinite without a height', () => {
		expect(bmi(80, 0)).toBe(0)
	})
})
