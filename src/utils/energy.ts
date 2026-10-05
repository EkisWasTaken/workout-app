/**
 * Energy and macronutrient planning — a goal weight in, daily targets out.
 *
 * The training plan answers "what do I run this week". This answers the other
 * half: what to eat while doing it, and what that means for the number on the
 * scale by race day.
 *
 * Three ideas hold the whole thing up:
 *
 *  1. **Training is counted, not guessed at.** The usual calculator multiplies
 *     your BMR by an "activity factor" that is supposed to cover both your job
 *     and your marathon block, which is why those numbers are useless to anyone
 *     who actually trains. Here the multiplier covers your *life* only, and
 *     every scheduled session adds its own energy on top. A 30 km Saturday and
 *     a rest Sunday are not the same day and are not given the same target.
 *
 *  2. **The plan re-solves itself every week.** Losing 4 kg makes you cheaper to
 *     run, so the deficit that produced 0.5 kg a week in January produces less
 *     in March. Each week is computed from the weight the previous weeks are
 *     projected to have left you at, so the projection bends the way real weight
 *     loss bends instead of drawing a straight line.
 *
 *  3. **The rails are not negotiable.** No more than 1% of body weight a week,
 *     no more than a quarter off maintenance, and never below your BMR. When the
 *     goal cannot be reached safely in the time available, the plan says so and
 *     gives the date it *can* be reached, rather than quietly prescribing a
 *     crash diet to hit an arbitrary deadline.
 *
 * Everything here is pure: no stores, no database, no clock of its own.
 */
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'

export type Sex = 'male' | 'female'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very'

/**
 * How much energy daily life costs, as a multiple of BMR.
 *
 * Deliberately lower than the familiar Harris-Benedict table, which folds
 * training into the same number. Training is added separately here, so using
 * "very active = 1.725" as well would count every session twice.
 */
export const ACTIVITY_LEVELS = [
	{ value: 'sedentary', label: 'Desk job, little walking', factor: 1.2 },
	{ value: 'light', label: 'Some walking most days', factor: 1.3 },
	{ value: 'moderate', label: 'On your feet most of the day', factor: 1.4 },
	{ value: 'very', label: 'Physical job', factor: 1.55 },
] as const satisfies readonly { value: ActivityLevel; label: string; factor: number }[]

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
	sedentary: 1.2, light: 1.3, moderate: 1.4, very: 1.55,
}

// ─── the rails ────────────────────────────────────────────────────────────────

/** Energy in a kilogram of body mass. The usual 7700 kcal figure. */
export const KCAL_PER_KG = 7700

/** Fastest sane loss, as a fraction of body weight per week. */
export const MAX_LOSS_FRACTION = 0.01
/** …and an absolute ceiling, for heavier athletes where 1% is a lot of kilos. */
export const MAX_LOSS_KG_WEEK = 1.0

/** Gaining is slower than losing if you want the gain to be muscle. */
export const MAX_GAIN_FRACTION = 0.005
export const MAX_GAIN_KG_WEEK = 0.5

/** The deepest cut below maintenance, as a fraction of that day's burn. */
export const MAX_DEFICIT_FRACTION = 0.25
export const MAX_SURPLUS_FRACTION = 0.2

/** Absolute intake floors. The real floor is BMR; these catch the rest. */
export const INTAKE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 }

/** Below this, a goal weight is underweight for the height. */
export const MIN_HEALTHY_BMI = 18.5

// ─── what a session costs ─────────────────────────────────────────────────────

export type EnergySport = 'running' | 'bike' | 'gym' | 'other'

/**
 * Net kilocalories per kilogram per kilometre of running — the cost *above*
 * what you'd have burned lying still for the same time. The familiar 1.036
 * figure is gross, and the baseline below already covers resting metabolism, so
 * using it would count an hour of rest twice.
 */
export const RUN_KCAL_PER_KG_KM = 0.9

/**
 * Net METs by sport, for sessions measured in minutes rather than kilometres.
 * Net, again: a 5-MET gym session is 4 METs above sitting on the sofa.
 */
const NET_METS: Record<EnergySport, number> = { running: 8, bike: 6, gym: 4, other: 3 }

/** What a session of this sport is assumed to last when nothing says otherwise. */
const DEFAULT_MINUTES: Record<EnergySport, number> = { running: 45, bike: 60, gym: 60, other: 45 }

/** One thing on the calendar that costs energy. */
export interface EnergySession {
	date: string
	sport: EnergySport
	km?: number | null
	durationMin?: number | null
	/**
	 * Gross kcal the watch reported for a completed session, and the minutes it
	 * covered. Only runs use it — see `sessionKcal`.
	 */
	recordedKcal?: number | null
	recordedMin?: number | null
}

/**
 * How far a watch's figure may pull a run away from the model's estimate.
 * Wrist-based calorie numbers are loose; a bad HR strap or a GPS-less treadmill
 * file can be off by half, and one bogus recording shouldn't move a day's target
 * by a thousand kcal.
 */
export const RECORDED_KCAL_MIN_RATIO = 0.6
export const RECORDED_KCAL_MAX_RATIO = 1.4

/** kcal per minute from a MET value, the standard ACSM conversion. */
const metKcalPerMin = (mets: number, kg: number) => (mets * 3.5 * kg) / 200

/**
 * The energy a session costs, above rest.
 *
 * Distance wins over duration for running because it's the more reliable input:
 * the cost of running a kilometre barely depends on how fast you cover it,
 * while a duration with no pace attached could be anything.
 */
export function sessionKcal(session: EnergySession, weightKg: number): number {
	const estimate = estimatedKcal(session, weightKg)
	const recorded = recordedNetKcal(session, weightKg)
	if (recorded === null) return estimate
	return Math.round(Math.min(
		estimate * RECORDED_KCAL_MAX_RATIO,
		Math.max(estimate * RECORDED_KCAL_MIN_RATIO, recorded)))
}

function estimatedKcal(session: EnergySession, weightKg: number): number {
	const { sport } = session
	if (sport === 'running' && session.km && session.km > 0) {
		return Math.round(RUN_KCAL_PER_KG_KM * weightKg * session.km)
	}
	const minutes = session.durationMin && session.durationMin > 0
		? session.durationMin
		: DEFAULT_MINUTES[sport]
	return Math.round(metKcalPerMin(NET_METS[sport], weightKg) * minutes)
}

/**
 * A run's watch-reported calories, made net.
 *
 * Watches report gross energy — everything burned during the session, resting
 * metabolism included. The baseline already pays for that, so one MET for the
 * session's minutes comes off before the figure stands in for the estimate.
 *
 * Runs only: running watch numbers come from pace and heart rate and land close
 * to measured cost. Gym figures are heart rate alone and run 20–40% high.
 */
function recordedNetKcal(session: EnergySession, weightKg: number): number | null {
	if (session.sport !== 'running') return null
	const kcal = session.recordedKcal
	const minutes = session.recordedMin
	if (!kcal || !(kcal > 0) || !minutes || !(minutes > 0)) return null
	return Math.max(0, kcal - metKcalPerMin(1, weightKg) * minutes)
}

// ─── resting and baseline burn ────────────────────────────────────────────────

export interface BodyStats {
	weightKg: number
	heightCm: number
	age: number
	sex: Sex
	activityLevel: ActivityLevel
}

/**
 * Basal metabolic rate, Mifflin-St Jeor.
 *
 * Chosen over Harris-Benedict because it's the one that validates best against
 * indirect calorimetry in people who aren't lean athletes — which is most
 * people setting a goal weight.
 */
export function bmr(stats: Pick<BodyStats, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number {
	const base = 10 * stats.weightKg + 6.25 * stats.heightCm - 5 * stats.age
	return Math.round(base + (stats.sex === 'male' ? 5 : -161))
}

/** BMR plus the cost of a day that contains no training. */
export function baselineBurn(stats: BodyStats): number {
	return Math.round(bmr(stats) * ACTIVITY_FACTORS[stats.activityLevel])
}

/** The lowest daily intake this athlete should ever be given. */
export function intakeFloor(stats: Pick<BodyStats, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number {
	return Math.max(bmr(stats), INTAKE_FLOOR[stats.sex])
}

export const bmi = (weightKg: number, heightCm: number) =>
	heightCm > 0 ? weightKg / (heightCm / 100) ** 2 : 0

// ─── macros ───────────────────────────────────────────────────────────────────

export type EnergyMode = 'lose' | 'gain' | 'maintain'

/**
 * Protein, g per kg of body weight.
 *
 * Higher in a deficit, and that isn't a rounding detail: in an energy deficit
 * protein is what decides whether the weight you lose comes off as fat or as
 * the muscle you spent the winter building.
 */
export const PROTEIN_G_PER_KG: Record<EnergyMode, number> = { lose: 2.0, gain: 1.8, maintain: 1.7 }

/** Share of a typical day's energy that comes from fat. */
export const FAT_FRACTION = 0.27
/** …but never below this, which is roughly where hormones start to complain. */
export const MIN_FAT_G_PER_KG = 0.7

/** Endurance work needs carbohydrate; below this a hard week will feel awful. */
export const LOW_CARB_G_PER_KG = 3

export interface Macros {
	proteinG: number
	carbsG: number
	fatG: number
}

/**
 * Split a day's energy into macronutrients.
 *
 * Protein and fat are set by body weight, not by the day's training, so they're
 * the same number every day of the week — which is what makes them a habit
 * rather than arithmetic. Carbohydrate absorbs the difference, which is also
 * what you want physiologically: the extra energy a long run needs is the
 * energy a long run actually runs on.
 *
 * `baseKcal` is the week's average target, so `fatG` doesn't wobble day to day.
 */
export function macrosFor(targetKcal: number, baseKcal: number, weightKg: number, mode: EnergyMode): Macros {
	const proteinG = Math.round(PROTEIN_G_PER_KG[mode] * weightKg)
	const fatG = Math.round(Math.max(MIN_FAT_G_PER_KG * weightKg, (baseKcal * FAT_FRACTION) / 9))
	const carbsG = Math.max(0, Math.round((targetKcal - proteinG * 4 - fatG * 9) / 4))
	return { proteinG, carbsG, fatG }
}

// ─── the plan ─────────────────────────────────────────────────────────────────

export interface EnergyDay {
	date: string
	/** 0 = Sunday, matching `getDay`. */
	weekday: number
	/** Energy the day's sessions cost, above rest. */
	trainingKcal: number
	/** Everything you'll burn: baseline plus training. */
	burnKcal: number
	/** What to eat. */
	intakeKcal: number
	/** burn − intake. Positive is a deficit. */
	deficitKcal: number
	macros: Macros
	/** What's on the calendar that day, for the UI. */
	sports: EnergySport[]
}

export interface EnergyWeek {
	/** 1-based, counting from the first week of the plan. */
	index: number
	/** Monday of the week. */
	startDate: string
	/** Projected weight on the Monday. */
	startWeightKg: number
	/** …and on the Sunday, after the week's deficit. */
	endWeightKg: number
	/** BMR at the week's starting weight. */
	bmrKcal: number
	/** A training-free day's burn. */
	baselineKcal: number
	trainingKcal: number
	/** Total burn across the week. */
	burnKcal: number
	/** Total intake across the week. */
	intakeKcal: number
	/** Average daily deficit. Negative means a surplus. */
	deficitPerDay: number
	/** Weight change the week's intake produces, kg. */
	changeKg: number
	/** True when a rail cut the ask down — the plan wanted more than is safe. */
	capped: boolean
	days: EnergyDay[]
}

export interface EnergyNote {
	level: 'info' | 'warn' | 'error'
	message: string
}

export interface EnergyPlan {
	mode: EnergyMode
	weeks: EnergyWeek[]
	startWeightKg: number
	goalWeightKg: number
	/** Weight at the end of the last week, if the plan is followed. */
	projectedWeightKg: number
	/** 1-based week the goal is reached in. Null when it isn't, in this window. */
	goalWeekIndex: number | null
	/** Projected date the goal is reached — beyond the plan's end if need be. */
	goalDate: string | null
	/** True when the goal lands inside the plan's own date range. */
	reachedInPlan: boolean
	/** Averages across the whole plan, for the headline row. */
	avgIntakePerDay: number
	avgBurnPerDay: number
	avgDeficitPerDay: number
	notes: EnergyNote[]
}

export interface EnergyPlanInput {
	/** Today's weight — ideally the trend weight, not a single morning reading. */
	startWeightKg: number
	goalWeightKg: number
	heightCm: number
	age: number
	sex: Sex
	activityLevel: ActivityLevel
	/** Any date in the first week; the plan starts from that week's Monday. */
	startDate: string
	/** Last date the plan covers, inclusive. Usually race day. */
	endDate: string
	/** Everything on the calendar in that range. */
	sessions: EnergySession[]
	/**
	 * Reach the goal by this date rather than by `endDate`. A race you want to
	 * arrive at race-weight for is usually the same day; a body-composition goal
	 * on its own might be earlier.
	 */
	targetDate?: string | null
}

export interface EnergyProblem {
	field: 'stats' | 'weight' | 'dates'
	message: string
}

/** Everything wrong with the inputs, in plain language. Empty means buildable. */
export function energyProblems(input: EnergyPlanInput): EnergyProblem[] {
	const problems: EnergyProblem[] = []
	if (!(input.startWeightKg > 0)) {
		problems.push({ field: 'weight', message: 'Log a weigh-in, or type your current weight, so there is something to plan from.' })
	}
	if (!(input.goalWeightKg > 0)) {
		problems.push({ field: 'weight', message: 'Set a goal weight.' })
	}
	if (!(input.heightCm >= 120 && input.heightCm <= 230)) {
		problems.push({ field: 'stats', message: 'Height should be between 120 and 230 cm.' })
	}
	if (!(input.age >= 14 && input.age <= 100)) {
		problems.push({ field: 'stats', message: 'Age should be between 14 and 100.' })
	}
	if (planWeeks(input.startDate, input.endDate) < 1) {
		problems.push({ field: 'dates', message: 'The end date is before the week the plan starts in.' })
	}
	return problems
}

/** Whole weeks from `start`'s Monday through the week containing `end`. */
export function planWeeks(startDate: string, endDate: string): number {
	const monday = startOfWeek(parseISO(startDate), { weekStartsOn: 1 })
	const days = differenceInCalendarDays(parseISO(endDate), monday)
	return days < 0 ? 0 : Math.floor(days / 7) + 1
}

/** The fastest weekly change the rails allow at this weight, kg, always positive. */
export function maxRateKgPerWeek(weightKg: number, mode: EnergyMode): number {
	if (mode === 'gain') return Math.min(MAX_GAIN_KG_WEEK, weightKg * MAX_GAIN_FRACTION)
	return Math.min(MAX_LOSS_KG_WEEK, weightKg * MAX_LOSS_FRACTION)
}

/**
 * Weeks to get from one weight to another at the safe maximum rate.
 *
 * Stepped rather than divided, because the safe rate is a percentage of body
 * weight and so falls as you lose: 1% of 90 kg is 0.9 kg, 1% of 75 kg is 0.75.
 */
export function weeksAtMaxRate(fromKg: number, toKg: number): number {
	const mode: EnergyMode = toKg < fromKg ? 'lose' : 'gain'
	const dir = mode === 'lose' ? -1 : 1
	let w = fromKg
	let weeks = 0
	// 520 weeks is ten years; past that the answer is "not like this".
	while (weeks < 520 && (mode === 'lose' ? w > toKg : w < toKg)) {
		const step = maxRateKgPerWeek(w, mode)
		w += dir * Math.min(step, Math.abs(toKg - w))
		weeks++
	}
	return weeks
}

const round = (n: number, dp = 1) => {
	const f = 10 ** dp
	return Math.round(n * f) / f
}

/**
 * Build the plan.
 *
 * Returns null when the inputs can't produce one — call `energyProblems` first
 * to find out why.
 */
export function buildEnergyPlan(input: EnergyPlanInput): EnergyPlan | null {
	if (energyProblems(input).length) return null

	const {
		startWeightKg, goalWeightKg, heightCm, age, sex, activityLevel, sessions,
	} = input

	const totalWeeks = planWeeks(input.startDate, input.endDate)
	const firstMonday = startOfWeek(parseISO(input.startDate), { weekStartsOn: 1 })
	const targetDate = input.targetDate || input.endDate

	const gap = goalWeightKg - startWeightKg
	const mode: EnergyMode = Math.abs(gap) < 0.5 ? 'maintain' : gap < 0 ? 'lose' : 'gain'

	/** Sessions keyed by the day they fall on, so each day is one lookup. */
	const byDate = new Map<string, EnergySession[]>()
	for (const s of sessions) {
		const list = byDate.get(s.date)
		if (list) list.push(s)
		else byDate.set(s.date, [s])
	}

	const weeks: EnergyWeek[] = []
	let weight = startWeightKg
	let goalWeekIndex: number | null = null
	let goalDate: string | null = null

	for (let i = 0; i < totalWeeks; i++) {
		const monday = addDays(firstMonday, i * 7)
		const startWeight = weight

		const stats: BodyStats = { weightKg: startWeight, heightCm, age, sex, activityLevel }
		const bmrKcal = bmr(stats)
		const baselineKcal = baselineBurn(stats)
		const floor = intakeFloor(stats)

		// What each day costs, at this week's weight. The last week usually runs
		// past the end date — those days still have a body to feed, but nothing
		// is scheduled on them.
		const dayLoads = Array.from({ length: 7 }, (_, offset) => {
			const day = addDays(monday, offset)
			const date = format(day, 'yyyy-MM-dd')
			const onDay = date > input.endDate ? [] : (byDate.get(date) ?? [])
			return {
				date,
				weekday: day.getDay(),
				trainingKcal: onDay.reduce((sum, s) => sum + sessionKcal(s, startWeight), 0),
				sports: onDay.map(s => s.sport),
			}
		})

		const trainingKcal = dayLoads.reduce((s, d) => s + d.trainingKcal, 0)
		const burnKcal = baselineKcal * 7 + trainingKcal

		// How fast we'd like to move, given what's left and how long is left to
		// do it in. Weeks past the target date carry on at maintenance.
		const weeksLeft = Math.max(0, weeksUntil(monday, targetDate))
		const remaining = goalWeightKg - weight
		const wanted = weeksLeft > 0 && Math.abs(remaining) >= 0.05 ? remaining / weeksLeft : 0

		// …and how fast we're allowed to.
		const cap = maxRateKgPerWeek(startWeight, wanted < 0 ? 'lose' : 'gain')
		const rate = Math.sign(wanted) * Math.min(Math.abs(wanted), cap)
		const rateCapped = Math.abs(wanted) - Math.abs(rate) > 0.005

		// The energy that rate implies, spread evenly across the week.
		const wantedIntake = burnKcal + rate * KCAL_PER_KG

		// The second rail: never more than a quarter off maintenance either way.
		const lowest = Math.max(floor * 7, burnKcal * (1 - MAX_DEFICIT_FRACTION))
		const highest = burnKcal * (1 + MAX_SURPLUS_FRACTION)
		const weekIntake = Math.min(highest, Math.max(lowest, wantedIntake))
		const energyCapped = Math.abs(weekIntake - wantedIntake) > 50

		// Per day: the week's adjustment applied to each day's own burn, so a long
		// run day eats more than a rest day without changing the week's total.
		const adjustPerDay = (weekIntake - burnKcal) / 7
		const rawDays = dayLoads.map(d => ({
			...d,
			burn: baselineKcal + d.trainingKcal,
			intake: Math.max(floor, Math.round(baselineKcal + d.trainingKcal + adjustPerDay)),
		}))

		// Flooring a day nudges the week's total up, so the projection is taken
		// from what the days actually add up to rather than what we asked for.
		const intakeKcal = rawDays.reduce((s, d) => s + d.intake, 0)
		const changeKg = round((intakeKcal - burnKcal) / KCAL_PER_KG, 3)
		const avgTarget = intakeKcal / 7

		const days: EnergyDay[] = rawDays.map(d => ({
			date: d.date,
			weekday: d.weekday,
			trainingKcal: d.trainingKcal,
			burnKcal: Math.round(d.burn),
			intakeKcal: d.intake,
			deficitKcal: Math.round(d.burn) - d.intake,
			macros: macrosFor(d.intake, avgTarget, startWeight, mode),
			sports: d.sports,
		}))

		const endWeight = round(startWeight + changeKg, 2)

		// The week the goal is crossed. Interpolated within the week, so a goal
		// reached on the Wednesday isn't reported as the following Sunday.
		if (goalWeekIndex === null && mode !== 'maintain' && crosses(startWeight, endWeight, goalWeightKg)) {
			goalWeekIndex = i + 1
			const share = changeKg === 0 ? 1 : (goalWeightKg - startWeight) / changeKg
			goalDate = format(addDays(monday, Math.round(Math.min(6, Math.max(0, share * 7)))), 'yyyy-MM-dd')
		}

		weeks.push({
			index: i + 1,
			startDate: format(monday, 'yyyy-MM-dd'),
			startWeightKg: round(startWeight, 1),
			endWeightKg: round(endWeight, 1),
			bmrKcal,
			baselineKcal,
			trainingKcal,
			burnKcal: Math.round(burnKcal),
			intakeKcal,
			deficitPerDay: Math.round((burnKcal - intakeKcal) / 7),
			changeKg,
			capped: rateCapped || energyCapped,
			days,
		})

		weight = endWeight
	}

	const projectedWeightKg = round(weight, 1)
	const reachedInPlan = goalWeekIndex !== null

	// Not reached inside the window: say when it *would* be, at the safe rate
	// from where the plan leaves off. A date is more useful than "not yet".
	if (!reachedInPlan && mode !== 'maintain') {
		const extra = weeksAtMaxRate(projectedWeightKg, goalWeightKg)
		if (extra > 0 && extra < 520) {
			goalDate = format(addDays(firstMonday, (totalWeeks + extra) * 7 - 1), 'yyyy-MM-dd')
		}
	}

	const totalDays = weeks.length * 7
	const sumBurn = weeks.reduce((s, w) => s + w.burnKcal, 0)
	const sumIntake = weeks.reduce((s, w) => s + w.intakeKcal, 0)

	const plan: EnergyPlan = {
		mode,
		weeks,
		startWeightKg: round(startWeightKg, 1),
		goalWeightKg: round(goalWeightKg, 1),
		projectedWeightKg,
		goalWeekIndex,
		goalDate,
		reachedInPlan,
		avgIntakePerDay: Math.round(sumIntake / totalDays),
		avgBurnPerDay: Math.round(sumBurn / totalDays),
		avgDeficitPerDay: Math.round((sumBurn - sumIntake) / totalDays),
		notes: [],
	}
	plan.notes = energyNotes(plan, input)
	return plan
}

/**
 * How close to the goal counts as arriving.
 *
 * Without it, a projection that lands at 76.03 kg against a 76 kg goal reports
 * the goal as unreachable and offers a date three weeks later — which is a
 * rounding error dressed up as a verdict. A hundred grams is well inside the
 * noise of anything this model can claim to predict.
 */
export const GOAL_TOLERANCE_KG = 0.1

/**
 * How far short a projection may finish and still count as arriving on time.
 *
 * Wider than `GOAL_TOLERANCE_KG`, which decides whether a week crosses the goal
 * at all. This one decides how the verdict is *worded*: finishing 200 g out by
 * race day is not a failed plan, and telling someone to move their race over it
 * would be absurd.
 */
export const NEAR_ENOUGH_KG = 0.3

/** Whether a week's projected change takes the athlete past the goal. */
function crosses(from: number, to: number, goal: number): boolean {
	return to <= from
		? to <= goal + GOAL_TOLERANCE_KG && from >= goal - GOAL_TOLERANCE_KG
		: to >= goal - GOAL_TOLERANCE_KG && from <= goal + GOAL_TOLERANCE_KG
}

/** Whole weeks from a Monday to a date, rounded up — 0 once the date has passed. */
function weeksUntil(monday: Date, date: string): number {
	const days = differenceInCalendarDays(parseISO(date), monday)
	return days <= 0 ? 0 : Math.ceil(days / 7)
}

/**
 * The plan's verdict, in sentences.
 *
 * This is the part people read. A table of numbers doesn't tell you that your
 * goal is three weeks further away than your race, or that the deficit you've
 * asked for leaves a 30 km long run running on 200 g of carbohydrate.
 */
function energyNotes(plan: EnergyPlan, input: EnergyPlanInput): EnergyNote[] {
	const notes: EnergyNote[] = []
	const { mode, weeks } = plan
	const targetDate = input.targetDate || input.endDate

	if (mode === 'maintain') {
		notes.push({
			level: 'info',
			message: `You're within half a kilo of your goal, so this is a maintenance plan: eat what you burn, and let the training change your shape rather than your weight.`,
		})
	}

	// Does it land in time?
	if (mode !== 'maintain') {
		const short = round(Math.abs(plan.projectedWeightKg - plan.goalWeightKg), 1)
		if (plan.goalDate && plan.goalDate <= targetDate) {
			notes.push({
				level: 'info',
				message: `On these targets you reach ${plan.goalWeightKg} kg around ${plan.goalDate}, ${plan.goalDate < targetDate ? 'ahead of' : 'on'} your ${targetDate} date.`,
			})
		} else if (plan.goalDate && short <= NEAR_ENOUGH_KG) {
			// A projection that finishes a few hundred grams out has not failed.
			// Reporting "0.1 kg short" as a warning, with a date a week later, is
			// false precision about a number that moves that much overnight.
			notes.push({
				level: 'info',
				message: `This puts you at about ${plan.projectedWeightKg} kg by ${targetDate} — ${short > 0 ? `${short} kg` : 'a rounding error'} off your goal, which is less than a single weigh-in moves. Treat it as arriving on time.`,
			})
		} else if (plan.goalDate) {
			notes.push({
				level: 'warn',
				message: `${plan.goalWeightKg} kg by ${targetDate} isn't reachable at a safe rate — you'd finish about ${short} kg short. The fastest this can honestly go puts you there around ${plan.goalDate}. Move the date, or move the goal.`,
			})
		} else {
			notes.push({
				level: 'error',
				message: `That goal is too far from where you are for this to project a date. Set an intermediate goal — a few kilos at a time — and come back to it.`,
			})
		}
	}

	// Did the rails bite?
	const cappedWeeks = weeks.filter(w => w.capped).length
	if (cappedWeeks) {
		notes.push({
			level: 'warn',
			message: `${cappedWeeks} of ${weeks.length} weeks were held back to a safe rate: at most 1% of body weight a week, and never more than a quarter below what you burn. Going faster than that costs muscle and the quality of your sessions, not just fat.`,
		})
	}

	// Is the goal weight sensible for the height?
	const goalBmi = bmi(plan.goalWeightKg, input.heightCm)
	if (goalBmi && goalBmi < MIN_HEALTHY_BMI) {
		notes.push({
			level: 'error',
			message: `${plan.goalWeightKg} kg at ${input.heightCm} cm is a BMI of ${goalBmi.toFixed(1)}, which is underweight. BMI is a blunt instrument for athletes, but this far below the healthy range it's worth a conversation with a doctor rather than a calculator.`,
		})
	}

	// Will the hard weeks have the fuel to run on?
	const worst = weeks
		.map(w => ({ w, carbs: Math.min(...w.days.filter(d => d.trainingKcal > 0).map(d => d.macros.carbsG / w.startWeightKg)) }))
		.filter(x => Number.isFinite(x.carbs))
		.sort((a, b) => a.carbs - b.carbs)[0]
	if (worst && worst.carbs < LOW_CARB_G_PER_KG) {
		notes.push({
			level: 'warn',
			message: `On the leanest training days this leaves under ${LOW_CARB_G_PER_KG} g of carbohydrate per kg of body weight. That's enough to get through an easy run and not enough to do a good interval session on — expect the hard days to suffer first if you hold the deficit through them.`,
		})
	}

	const peak = weeks.reduce((a, b) => (b.trainingKcal > a.trainingKcal ? b : a), weeks[0])
	if (peak && peak.trainingKcal > 0) {
		notes.push({
			level: 'info',
			message: `Your biggest week is week ${peak.index}, where training alone costs about ${Math.round(peak.trainingKcal).toLocaleString()} kcal — ${Math.round(peak.trainingKcal / 7)} kcal a day on top of everything else.`,
		})
	} else {
		notes.push({
			level: 'warn',
			message: `There's nothing on the calendar in this range, so these targets assume you do no training at all. Build a training plan first and the numbers will account for it.`,
		})
	}

	return notes
}

// ─── turning a schedule into sessions ─────────────────────────────────────────

/**
 * Map a scheduled or planned session onto the four sports this model prices.
 *
 * Deliberately separate from `getWorkoutType`: that one has a 'rest' case, and a
 * rest day costs nothing and shouldn't appear here at all.
 */
export function energySport(type: string | undefined | null, name = ''): EnergySport | null {
	const t = (type || '').toLowerCase()
	const n = name.toLowerCase()
	if (t === 'rest' || t === 'rest day' || (!t && n.includes('rest'))) return null
	if (t === 'gym' || t === 'strength' || n.includes('gym') || n.includes('strength') || n.includes('weights')) return 'gym'
	if (t === 'running' || t === 'run' || n.includes('run') || n.includes('jog')) return 'running'
	if (t === 'bike' || t === 'cycling' || t === 'cycle' || n.includes('bike') || n.includes('cycl')) return 'bike'
	return 'other'
}

export const SPORT_LABELS: Record<EnergySport, string> = {
	running: 'Run', bike: 'Bike', gym: 'Gym', other: 'Session',
}
