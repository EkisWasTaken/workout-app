/**
 * Looking back at a week: did the fuelling work?
 *
 * The plan sets a target. This asks what actually happened, and it has to do it
 * without any food logging at all — because nobody sustains food logging, and a
 * feature that only works for people who do is a feature for nobody.
 *
 * So it works backwards from the two things the app *does* know:
 *
 *   **What you burned.** Not what the plan assumed you'd burn — what the
 *   sessions you actually completed cost. Skipping the long run doesn't just
 *   mean a missed session; it means the week's deficit was 1,400 kcal shallower
 *   than the plan thought, and that is the single most common reason a plan
 *   "stops working".
 *
 *   **What your weight did.** Trend weight on the Monday against trend weight
 *   on the Sunday.
 *
 * Energy balance then gives the rest: if you burned 19,000 kcal and lost 0.2 kg,
 * you ate about 17,500 — whatever you believe you ate. That number is the
 * feedback, and it's the one a coach would compute.
 *
 * **The honesty problem.** One week of body weight is a terrible measurement. A
 * salty dinner or a missed bowel movement moves the trend further than a 300
 * kcal-a-day error does, so a single week can't tell those apart and this
 * refuses to pretend otherwise: a verdict needs a gap bigger than the noise,
 * and the noise floor only falls as weeks accumulate. Four weeks can see what
 * one week cannot, which is why the aggregate is reported alongside.
 *
 * Pure: no stores, no database, no clock of its own.
 */
import { addDays, format, parseISO } from 'date-fns'
import { KCAL_PER_KG, sessionKcal, type EnergySport, type EnergyWeek } from './energy'

/** A session on the calendar, and whether it got done. */
export interface LoggedSession {
	date: string
	sport: EnergySport
	/** Planned distance, km. */
	km?: number | null
	/** Planned duration, minutes. */
	durationMin?: number | null
	done: boolean
	/** What was actually covered, where a recording says. Falls back to `km`. */
	actualKm?: number | null
	/** What it actually took, where the session was logged. Falls back to plan. */
	actualMin?: number | null
	/** Gross kcal the watch reported, and the minutes they cover. */
	recordedKcal?: number | null
	recordedMin?: number | null
}

/**
 * How big a daily gap has to be before one week of weight data can see it.
 *
 * 300 kcal a day is 2,100 a week, about 0.27 kg — roughly the week-to-week
 * scatter of a trend weight from someone weighing in most days. Below that, a
 * verdict would be reading tea leaves.
 */
export const NOISE_KCAL_PER_DAY = 300

/** A weigh-in this far from the week's edge can't speak for it. */
export const WEIGH_IN_WINDOW_DAYS = 4

export type FuelVerdict = 'on-track' | 'over' | 'under' | 'unknown'

export interface FuelWeekReview {
	weekStart: string
	weekEnd: string
	/** 6 once the week is complete; lower while it is still running. */
	throughDay: number
	complete: boolean

	// ─ the training half ─
	planned: { sessions: number; km: number; trainingKcal: number }
	/**
	 * The subset of the plan whose day has arrived. Identical to `planned` once
	 * the week is over; on a Tuesday it is what stops the review reporting
	 * Saturday's long run as missed.
	 */
	due: { sessions: number; trainingKcal: number }
	completed: { sessions: number; km: number; trainingKcal: number }
	/** Sessions completed as a share of those due. Null with nothing due. */
	adherencePct: number | null
	/** Training energy done as a share of what was due by now. */
	loadPct: number | null

	// ─ the fuelling half ─
	/** What the plan assumed you'd burn, kcal per day. */
	plannedBurnPerDay: number
	/** What the sessions you completed actually cost, kcal per day. */
	actualBurnPerDay: number
	/** The intake the plan asked for, kcal per day. */
	targetIntakePerDay: number
	/** Weight the week began and ended at, from the trend. Null without weigh-ins. */
	startWeightKg: number | null
	endWeightKg: number | null
	actualChangeKg: number | null
	/** What the plan said the week would do to your weight. */
	predictedChangeKg: number
	/** What you must have eaten, given the burn and the weight change. */
	impliedIntakePerDay: number | null
	/** Implied minus target. Positive means you ate more than the plan asked. */
	intakeGapPerDay: number | null
	verdict: FuelVerdict
	/** Why there's no verdict, when there isn't. */
	unknownReason: 'weight' | 'noise' | 'partial' | null
	message: string
}

const round = (n: number, dp = 1) => {
	const f = 10 ** dp
	return Math.round(n * f) / f
}

export interface FuelWeekInput {
	/** The week as the plan laid it out. */
	week: EnergyWeek
	/** Every session scheduled in that week, with what became of it. */
	sessions: LoggedSession[]
	/** Trend weight on the Monday, and on the Sunday. Null when unmeasured. */
	startWeightKg: number | null
	endWeightKg: number | null
	/** 0 = Monday … 6 = Sunday. How much of the week has happened. */
	throughDay?: number
}

/**
 * One week, judged.
 *
 * The burn is recomputed at the week's own starting weight rather than reused
 * from the plan, because the plan priced a long run that may not have happened
 * — and pricing the week by what was planned would hide exactly the failure
 * this is for.
 */
export function reviewFuelWeek(input: FuelWeekInput): FuelWeekReview {
	const { week, sessions } = input
	const throughDay = Math.max(0, Math.min(6, input.throughDay ?? 6))
	const complete = throughDay >= 6
	const weightKg = week.startWeightKg

	const cost = (s: LoggedSession, actual: boolean) => sessionKcal({
		date: s.date,
		sport: s.sport,
		km: actual ? (s.actualKm ?? s.km) : s.km,
		durationMin: actual ? (s.actualMin ?? s.durationMin) : s.durationMin,
		recordedKcal: actual ? s.recordedKcal : null,
		recordedMin: actual ? s.recordedMin : null,
	}, weightKg)

	const done = sessions.filter(s => s.done)
	const plannedKm = sessions.reduce((sum, s) => sum + (s.km || 0), 0)
	const completedKm = done.reduce((sum, s) => sum + (s.actualKm ?? s.km ?? 0), 0)
	const plannedKcal = sessions.reduce((sum, s) => sum + cost(s, false), 0)
	const completedKcal = done.reduce((sum, s) => sum + cost(s, true), 0)

	// Only the days that have happened count, so a Wednesday review isn't
	// reported as 17% adherence because Saturday hasn't arrived yet.
	const due = sessions.filter(s => dayOffset(week.startDate, s.date) <= throughDay)
	const dueDone = due.filter(s => s.done)
	const dueKcal = due.reduce((sum, s) => sum + cost(s, false), 0)

	const days = throughDay + 1
	const baselineSoFar = week.baselineKcal * days
	const plannedBurnSoFar = complete
		? week.burnKcal
		: baselineSoFar + week.days.slice(0, days).reduce((s, d) => s + d.trainingKcal, 0)
	const actualBurnSoFar = baselineSoFar + completedKcal
	const targetIntakeSoFar = complete
		? week.intakeKcal
		: week.days.slice(0, days).reduce((s, d) => s + d.intakeKcal, 0)

	// Energy balance, run backwards: burn plus whatever the scale says you
	// stored or spent is what went in.
	const actualChangeKg = input.startWeightKg !== null && input.endWeightKg !== null
		? round(input.endWeightKg - input.startWeightKg, 2)
		: null
	const impliedIntake = actualChangeKg === null
		? null
		: actualBurnSoFar + actualChangeKg * KCAL_PER_KG

	const targetIntakePerDay = Math.round(targetIntakeSoFar / days)
	const impliedIntakePerDay = impliedIntake === null ? null : Math.round(impliedIntake / days)
	const intakeGapPerDay = impliedIntakePerDay === null
		? null
		: impliedIntakePerDay - targetIntakePerDay

	// A part-week's weight change is noisier still, so the bar rises as the
	// window shrinks: half a week of data is not half a verdict.
	const noise = NOISE_KCAL_PER_DAY * Math.sqrt(7 / days)

	let verdict: FuelVerdict = 'unknown'
	let unknownReason: FuelWeekReview['unknownReason'] = null
	if (intakeGapPerDay === null) {
		unknownReason = 'weight'
	} else if (days < 4) {
		unknownReason = 'partial'
	} else if (Math.abs(intakeGapPerDay) < noise) {
		verdict = 'on-track'
	} else {
		verdict = intakeGapPerDay > 0 ? 'over' : 'under'
	}

	const review: FuelWeekReview = {
		weekStart: week.startDate,
		weekEnd: format(addDays(parseISO(week.startDate), 6), 'yyyy-MM-dd'),
		throughDay,
		complete,
		planned: {
			sessions: sessions.length,
			km: round(plannedKm),
			trainingKcal: Math.round(plannedKcal),
		},
		due: { sessions: due.length, trainingKcal: Math.round(dueKcal) },
		completed: {
			sessions: done.length,
			km: round(completedKm),
			trainingKcal: Math.round(completedKcal),
		},
		adherencePct: due.length ? Math.round((dueDone.length / due.length) * 100) : null,
		loadPct: dueKcal > 0 ? Math.round((completedKcal / dueKcal) * 100) : null,
		plannedBurnPerDay: Math.round(plannedBurnSoFar / days),
		actualBurnPerDay: Math.round(actualBurnSoFar / days),
		targetIntakePerDay,
		startWeightKg: input.startWeightKg,
		endWeightKg: input.endWeightKg,
		actualChangeKg,
		predictedChangeKg: week.changeKg,
		impliedIntakePerDay,
		intakeGapPerDay,
		verdict,
		unknownReason,
		message: '',
	}
	review.message = weekMessage(review)
	return review
}

/** 0 for the Monday of `weekStart`, 6 for the Sunday. */
function dayOffset(weekStart: string, date: string): number {
	const diff = Math.round(
		(parseISO(date).getTime() - parseISO(weekStart).getTime()) / 86_400_000)
	return diff
}

/**
 * The sentence. It leads with the training, because a missed long run explains
 * a shallow deficit and no amount of dietary advice will.
 */
function weekMessage(r: FuelWeekReview): string {
	const kcal = (n: number) => Math.abs(Math.round(n)).toLocaleString()
	const missed = r.due.sessions - r.completed.sessions
	const burnShort = r.plannedBurnPerDay - r.actualBurnPerDay

	// Worth saying only when the shortfall is big enough to matter to the
	// deficit. A skipped warm-up is not a story.
	const training = r.loadPct !== null && r.loadPct < 85 && burnShort >= 50
		? `You've done ${r.loadPct}% of the training due so far${missed > 0 ? ` (${missed} session${missed === 1 ? '' : 's'} missed)` : ''}, so you burned about ${kcal(burnShort)} kcal a day less than the targets assumed.`
		: null

	if (r.unknownReason === 'weight') {
		return [training, `Weigh in at both ends of a week and this can work out what you actually ate from what you actually burned — no food logging required.`]
			.filter(Boolean).join(' ')
	}
	if (r.unknownReason === 'partial') {
		return [training, `Too early in the week to read anything into the scale yet.`]
			.filter(Boolean).join(' ')
	}

	const gap = r.intakeGapPerDay!
	const body = r.verdict === 'on-track'
		? `Your weight moved about the way the plan predicted, so your intake was within the noise of ${kcal(r.targetIntakePerDay)} kcal a day. Nothing to change.`
		: r.verdict === 'over'
			? `Your weight suggests you averaged around ${kcal(r.impliedIntakePerDay!)} kcal a day — about ${kcal(gap)} above the target. One week of scale data can't separate that from water, but if next week says the same, it's real.`
			: `Your weight suggests you averaged around ${kcal(r.impliedIntakePerDay!)} kcal a day — about ${kcal(gap)} below the target. Under-eating a training block costs sessions before it costs fat.`

	return [training, body].filter(Boolean).join(' ')
}

// ─── the aggregate ────────────────────────────────────────────────────────────

export interface FuelTrend {
	weeks: FuelWeekReview[]
	/** Weeks that had weigh-ins at both ends and so could be measured. */
	measured: number
	/** Average daily gap across those weeks. */
	gapPerDay: number | null
	/** Average target across them, for context. */
	targetPerDay: number | null
	verdict: FuelVerdict
	message: string
}

/**
 * Several weeks together, which is the only way the number becomes trustworthy.
 *
 * Weight noise is roughly independent week to week, so averaging four weeks
 * shrinks it by about half — the same 150 kcal error that one week cannot see
 * becomes visible in a month. The threshold is lowered to match rather than
 * kept at the single-week value, which would throw away exactly the precision
 * the extra weeks bought.
 */
export function fuelTrend(weeks: FuelWeekReview[]): FuelTrend {
	const measured = weeks.filter(w => w.intakeGapPerDay !== null)
	const n = measured.length

	if (!n) {
		return {
			weeks, measured: 0, gapPerDay: null, targetPerDay: null, verdict: 'unknown',
			message: 'No week yet has weigh-ins at both ends. A couple of readings a week is all this needs.',
		}
	}

	const gapPerDay = Math.round(measured.reduce((s, w) => s + w.intakeGapPerDay!, 0) / n)
	const targetPerDay = Math.round(measured.reduce((s, w) => s + w.targetIntakePerDay, 0) / n)
	const noise = NOISE_KCAL_PER_DAY / Math.sqrt(n)

	const verdict: FuelVerdict = n < 2
		? measured[0].verdict
		: Math.abs(gapPerDay) < noise ? 'on-track' : gapPerDay > 0 ? 'over' : 'under'

	const kcal = (v: number) => Math.abs(v).toLocaleString()
	const span = `${n} week${n === 1 ? '' : 's'}`
	const message = n < 2
		? `One measured week so far. Two more and the scale's noise averages out enough to trust the number.`
		: verdict === 'on-track'
			? `Across ${span} your weight has tracked the plan to within ${kcal(gapPerDay)} kcal a day. Over that many weeks that is a real answer, not noise: the targets are right and you are hitting them.`
			: verdict === 'over'
				? `Across ${span} your weight says you've averaged about ${kcal(gapPerDay)} kcal a day more than target. Averaged over that long it's past what water can explain — either eat closer to the target, or move the target and accept the later date.`
				: `Across ${span} your weight says you've averaged about ${kcal(gapPerDay)} kcal a day under target. That's a bigger deficit than planned: it will cost you sessions, and eventually muscle.`

	return { weeks, measured: n, gapPerDay, targetPerDay, verdict, message }
}
