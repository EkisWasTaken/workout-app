/**
 * The week in review: did you do what you planned, and was it more or less work
 * than usual?
 *
 * Two questions, deliberately kept apart. Adherence is about the plan — sessions
 * done, kilometres run, what got missed. Effort is about the body, measured in
 * heart-rate load, and it's the one that catches the week where you did every
 * session but ran all of them too hard.
 *
 * **Comparing a part-week honestly.** Strava's version compares your
 * week-so-far against the range of *whole* previous weeks, so every week looks
 * low until Sunday. Pro-rating by days elapsed is no better — it assumes effort
 * is spread evenly, and nobody's is when the long run is on Saturday. So the
 * comparison here is like-for-like: effort through Wednesday this week against
 * effort through Wednesday in each previous week.
 *
 * Pure: no stores, no database, no clock of its own.
 */
import { addDays, differenceInCalendarDays, format, getDay, parseISO, startOfWeek } from 'date-fns'

/** Monday = 0 … Sunday = 6. The training week starts on Monday everywhere in this app. */
export const dayIndex = (d: Date): number => (getDay(d) + 6) % 7

export interface EffortPoint {
	date: Date
	/** Heart-rate training load for that session. */
	effort: number
}

export interface PlannedItem {
	date: string
	name: string
	/** Planned distance, km. Zero for sessions that aren't measured in distance. */
	km: number
	done: boolean
	/** Actual distance where the session was completed, km. */
	actualKm?: number
	isRest: boolean
}

/** How many complete weeks of history the comparison looks back over. */
export const HISTORY_WEEKS = 6
/** Fewer complete weeks than this and there's no "usual" to compare against. */
export const MIN_HISTORY_WEEKS = 3

export type EffortVerdict = 'below' | 'in-range' | 'above' | 'unknown'

export interface WeekReview {
	weekStart: string
	/** 0 = Monday of the current week, 6 = Sunday. Where "now" sits in the week. */
	throughDay: number
	planned: { sessions: number; km: number }
	completed: { sessions: number; km: number }
	/** Sessions completed as a share of those planned up to and including today. */
	adherencePct: number | null
	/** Distance covered as a share of the whole week's plan. */
	kmPct: number | null
	/** Sessions whose day has passed without being logged. */
	missed: PlannedItem[]
	/** Heart-rate load so far this week. */
	effort: number
	/** What that figure normally looks like by this point in the week. */
	effortRange: [number, number] | null
	effortVerdict: EffortVerdict
	longestKm: number
	message: string
}

/**
 * Cumulative effort from Monday through `throughDay` in each of the last
 * `weeks` complete weeks, oldest first. The current week is excluded — it is
 * the thing being compared, not part of the baseline.
 */
export function historyThrough(
	efforts: EffortPoint[],
	throughDay: number,
	weeks: number,
	weekStart: Date,
): number[] {
	const out: number[] = []
	for (let w = weeks; w >= 1; w--) {
		const from = addDays(weekStart, -7 * w)
		const total = efforts.reduce((sum, e) => {
			const offset = differenceInCalendarDays(e.date, from)
			return offset >= 0 && offset <= throughDay ? sum + e.effort : sum
		}, 0)
		out.push(total)
	}
	return out
}

/**
 * The band a week has to leave to be worth remarking on.
 *
 * The middle half of recent weeks, widened to at least ±12% of the median so a
 * very consistent block doesn't flag every small wobble as unusual. Null until
 * there's enough history to mean anything.
 */
export function usualRange(history: number[]): [number, number] | null {
	const real = history.filter(v => v > 0)
	if (real.length < MIN_HISTORY_WEEKS) return null

	const sorted = [...real].sort((a, b) => a - b)
	const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]
	const median = at(0.5)
	if (!(median > 0)) return null

	const lo = Math.min(at(0.25), median * 0.88)
	const hi = Math.max(at(0.75), median * 1.12)
	return [lo, hi]
}

export function verdictFor(effort: number, range: [number, number] | null): EffortVerdict {
	if (!range) return 'unknown'
	if (effort < range[0]) return 'below'
	if (effort > range[1]) return 'above'
	return 'in-range'
}

export interface WeekReviewInput {
	today: Date
	/** Every planned session in the current week, rest days included. */
	week: PlannedItem[]
	/** Every effort reading available, across all history. */
	efforts: EffortPoint[]
}

export function weekReview(input: WeekReviewInput): WeekReview {
	const weekStart = startOfWeek(input.today, { weekStartsOn: 1 })
	const throughDay = dayIndex(input.today)

	const sessions = input.week.filter(w => !w.isRest)
	const done = sessions.filter(w => w.done)

	// Only sessions whose day has arrived count against adherence — Thursday's
	// run isn't "missed" on Tuesday.
	const due = sessions.filter(w => dayIndex(parseISO(w.date)) <= throughDay)
	const missed = due.filter(w => !w.done)

	const plannedKm = sessions.reduce((s, w) => s + w.km, 0)
	const completedKm = done.reduce((s, w) => s + (w.actualKm ?? w.km), 0)

	const effort = input.efforts.reduce((sum, e) => {
		const offset = differenceInCalendarDays(e.date, weekStart)
		return offset >= 0 && offset <= throughDay ? sum + e.effort : sum
	}, 0)

	const range = usualRange(historyThrough(input.efforts, throughDay, HISTORY_WEEKS, weekStart))
	const effortVerdict = verdictFor(effort, range)

	const longestKm = done.reduce((max, w) => Math.max(max, w.actualKm ?? w.km), 0)

	return {
		weekStart: format(weekStart, 'yyyy-MM-dd'),
		throughDay,
		planned: { sessions: sessions.length, km: Math.round(plannedKm * 10) / 10 },
		completed: { sessions: done.length, km: Math.round(completedKm * 10) / 10 },
		adherencePct: due.length ? Math.round((due.length - missed.length) / due.length * 100) : null,
		kmPct: plannedKm > 0 ? Math.round((completedKm / plannedKm) * 100) : null,
		missed,
		effort: Math.round(effort),
		effortRange: range ? [Math.round(range[0]), Math.round(range[1])] : null,
		effortVerdict,
		longestKm: Math.round(longestKm * 10) / 10,
		message: reviewMessage(effortVerdict, missed.length, throughDay),
	}
}

/**
 * One sentence about the week. The effort verdict leads, because it's the part
 * you can't see by looking at the calendar.
 */
function reviewMessage(verdict: EffortVerdict, missedCount: number, throughDay: number): string {
	const whole = throughDay === 6
	const soFar = whole ? 'This week' : 'So far this week'

	if (verdict === 'unknown') {
		return missedCount
			? `${missedCount} session${missedCount === 1 ? '' : 's'} missed. A few more weeks of recordings and this will start comparing effort against your usual.`
			: 'A few more weeks of recordings and this will start comparing your effort against what is normal for you.'
	}

	const effortPart =
		verdict === 'above'
			? `${soFar} is harder than you normally train by this point — fine for a build week, worth watching if it keeps up.`
			: verdict === 'below'
				? `${soFar} is easier than your usual. Deliberate in a taper or a down week; otherwise there's room for more.`
				: `${soFar} is right in your usual range.`

	if (!missedCount) return effortPart
	return `${effortPart} ${missedCount} session${missedCount === 1 ? '' : 's'} still outstanding.`
}
