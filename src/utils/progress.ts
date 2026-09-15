/**
 * Progress metrics — "am I getting better?", answered per sport.
 *
 * The old Home page led with VDOT, which is a *race-readiness* number: a
 * trailing maximum over hard efforts. It only moves when you race, so it can't
 * show progress. Everything here moves from what you do every week instead:
 *
 *   running  pace at a fixed heart rate, volume, longest run, consistency
 *   gym      load per session, weekly volume, per-split trends, consistency
 *   bike     estimated power at a fixed heart rate, volume, climbing
 *   body     trend weight and its rate toward the goal
 *
 * Three rules keep the numbers trustworthy:
 *
 *  1. **One window, everywhere.** Every headline is a rolling 28 calendar days
 *     ending today, compared with the 28 days before. The old code mixed rolling
 *     windows with calendar weeks, so on a Monday "the last four weeks" held
 *     three weeks and a morning, and volume read as declining every week.
 *
 *  2. **The chart is the number.** A metric's trend line is the same rolling
 *     28-day value evaluated at weekly points — its last point *is* the
 *     headline, and the point four weeks back *is* the comparison. Nothing on the
 *     card can disagree with anything else on it.
 *
 *  3. **Noise isn't news.** A verdict needs enough samples and a change larger
 *     than the scatter in them. Too few runs gets "too few to call", not a
 *     confident arrow in a random direction.
 *
 * Everything in this file is pure: no stores, no localStorage, no `new Date()`
 * except as a default argument.
 */
import { addDays, endOfWeek, format, parseISO, startOfDay, startOfWeek, subWeeks } from 'date-fns'
import { estimateBikePower, fitnessSeries, gradeAdjustedPace, relativeEffort } from './analysis'
import { gymSplit } from './workouts'
import { fmtPace } from './vdot'
import type { Workout } from '@/types'

// ─── the shape every headline number takes ────────────────────────────────────

export type Direction = 'improving' | 'holding' | 'declining' | 'unknown'

export interface Metric {
	key: string
	label: string
	/** The number itself, or null when we don't have the data to compute it. */
	value: number | null
	/** The same measure over the immediately preceding 28 days. */
	previous: number | null
	/** value − previous, in the metric's own units. Null without a baseline. */
	delta: number | null
	/** Signed relative change, e.g. -0.04 for 4% faster. Null without a baseline. */
	deltaPct: number | null
	unit: string
	/** Preformatted for the UI so the template never does arithmetic. */
	display: string
	previousDisplay: string | null
	deltaDisplay: string | null
	/** Whether a rise is good. Pace says no; body weight depends on the goal. */
	higherIsBetter: boolean
	/** Verdict after accounting for `higherIsBetter`, sample size and noise. */
	direction: Direction
	/** Why the direction is unknown, when it is. */
	unknownReason: 'baseline' | 'thin' | null
	/** One sentence explaining what the number means for progress. */
	note: string
	/**
	 * The metric's rolling value at weekly points, oldest first. The last entry is
	 * `value`; the entry `COMPARE_OFFSET` from the end is `previous`. Null where
	 * there wasn't enough data in that window.
	 */
	trend: (number | null)[]
	/** `trend`, formatted like `display`, for hover readouts. */
	trendDisplay: (string | null)[]
	/** Draw the trend upside down, so that for pace "faster" still reads as up. */
	invertTrend: boolean
	/** Twelve-week fitted trend, for session-based metrics. */
	longTrend: LongTrend | null
	/** What the number is built from, e.g. "median of 7 runs · 5 in the 28 days before". */
	basis: string | null
	/** When `value` is null: why, and what the user can do about it. */
	missing: string | null
}

/** The comparison window. Four weeks is long enough to survive one bad week. */
export const PERIOD_DAYS = 28

/** How many weekly points a trend line carries. */
export const TREND_WEEKS = 12

/** Index offset from the end of a trend to the comparison point (28 days back). */
export const COMPARE_OFFSET = PERIOD_DAYS / 7

/** Fewer samples than this in either window and a sample metric won't give a verdict. */
export const MIN_SAMPLES = 3

export interface Period {
	from: Date
	/** Exclusive. */
	to: Date
}

/** `days` whole calendar days, ending with — and including — the day of `end`. */
export function windowEnding(end: Date, days = PERIOD_DAYS): Period {
	const to = addDays(startOfDay(end), 1)
	return { from: addDays(to, -days), to }
}

/** The current period and the equal-length one before it. */
export function periods(today = new Date(), days = PERIOD_DAYS): { current: Period; previous: Period } {
	return {
		current: windowEnding(today, days),
		previous: windowEnding(addDays(today, -days), days),
	}
}

export const inPeriod = (date: Date, p: Period) => date >= p.from && date < p.to

/** Trend anchors: today, and every seven days back from it. Oldest first. */
export function trendAnchors(today = new Date(), weeks = TREND_WEEKS): Date[] {
	return Array.from({ length: weeks }, (_, i) => addDays(today, -7 * (weeks - 1 - i)))
}

export interface Week {
	start: Date
	end: Date
	label: string
}

/** The last `count` Monday-started weeks, oldest first, ending with this one. */
export function weekWindows(count: number, today = new Date()): Week[] {
	const thisWeek = startOfWeek(today, { weekStartsOn: 1 })
	const out: Week[] = []
	for (let i = count - 1; i >= 0; i--) {
		const start = subWeeks(thisWeek, i)
		out.push({ start, end: endOfWeek(start, { weekStartsOn: 1 }), label: format(start, 'd/M') })
	}
	return out
}

const round = (n: number, dp = 1) => {
	const f = 10 ** dp
	return Math.round(n * f) / f
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

export function median(xs: number[]): number | null {
	if (!xs.length) return null
	const s = [...xs].sort((a, b) => a - b)
	const mid = Math.floor(s.length / 2)
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function sd(xs: number[]): number {
	if (xs.length < 2) return 0
	const m = mean(xs)!
	return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

/** Standard error of a median, for roughly normal data. */
const seMedian = (xs: number[]) => (xs.length ? (1.253 * sd(xs)) / Math.sqrt(xs.length) : Infinity)

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// ─── verdicts ─────────────────────────────────────────────────────────────────

/**
 * How a metric decides whether it moved.
 *
 *  samples   a median over individual sessions. Needs `minSamples` in both
 *            windows, and a change bigger than both 1.5 standard errors and
 *            `minRel` — so four scattered runs can't manufacture a trend.
 *  relative  a total (distance, tonnage). Moves when the change exceeds `band`.
 *  absolute  moves when |change| exceeds `band` in the metric's own units.
 *  count     sessions. Needs at least `minAbs` more or fewer *and* `band`.
 */
export type Verdict =
	| { kind: 'samples'; current: number[]; previous: number[]; minRel: number; minSamples?: number }
	| { kind: 'relative'; band: number }
	| { kind: 'absolute'; band: number }
	| { kind: 'count'; current: number; previous: number; minAbs: number; band: number }

export interface MetricSpec {
	key: string
	label: string
	unit: string
	current: number | null
	previous: number | null
	higherIsBetter?: boolean
	trend?: (number | null)[]
	invertTrend?: boolean
	longTrend?: LongTrend | null
	basis?: string | null
	/** How to render the value. Defaults to one decimal place. */
	format?: (v: number) => string
	/** How to render the change. Defaults to `format` of the absolute delta. */
	formatDelta?: (v: number) => string
	/** Overrides the generated sentence. Receives the finished metric. */
	note?: (m: Omit<Metric, 'note'>) => string
	/** Explains a null `current`. */
	missing?: string | null
	/** Defaults to a 2% relative band. */
	verdict?: Verdict
}

/** A sentence explaining that there's too little data to call a direction. */
export const THIN_NOTE = `Too few sessions in one of the two 28-day windows to call a direction yet.`

function decide(spec: MetricSpec, delta: number | null, deltaPct: number | null): { direction: Direction; unknownReason: Metric['unknownReason'] } {
	const { current, previous, higherIsBetter = true } = spec
	const verdict = spec.verdict ?? { kind: 'relative', band: 0.02 }
	if (current === null) return { direction: 'unknown', unknownReason: null }

	const moved = (): boolean | 'thin' | null => {
		switch (verdict.kind) {
			case 'samples': {
				const need = verdict.minSamples ?? MIN_SAMPLES
				if (verdict.current.length < need || verdict.previous.length < need) return 'thin'
				if (delta === null || deltaPct === null) return null
				const se = Math.sqrt(seMedian(verdict.current) ** 2 + seMedian(verdict.previous) ** 2)
				return Math.abs(delta) > 1.5 * se && Math.abs(deltaPct) >= verdict.minRel
			}
			case 'relative':
				if (deltaPct === null) return null
				return Math.abs(deltaPct) >= verdict.band
			case 'absolute':
				if (delta === null) return null
				return Math.abs(delta) >= verdict.band
			case 'count': {
				if (previous === null) return null
				const d = verdict.current - verdict.previous
				const base = Math.max(1, verdict.previous)
				return Math.abs(d) >= verdict.minAbs && Math.abs(d) / base >= verdict.band
			}
		}
	}

	const m = moved()
	// A first period with nothing to compare against isn't progress or
	// regression — it's a baseline. Say so rather than invent a verdict.
	if (m === null) return { direction: 'unknown', unknownReason: 'baseline' }
	if (m === 'thin') return { direction: 'unknown', unknownReason: 'thin' }
	if (!m) return { direction: 'holding', unknownReason: null }
	const rising = (delta ?? 0) > 0
	return { direction: rising === higherIsBetter ? 'improving' : 'declining', unknownReason: null }
}

/** Assemble a metric, working out the direction and a default sentence. */
export function buildMetric(spec: MetricSpec): Metric {
	const {
		key, label, unit, current, previous,
		higherIsBetter = true,
		trend = [],
		basis = null,
		format: fmt = (v: number) => String(round(v)),
	} = spec
	const fmtDelta = spec.formatDelta ?? fmt

	const hasBoth = current !== null && previous !== null && Number.isFinite(previous)
	const delta = hasBoth ? current! - previous! : null
	const deltaPct = hasBoth && previous !== 0 ? (current! - previous!) / Math.abs(previous!) : null
	const { direction, unknownReason } = decide(spec, delta, deltaPct)

	const base: Omit<Metric, 'note'> = {
		key,
		label,
		value: current,
		previous,
		delta,
		deltaPct,
		unit,
		display: current === null ? '—' : fmt(current),
		previousDisplay: previous === null ? null : fmt(previous),
		deltaDisplay: delta === null || delta === 0 ? null : fmtDelta(Math.abs(delta)),
		higherIsBetter,
		direction,
		unknownReason,
		trend,
		trendDisplay: trend.map(v => (v === null ? null : fmt(v))),
		invertTrend: spec.invertTrend ?? false,
		longTrend: spec.longTrend ?? null,
		basis: current === null ? null : basis,
		missing: current === null ? (spec.missing ?? null) : null,
	}

	return { ...base, note: spec.note ? spec.note(base) : defaultNote(base) }
}

function defaultNote(m: Omit<Metric, 'note'>): string {
	if (m.value === null) return m.missing ?? 'Not enough data yet.'
	if (m.unknownReason === 'thin') return THIN_NOTE
	switch (m.direction) {
		case 'improving':
			return `Better than the previous ${PERIOD_DAYS} days by ${m.deltaDisplay} ${m.unit}.`
		case 'declining':
			return `Down ${m.deltaDisplay} ${m.unit} on the previous ${PERIOD_DAYS} days.`
		case 'holding':
			return `Level with the previous ${PERIOD_DAYS} days.`
		default:
			return `Your baseline for the last ${PERIOD_DAYS} days. Keep logging and the trend appears here.`
	}
}

/** Evaluate `fn` over the 28-day window ending at each trend anchor. */
function rollingTrend(today: Date, fn: (p: Period) => number | null): (number | null)[] {
	return trendAnchors(today).map(anchor => fn(windowEnding(anchor)))
}

// ─── sessions and activities ──────────────────────────────────────────────────

/** A recorded activity. Deliberately loose — imports vary in what they carry. */
export type Act = Record<string, any>

/**
 * When an activity happened, in local time. The parser writes `start_date_local`
 * without a zone, so `new Date()` reads it as local wall time — which is what we
 * want for "which day was this".
 */
export const actDate = (a: Act): Date => new Date(a.start_date_local || a.start_date || 0)

/** The local calendar day of an activity. Never `toISOString()`, which is UTC. */
export const actDay = (a: Act): string =>
	a.start_date_local ? String(a.start_date_local).slice(0, 10) : format(actDate(a), 'yyyy-MM-dd')

export const actSport = (a: Act): string => String(a.sport_type || a.type || '').toLowerCase()

const isRun = (a: Act) => actSport(a) === 'run'
const isRide = (a: Act) => ['ride', 'virtualride', 'ebikeride'].includes(actSport(a))

/**
 * One completed session of a distance sport: a logged workout, a recording, or
 * both. Volume, counts and longest-session come from these so a hand-logged run
 * and an imported file count exactly once each.
 */
export interface DistanceSession {
	date: Date
	km: number
	activity: Act | null
}

/** Metres per second, from whichever field the import populated. */
function speedOf(a: Act): number | null {
	if (Number.isFinite(a.average_speed) && a.average_speed > 0) return a.average_speed
	if (a.distance > 0 && a.moving_time > 0) return a.distance / a.moving_time
	return null
}

/** Sum of `value` over sessions in each Monday-started week, oldest first. */
export function weeklyTotals<T>(items: T[], dateOf: (x: T) => Date, value: (x: T) => number, weeks: number, today = new Date()): number[] {
	return weekWindows(weeks, today).map(wk =>
		items.reduce((s, x) => {
			const d = dateOf(x)
			return d >= wk.start && d <= wk.end ? s + value(x) : s
		}, 0))
}

/** Rolling 28-day average of weekly totals, evaluated at the end of each week. */
export function rollingWeeklyAverage<T>(items: T[], dateOf: (x: T) => Date, value: (x: T) => number, weeks: number, today = new Date()): number[] {
	return weekWindows(weeks, today).map(wk => {
		const end = wk.end < today ? wk.end : today
		const p = windowEnding(end)
		return round(items.reduce((s, x) => (inPeriod(dateOf(x), p) ? s + value(x) : s), 0) / 4, 2)
	})
}

// ─── aerobic fitness at a fixed heart rate ────────────────────────────────────

/**
 * The heart-rate-reserve fraction every session is normalised to. 65% sits in
 * the middle of an easy aerobic run for almost everyone.
 */
export const REF_HRR = 0.65

/** Only sessions averaging inside this HR-reserve band are used. */
export const HRR_BAND: [number, number] = [0.5, 0.85]

/** Below this the sample is too short for average HR to mean anything. */
export const MIN_STEADY_SECONDS = 15 * 60

export const hrrFraction = (hr: number, maxHR: number, restHR: number) =>
	(hr - restHR) / Math.max(1, maxHR - restHR)

/** The bpm the aerobic metrics are quoted at, for this athlete. */
export const referenceHR = (maxHR: number, restHR: number) =>
	Math.round(restHR + REF_HRR * (maxHR - restHR))

function steadyFraction(a: Act, maxHR: number | null, restHR: number): number | null {
	if (!maxHR || maxHR < 140) return null
	const hr = a.average_heartrate
	if (!Number.isFinite(hr) || hr <= restHR) return null
	if (!Number.isFinite(a.moving_time) || a.moving_time < MIN_STEADY_SECONDS) return null
	const frac = hrrFraction(hr, maxHR, restHR)
	return frac >= HRR_BAND[0] && frac <= HRR_BAND[1] ? frac : null
}

/**
 * A run's speed, rescaled to what it would be at the reference heart rate. m/s.
 *
 * ACSM puts the oxygen cost of running above rest in direct proportion to
 * speed, and %VO₂ reserve tracks %HR reserve. So speed ∝ HR-reserve fraction,
 * and a run at 5:30/km and 60% HRR says the same thing about your fitness as
 * one at 5:05/km and 65%. Rescaling first means a week of easy runs and a week
 * with a tempo in it can be compared honestly — taking a raw median pace over a
 * heart-rate band, as this used to, let the mix of efforts decide the verdict.
 *
 * Grade-adjusted speed is used when the file carries altitude, so a hilly week
 * doesn't read as a loss of fitness.
 */
export function aerobicSpeed(a: Act, maxHR: number | null, restHR: number): number | null {
	if (!isRun(a)) return null
	const frac = steadyFraction(a, maxHR, restHR)
	if (frac === null) return null
	const speed = gradeAdjustedPace(a)?.speed ?? speedOf(a)
	if (speed === null || speed < 1.5 || speed > 7) return null
	return (speed * REF_HRR) / frac
}

/**
 * A ride's estimated power, rescaled to the reference heart rate. Watts.
 *
 * Power, not speed: on a bike speed is dominated by terrain and air, so speed
 * per heartbeat mostly measured which route you took. Power tracks oxygen cost
 * directly, so the same proportional-to-HR-reserve rescaling applies. The power
 * itself is estimated from speed and gradient, so wind and drafting still add
 * noise — the verdict's noise gate is what keeps that honest.
 */
export function aerobicPower(a: Act, maxHR: number | null, restHR: number, riderKg: number): number | null {
	if (!isRide(a)) return null
	const frac = steadyFraction(a, maxHR, restHR)
	if (frac === null) return null
	const watts = estimateBikePower(a, riderKg)
	if (!watts || watts < 40) return null
	return (watts * REF_HRR) / frac
}

// ─── running ──────────────────────────────────────────────────────────────────

export interface RunInputs {
	/** Every completed run: logged workouts and unlinked recordings, once each. */
	sessions: DistanceSession[]
	/** Every recorded activity, for the heart-rate metrics. */
	activities: Act[]
	maxHR: number | null
	restHR: number
	today?: Date
}

export interface SportProgress {
	metrics: Metric[]
	/** True when there is enough logged work for any of this to be meaningful. */
	hasData: boolean
}

interface Dated { date: Date; v: number }

/** Values inside a period. */
const within = (xs: Dated[], p: Period) => xs.filter(x => inPeriod(x.date, p)).map(x => x.v)

/** A median-of-sessions metric's value, previous value and trend. */
function sampleSeries(xs: Dated[], today: Date, fix: (v: number) => number, minForTrend = 2) {
	const { current, previous } = periods(today)
	const cur = within(xs, current)
	const prev = within(xs, previous)
	const med = (v: number[]) => (v.length ? fix(median(v)!) : null)
	return {
		cur,
		prev,
		value: med(cur),
		previous: med(prev),
		trend: rollingTrend(today, p => {
			const v = within(xs, p)
			return v.length >= minForTrend ? med(v) : null
		}),
		long: longTrend(xs, today),
	}
}

/** The long-trend window: the same twelve weeks the trend line covers. */
export const LONG_TREND_DAYS = TREND_WEEKS * 7

export interface LongTrend {
	/** Fitted change per 28 days, relative to the fitted value today. -0.03 is 3% lower. */
	pctPer4Weeks: number
	/** True when the slope is at least twice its standard error. */
	significant: boolean
	samples: number
}

/**
 * A least-squares line through every session of the last twelve weeks.
 *
 * Month-versus-month comparison is deliberately strict, and that makes it blind
 * to slow progress: gaining 3% a month amid 7% session-to-session scatter reads
 * "steady" every single month, even after three months and +10%. A regression
 * over all twelve weeks uses three times the data, so it can see a small,
 * steady slope — and it's only reported as real when the slope is at least
 * twice its own standard error.
 */
export function longTrend(xs: Dated[], today: Date): LongTrend | null {
	const p = windowEnding(today, LONG_TREND_DAYS)
	const pts = xs.filter(x => inPeriod(x.date, p))
	if (pts.length < 6) return null
	const t0 = p.to.getTime()
	const x = pts.map(q => (q.date.getTime() - t0) / 86_400_000) // days, ≤ 0
	if (Math.max(...x) - Math.min(...x) < 28) return null
	const y = pts.map(q => q.v)
	const mx = mean(x)!, my = mean(y)!
	const sxx = x.reduce((s, xi) => s + (xi - mx) ** 2, 0)
	if (!sxx) return null
	const slope = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / sxx
	const intercept = my - slope * mx // fitted value today (x = 0)
	if (!intercept) return null
	const rss = y.reduce((s, yi, i) => s + (yi - (intercept + slope * x[i])) ** 2, 0)
	const se = Math.sqrt(rss / (pts.length - 2) / sxx)
	return {
		pctPer4Weeks: round((slope * 28) / Math.abs(intercept), 4),
		significant: se === 0 ? slope !== 0 : Math.abs(slope) / se >= 2,
		samples: pts.length,
	}
}

/**
 * The note for a metric that's level month on month but clearly moving over
 * twelve weeks — so "steady" is never the last word on real, slow progress.
 */
function slowProgress(long: LongTrend | null, higherIsBetter: boolean): string | null {
	if (!long?.significant || Math.abs(long.pctPer4Weeks) < 0.005) return null
	const good = (long.pctPer4Weeks > 0) === higherIsBetter
	const pct = Math.abs(long.pctPer4Weeks * 100).toFixed(1)
	return good
		? `Too close to last month to call on its own, but the last 12 weeks show a steady ${pct}% improvement every 4 weeks. That's real progress.`
		: `Too close to last month to call on its own, but the last 12 weeks show a slow ${pct}% slide every 4 weeks. Worth keeping an eye on.`
}

function sampleBasis(noun: string, cur: number, prev: number) {
	return `median of ${plural(cur, noun)} · ${prev} in the 28 days before`
}

function thinNote(noun: string, cur: number, prev: number, need = MIN_SAMPLES) {
	return `Based on ${plural(cur, noun)} now and ${prev} before. Needs ${need} in each 28-day window before it calls a direction.`
}

/** Distance sessions: total km per week, sessions per week, longest. */
function distanceMetrics(
	sessions: DistanceSession[],
	today: Date,
	noun: { one: string; label: string; key: string; longest: string },
): Metric[] {
	const { current, previous } = periods(today)
	const inCur = sessions.filter(s => inPeriod(s.date, current))
	const inPrev = sessions.filter(s => inPeriod(s.date, previous))
	const km = (xs: DistanceSession[]) => xs.reduce((s, x) => s + (x.km || 0), 0)
	const hasHistory = sessions.some(s => s.date < current.from)
	const metrics: Metric[] = []

	// Volume, as a weekly average — the unit runners and riders actually think in.
	metrics.push(buildMetric({
		key: `${noun.key}-volume`,
		label: 'Weekly distance',
		unit: 'km/wk',
		current: sessions.length ? round(km(inCur) / 4) : null,
		previous: hasHistory ? round(km(inPrev) / 4) : null,
		trend: rollingTrend(today, p => round(km(sessions.filter(s => inPeriod(s.date, p))) / 4)),
		basis: `${round(km(inCur))} km over the last 28 days`,
		format: v => String(round(v)),
		verdict: { kind: 'relative', band: 0.1 },
		missing: `No ${noun.one}s logged yet.`,
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `${m.deltaDisplay} km a week more than the four weeks before. Volume is what makes everything else improve.`
			if (m.direction === 'declining') return `${m.deltaDisplay} km a week less than the four weeks before.`
			if (m.direction === 'holding') return 'Within 10% of the four weeks before — a steady load.'
			return 'Your first four weeks. The comparison appears once there are eight.'
		},
	}))

	// Consistency. The most predictive number on the page, and the dullest.
	metrics.push(buildMetric({
		key: `${noun.key}-consistency`,
		label: `${noun.label} per week`,
		unit: '/wk',
		current: sessions.length ? inCur.length / 4 : null,
		previous: hasHistory ? inPrev.length / 4 : null,
		trend: rollingTrend(today, p => sessions.filter(s => inPeriod(s.date, p)).length / 4),
		basis: `${plural(inCur.length, noun.one)} in the last 28 days`,
		format: v => v.toFixed(1).replace(/\.0$/, ''),
		formatDelta: v => v.toFixed(1).replace(/\.0$/, ''),
		verdict: { kind: 'count', current: inCur.length, previous: inPrev.length, minAbs: 2, band: 0.15 },
		missing: `No ${noun.one}s logged yet.`,
		note: m => {
			if (m.value === null) return m.missing!
			if (!inCur.length) return `No ${noun.one}s in the last four weeks.`
			if (m.direction === 'improving') return `${inCur.length - inPrev.length} more ${noun.one}s than the four weeks before. Consistency beats intensity.`
			if (m.direction === 'declining') return `${inPrev.length - inCur.length} fewer ${noun.one}s than the four weeks before.`
			if (m.direction === 'holding') return `About the same as the four weeks before (${inPrev.length}).`
			return `Your first four weeks.`
		},
	}))

	const longest = (xs: DistanceSession[]) => {
		const v = maxOr(xs.map(s => s.km))
		return v === null ? null : round(v)
	}
	metrics.push(buildMetric({
		key: `${noun.key}-longest`,
		label: noun.longest,
		unit: 'km',
		current: longest(inCur),
		previous: longest(inPrev),
		trend: rollingTrend(today, p => longest(sessions.filter(s => inPeriod(s.date, p)))),
		format: v => String(round(v)),
		verdict: { kind: 'relative', band: 0.05 },
		missing: `No ${noun.one}s with a distance in the last 28 days.`,
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `${m.deltaDisplay} km further than the longest in the four weeks before.`
			if (m.direction === 'declining') return `${m.deltaDisplay} km shorter than the longest in the four weeks before.`
			if (m.direction === 'holding') return 'Same long session as the four weeks before.'
			return 'Your longest in the last four weeks.'
		},
	}))

	return metrics
}

/** Progress for running: aerobic pace first, because it's the one that says "fitter". */
export function runningProgress(input: RunInputs): SportProgress {
	const { sessions, activities, maxHR, restHR } = input
	const today = input.today ?? new Date()

	const samples: Dated[] = activities
		.map(a => ({ date: actDate(a), speed: aerobicSpeed(a, maxHR, restHR) }))
		.filter((x): x is { date: Date; speed: number } => x.speed !== null)
		.map(x => ({ date: x.date, v: 1000 / x.speed }))
	const s = sampleSeries(samples, today, Math.round)
	const bpm = maxHR ? referenceHR(maxHR, restHR) : null

	const pace = buildMetric({
		key: 'run-aerobic-pace',
		label: bpm ? `Pace at ${bpm} bpm` : 'Aerobic pace',
		unit: '/km',
		current: s.value,
		previous: s.previous,
		higherIsBetter: false, // faster is a smaller number
		invertTrend: true, // …but faster should still draw as up, like the pace chart
		trend: s.trend,
		longTrend: s.long,
		basis: sampleBasis('run', s.cur.length, s.prev.length),
		format: v => fmtPace(v),
		formatDelta: v => `${Math.round(v)} s`,
		verdict: { kind: 'samples', current: s.cur, previous: s.prev, minRel: 0.01 },
		missing: maxHR
			? 'Needs a steady run of 15 minutes or more with heart rate in the last 28 days.'
			: 'Needs runs recorded with a heart rate monitor, or a max HR set in Profile.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.unknownReason === 'thin') return thinNote('run', s.cur.length, s.prev.length)
			if (m.direction === 'improving') return `${m.deltaDisplay}/km faster than last month for the same heart rate. That's aerobic fitness, and it shows up here long before a race.`
			if (m.direction === 'declining') return `${m.deltaDisplay}/km slower for the same heart rate. Normal in a hard block, heat or a bad-sleep spell — worth watching if it keeps sliding.`
			if (m.direction === 'holding') return slowProgress(s.long, false) ?? 'Same pace for the same heart rate as last month — within the normal run-to-run scatter.'
			return 'Your baseline. Every steady run is rescaled to this heart rate, so easy and harder runs both count.'
		},
	})

	return {
		metrics: [pace, ...distanceMetrics(sessions, today, { one: 'run', label: 'Runs', key: 'run', longest: 'Longest run' })],
		hasData: sessions.length > 0,
	}
}

/** Aerobic-pace points for a chart: one per qualifying run, oldest first. */
export function aerobicPacePoints(activities: Act[], maxHR: number | null, restHR: number): { date: string; paceSec: number }[] {
	return activities
		.map(a => ({ a, speed: aerobicSpeed(a, maxHR, restHR) }))
		.filter(x => x.speed !== null)
		.map(x => ({ date: actDay(x.a), paceSec: Math.round(1000 / x.speed!) }))
		.sort((a, b) => a.date.localeCompare(b.date))
}

/** The median of `points` in the 28 days up to each point's own date. */
export function rollingMedianLine<T extends { date: string }>(points: T[], value: (p: T) => number, minSamples = 2): { date: string; value: number | null }[] {
	return points.map(p => {
		const w = windowEnding(parseISO(p.date))
		const vals = points.filter(q => inPeriod(parseISO(q.date), w)).map(value)
		return { date: p.date, value: vals.length >= minSamples ? median(vals) : null }
	})
}

// ─── rolling personal bests ───────────────────────────────────────────────────

export interface BestEffortProgress {
	name: string
	/** Fastest time over this distance inside the current window, seconds. */
	current: number | null
	/** Fastest inside the equally long window before it. */
	previous: number | null
	/** Fastest ever recorded, and when. */
	allTime: number | null
	allTimeDate: string | null
	/** True when the all-time best was set inside the current window. */
	freshPB: boolean
}

/** Distances we track bests over. Matches the names the FIT parser emits. */
export const BEST_EFFORT_NAMES = ['1 km', '5 km', '10 km', 'Half marathon'] as const

/**
 * Best efforts over a rolling window. Every recorded run is scanned for its
 * fastest 1 km, 5 km and so on, so a hard Tuesday counts. A 90-day window means
 * the comparison is against a real training block rather than one lucky day.
 */
export function bestEffortProgress(
	activities: Act[],
	windowDays = 90,
	today = new Date(),
): BestEffortProgress[] {
	const { current: cur, previous: prev } = periods(today, windowDays)

	return BEST_EFFORT_NAMES.map(name => {
		let current: number | null = null
		let previous: number | null = null
		let allTime: number | null = null
		let allTimeDate: string | null = null

		for (const a of activities) {
			if (!isRun(a)) continue
			const effort = (a.best_efforts ?? []).find((b: any) => b.name === name)
			if (!effort?.elapsed_time) continue
			const t = effort.elapsed_time
			const when = actDate(a)

			if (allTime === null || t < allTime) {
				allTime = t
				allTimeDate = actDay(a)
			}
			if (inPeriod(when, cur)) {
				if (current === null || t < current) current = t
			} else if (inPeriod(when, prev)) {
				if (previous === null || t < previous) previous = t
			}
		}

		const freshPB = allTime !== null && current !== null && current === allTime
		return { name, current, previous, allTime, allTimeDate, freshPB }
	}).filter(b => b.allTime !== null)
}

// ─── training load (fitness / fatigue / form) ─────────────────────────────────

export interface LoadPoint {
	date: string
	fitness: number
	fatigue: number
	form: number
}

export interface TrainingLoad {
	series: LoadPoint[]
	/** Today's values. */
	fitness: number
	fatigue: number
	form: number
	/** Fitness 28 days ago, for the progress delta. */
	fitnessPrev: number | null
	/** Plain-language read on the form number. */
	formLabel: 'fresh' | 'neutral' | 'building' | 'strained'
	/**
	 * True while the history is too short for fitness to have settled. It starts
	 * from zero at your first recording and takes ~6 weeks to converge, so until
	 * then it rises whatever you do — which must not be sold as progress.
	 */
	warmingUp: boolean
	/** How many recordings with heart rate fed it. */
	sessions: number
}

/** Days of history before the 42-day fitness average means anything. */
export const LOAD_WARMUP_DAYS = 42

/**
 * Fitness, fatigue and form from heart-rate training load.
 *
 * Fitness is a 42-day weighted average of daily effort, fatigue a 7-day one,
 * and form the difference. Unlike VDOT this moves every day you train.
 */
export function trainingLoad(
	activities: Act[],
	maxHR: number | null,
	restHR: number,
	days = 120,
	today = new Date(),
): TrainingLoad | null {
	if (!maxHR || maxHR < 140) return null

	const efforts: Record<string, number> = {}
	let sessions = 0
	for (const a of activities) {
		const load = relativeEffort(a, maxHR, restHR)
		if (!load) continue
		const key = actDay(a)
		if (parseISO(key) > today) continue
		efforts[key] = (efforts[key] || 0) + load
		sessions++
	}
	if (!Object.keys(efforts).length) return null

	const series = fitnessSeries(efforts, days, today)
	if (series.length < 7) return null

	const last = series[series.length - 1]
	const prevIdx = series.length - 1 - PERIOD_DAYS
	const first = parseISO(Object.keys(efforts).sort()[0])
	const warmingUp = first > addDays(today, -(LOAD_WARMUP_DAYS + PERIOD_DAYS))
	const fitnessPrev = prevIdx >= 0 && !warmingUp ? series[prevIdx].fitness : null

	// Form thresholds follow the usual TSB reading: comfortably positive means
	// rested, deeply negative means you're digging a hole.
	const form = last.form
	const formLabel: TrainingLoad['formLabel'] =
		form > 5 ? 'fresh' : form >= -10 ? 'neutral' : form >= -25 ? 'building' : 'strained'

	return { series, fitness: last.fitness, fatigue: last.fatigue, form, fitnessPrev, formLabel, warmingUp, sessions }
}

// ─── gym ──────────────────────────────────────────────────────────────────────

export interface GymSplitProgress {
	split: string
	sessions: number
	/** Median tonnage per session in the current period, tonnes. */
	loadPerSession: number | null
	previousLoadPerSession: number | null
	direction: Direction
	trend: (number | null)[]
	/** Sessions with a load in the current / previous window. */
	counts: [number, number]
	/** Twelve-week fitted trend. */
	long: LongTrend | null
}

export interface GymProgress extends SportProgress {
	splits: GymSplitProgress[]
}

const workoutDate = (w: Workout) => parseISO(w.date)

/**
 * Progress for lifting.
 *
 * Total tonnage mostly tracks how often you turned up. Load *per session* is
 * the one that answers "am I lifting more than I was", so it leads — as a
 * median, so one marathon session doesn't pass for a stronger month.
 */
export function gymProgress(gymWorkouts: Workout[], today = new Date()): GymProgress {
	const { current, previous } = periods(today)
	const tonnes = (w: Workout) => (w.totalWeightLifted || 0) / 1000
	const loaded: Dated[] = gymWorkouts
		.filter(w => (w.totalWeightLifted || 0) > 0)
		.map(w => ({ date: workoutDate(w), v: tonnes(w) }))

	const cur = gymWorkouts.filter(w => inPeriod(workoutDate(w), current))
	const prev = gymWorkouts.filter(w => inPeriod(workoutDate(w), previous))
	const hasHistory = gymWorkouts.some(w => workoutDate(w) < current.from)
	const metrics: Metric[] = []

	const s = sampleSeries(loaded, today, v => round(v, 2), 1)

	// The long trend is fitted to each session's load relative to its own split's
	// typical load. Leg days can be 40% heavier than push days, so fitting raw
	// tonnage across a mix of splits buries a real, steady gain in scatter that
	// is only "which day was it". A percentage is unit-free, so the adjusted fit
	// still reads directly as "x% heavier every 4 weeks".
	const longWindow = windowEnding(today, LONG_TREND_DAYS)
	const splitTypical = new Map<string, number>()
	for (const w of gymWorkouts) {
		const key = gymSplit(w.gymType)
		if (splitTypical.has(key)) continue
		const vals = gymWorkouts
			.filter(x => gymSplit(x.gymType) === key && (x.totalWeightLifted || 0) > 0 && inPeriod(workoutDate(x), longWindow))
			.map(tonnes)
		const typical = median(vals)
		if (typical) splitTypical.set(key, typical)
	}
	const adjusted: Dated[] = gymWorkouts
		.filter(w => (w.totalWeightLifted || 0) > 0 && splitTypical.has(gymSplit(w.gymType)))
		.map(w => ({ date: workoutDate(w), v: tonnes(w) / splitTypical.get(gymSplit(w.gymType))! }))
	const longAdjusted = longTrend(adjusted, today)

	metrics.push(buildMetric({
		key: 'gym-load-per-session',
		label: 'Load per session',
		unit: 't',
		current: s.value,
		previous: s.previous,
		trend: s.trend,
		longTrend: longAdjusted,
		basis: sampleBasis('session', s.cur.length, s.prev.length),
		format: v => v.toFixed(2),
		formatDelta: v => v.toFixed(2),
		verdict: { kind: 'samples', current: s.cur, previous: s.prev, minRel: 0.03 },
		missing: loaded.length
			? 'No sessions with a load logged in the last 28 days.'
			: 'Log the total load lifted when you complete a gym session and this starts tracking.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.unknownReason === 'thin') return thinNote('session', s.cur.length, s.prev.length)
			if (m.direction === 'improving') return `${m.deltaDisplay} t more per session than last month — more work each time you train, not just training more often.`
			if (m.direction === 'declining') return `${m.deltaDisplay} t less per session than last month. Expected on a deload.`
			if (m.direction === 'holding') return slowProgress(longAdjusted, true) ?? 'Same work per session as last month, within normal session-to-session variation.'
			return 'Your baseline session load.'
		},
	}))

	const total = (ws: Workout[]) => ws.reduce((sum, w) => sum + tonnes(w), 0)
	metrics.push(buildMetric({
		key: 'gym-volume',
		label: 'Weekly volume',
		unit: 't/wk',
		current: loaded.length ? round(total(cur) / 4) : null,
		previous: loaded.length && hasHistory ? round(total(prev) / 4) : null,
		trend: rollingTrend(today, p => round(total(gymWorkouts.filter(w => inPeriod(workoutDate(w), p))) / 4)),
		basis: `${round(total(cur))} t over the last 28 days`,
		format: v => String(round(v)),
		verdict: { kind: 'relative', band: 0.1 },
		missing: 'Log the total load lifted when you complete a gym session.',
		note: m => {
			if (m.value === null) return m.missing!
			if (!m.value) return 'No load logged in the last four weeks.'
			if (m.direction === 'improving') return `${m.deltaDisplay} t a week more than the four weeks before.`
			if (m.direction === 'declining') return `${m.deltaDisplay} t a week less than the four weeks before.`
			if (m.direction === 'holding') return 'Within 10% of the four weeks before.'
			return 'Your first four weeks.'
		},
	}))

	metrics.push(buildMetric({
		key: 'gym-sessions',
		label: 'Sessions per week',
		unit: '/wk',
		current: cur.length / 4,
		previous: hasHistory ? prev.length / 4 : null,
		trend: rollingTrend(today, p => gymWorkouts.filter(w => inPeriod(workoutDate(w), p)).length / 4),
		basis: `${plural(cur.length, 'session')} in the last 28 days`,
		format: v => v.toFixed(1).replace(/\.0$/, ''),
		formatDelta: v => v.toFixed(1).replace(/\.0$/, ''),
		verdict: { kind: 'count', current: cur.length, previous: prev.length, minAbs: 2, band: 0.15 },
		note: m => {
			if (!cur.length) return 'No gym sessions in the last four weeks.'
			if (m.direction === 'improving') return `${cur.length - prev.length} more sessions than the four weeks before.`
			if (m.direction === 'declining') return `${prev.length - cur.length} fewer sessions than the four weeks before.`
			if (m.direction === 'holding') return `About the same as the four weeks before (${prev.length}).`
			return 'Your first four weeks.'
		},
	}))

	// Per split (Push / Pull / Legs / whatever you named it)
	const groups = new Map<string, Workout[]>()
	for (const w of gymWorkouts) {
		const key = gymSplit(w.gymType)
		const list = groups.get(key)
		if (list) list.push(w)
		else groups.set(key, [w])
	}

	const splits: GymSplitProgress[] = [...groups.entries()].map(([split, ws]) => {
		const pts: Dated[] = ws.filter(w => (w.totalWeightLifted || 0) > 0).map(w => ({ date: workoutDate(w), v: tonnes(w) }))
		const ss = sampleSeries(pts, today, v => round(v, 2), 1)
		// A split is trained maybe once a week, so two sessions per window is
		// the most we can ask for — the noise gate still applies.
		const m = buildMetric({
			key: `split-${split}`, label: split, unit: 't',
			current: ss.value,
			previous: ss.previous,
			verdict: { kind: 'samples', current: ss.cur, previous: ss.prev, minRel: 0.03, minSamples: 2 },
		})
		return {
			split,
			sessions: ws.length,
			loadPerSession: m.value,
			previousLoadPerSession: m.previous,
			direction: m.direction,
			trend: ss.trend,
			counts: [ss.cur.length, ss.prev.length] as [number, number],
			long: ss.long,
		}
	}).sort((a, b) => b.sessions - a.sessions)

	return { metrics, splits, hasData: gymWorkouts.length > 0 }
}

// ─── bike ─────────────────────────────────────────────────────────────────────

export interface BikeInputs {
	sessions: DistanceSession[]
	activities: Act[]
	maxHR: number | null
	restHR: number
	/** Used for the power estimate. One weight for every ride keeps the trend fair. */
	riderKg: number
	today?: Date
}

export function bikeProgress(input: BikeInputs): SportProgress {
	const { sessions, activities, maxHR, restHR, riderKg } = input
	const today = input.today ?? new Date()
	const { current, previous } = periods(today)

	const samples: Dated[] = activities
		.map(a => ({ date: actDate(a), w: aerobicPower(a, maxHR, restHR, riderKg) }))
		.filter((x): x is { date: Date; w: number } => x.w !== null)
		.map(x => ({ date: x.date, v: x.w }))
	const s = sampleSeries(samples, today, Math.round)
	const bpm = maxHR ? referenceHR(maxHR, restHR) : null

	const power = buildMetric({
		key: 'bike-aerobic-power',
		label: bpm ? `Power at ${bpm} bpm` : 'Aerobic power',
		unit: 'W',
		current: s.value,
		previous: s.previous,
		trend: s.trend,
		longTrend: s.long,
		basis: `estimated · ${sampleBasis('ride', s.cur.length, s.prev.length)}`,
		format: v => String(Math.round(v)),
		formatDelta: v => String(Math.round(v)),
		verdict: { kind: 'samples', current: s.cur, previous: s.prev, minRel: 0.02 },
		missing: maxHR
			? 'Needs a steady ride of 15 minutes or more, imported from a file with speed and heart rate, in the last 28 days.'
			: 'Needs rides recorded with a heart rate monitor, or a max HR set in Profile.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.unknownReason === 'thin') return thinNote('ride', s.cur.length, s.prev.length)
			if (m.direction === 'improving') return `${m.deltaDisplay} W more for the same heart rate than last month.`
			if (m.direction === 'declining') return `${m.deltaDisplay} W less for the same heart rate than last month.`
			if (m.direction === 'holding') return slowProgress(s.long, true) ?? 'Same power for the same heart rate — within the scatter wind and terrain add.'
			return 'Your baseline. Power is estimated from speed and gradient, so read the trend rather than the watts.'
		},
	})

	const rides = sessions.filter(x => x.activity)
	const climb = (p: Period) => rides.filter(x => inPeriod(x.date, p)).reduce((sum, x) => sum + (x.activity!.total_elevation_gain || 0), 0)
	const climbing = buildMetric({
		key: 'bike-climb',
		label: 'Weekly climbing',
		unit: 'm/wk',
		current: rides.length ? Math.round(climb(current) / 4) : null,
		previous: rides.some(x => x.date < current.from) ? Math.round(climb(previous) / 4) : null,
		trend: rollingTrend(today, p => Math.round(climb(p) / 4)),
		format: v => String(Math.round(v)),
		formatDelta: v => String(Math.round(v)),
		verdict: { kind: 'relative', band: 0.15 },
		missing: 'No recorded rides yet.',
	})

	return {
		metrics: [
			...distanceMetrics(sessions, today, { one: 'ride', label: 'Rides', key: 'bike', longest: 'Longest ride' }),
			power,
			climbing,
		],
		hasData: sessions.length > 0,
	}
}

// ─── body weight ──────────────────────────────────────────────────────────────

export interface WeighIn {
	date: string
	weight: number
}

export interface BodyProgress extends SportProgress {
	/** Trend weight at every weigh-in, for the chart. */
	smoothed: { date: string; weight: number }[]
	/** Least-squares kg per week over the last 28 days. Null with too few readings. */
	ratePerWeek: number | null
	/** Weeks until the goal at the current rate, null when not applicable. */
	weeksToGoal: number | null
	atGoal: boolean
	/** Days since the last weigh-in. */
	daysSinceLast: number | null
}

/** Time constant of the trend weight, days. */
export const WEIGHT_TAU_DAYS = 7

/** A trend value is only trusted this many days past its last weigh-in. */
const WEIGHT_STALE_DAYS = 10

/** Under this much change over four weeks, weight is holding (0.1 kg a week). */
export const WEIGHT_BAND_KG = 0.4

const dayGap = (a: string, b: string) => (parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000

/**
 * Trend weight: an exponential moving average that respects the gaps between
 * weigh-ins.
 *
 * The old version averaged the last seven *readings*, so someone who weighs in
 * twice a week got a month-long average and someone who weighs in daily got a
 * week. Here each reading pulls the trend by an amount set by how many days
 * passed since the last one, so the trend means the same thing however often
 * you step on the scale.
 */
export function weightTrend(sorted: WeighIn[]): { date: string; weight: number }[] {
	const out: { date: string; weight: number }[] = []
	let trend: number | null = null
	let last: string | null = null
	for (const w of sorted) {
		if (trend === null || last === null) {
			trend = w.weight
		} else {
			const alpha = 1 - Math.exp(-Math.max(0, dayGap(last, w.date)) / WEIGHT_TAU_DAYS)
			// Same-day duplicates still count, as a small nudge rather than nothing.
			trend += Math.max(alpha, 0.15) * (w.weight - trend)
		}
		last = w.date
		out.push({ date: w.date, weight: round(trend, 2) })
	}
	return out
}

/** Least-squares slope in kg per week. */
function slopePerWeek(points: WeighIn[]): number | null {
	if (points.length < 2) return null
	const x0 = parseISO(points[0].date).getTime()
	const xs = points.map(p => (parseISO(p.date).getTime() - x0) / (7 * 86_400_000))
	const mx = mean(xs)!
	const my = mean(points.map(p => p.weight))!
	const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
	if (!den) return null
	return xs.reduce((s, x, i) => s + (x - mx) * (points[i].weight - my), 0) / den
}

/**
 * Progress for body weight.
 *
 * A single morning reading swings a kilo on hydration alone, so the headline
 * is the trend weight, and the rate is fitted through every reading of the last
 * four weeks rather than taken from two endpoints.
 */
export function bodyProgress(weights: WeighIn[], goalWeight: number | null, today = new Date()): BodyProgress {
	const sorted = [...weights]
		.filter(w => Number.isFinite(w.weight) && w.weight > 0)
		.sort((a, b) => a.date.localeCompare(b.date))
	const smoothed = weightTrend(sorted)
	const todayStr = format(today, 'yyyy-MM-dd')

	/** Trend weight as of a day — only if there was a weigh-in shortly before it. */
	const at = (when: Date): number | null => {
		const cutoff = format(when, 'yyyy-MM-dd')
		const upto = smoothed.filter(s => s.date <= cutoff)
		const lastPt = upto[upto.length - 1]
		if (!lastPt || dayGap(lastPt.date, cutoff) > WEIGHT_STALE_DAYS) return null
		return lastPt.weight
	}

	const lastPt = smoothed[smoothed.length - 1] ?? null
	const daysSinceLast = lastPt ? Math.round(dayGap(lastPt.date, todayStr)) : null
	const curr = lastPt ? lastPt.weight : null
	const prev = at(addDays(today, -PERIOD_DAYS))

	const recent = sorted.filter(w => inPeriod(parseISO(w.date), windowEnding(today)))
	const span = recent.length ? dayGap(recent[0].date, recent[recent.length - 1].date) : 0
	const rawRate = recent.length >= 3 && span >= 10 ? slopePerWeek(recent) : null
	const ratePerWeek = rawRate === null ? null : round(rawRate, 2)

	// Direction depends on which way the goal lies. Without a goal, "no change"
	// is the neutral reading — we must not assume everyone wants to lose weight.
	const losing = goalWeight !== null && curr !== null ? goalWeight < curr : null
	const higherIsBetter = losing === null ? true : !losing
	const away = goalWeight !== null && curr !== null ? round(Math.abs(curr - goalWeight)) : null
	const atGoal = away !== null && away <= 0.5

	const metrics: Metric[] = []
	metrics.push(buildMetric({
		key: 'body-weight',
		label: 'Trend weight',
		unit: 'kg',
		current: curr,
		previous: prev,
		higherIsBetter,
		trend: trendAnchors(today).map(at),
		basis: `${plural(recent.length, 'weigh-in')} in the last 28 days`,
		format: v => v.toFixed(1),
		formatDelta: v => v.toFixed(1),
		verdict: { kind: 'absolute', band: WEIGHT_BAND_KG },
		missing: 'Log your weight from the schedule page to start tracking.',
		note: m => {
			if (m.value === null) return m.missing!
			const stale = daysSinceLast !== null && daysSinceLast > WEIGHT_STALE_DAYS
				? ` Last weigh-in was ${daysSinceLast} days ago.`
				: ''
			if (goalWeight === null) {
				if (m.direction === 'holding') return `Level with last month.${stale} Set a goal weight in Profile to track a target.`
				if (m.direction === 'unknown') return `Your baseline.${stale} Set a goal weight in Profile to track a target.`
				return `${m.delta! > 0 ? 'Up' : 'Down'} ${m.deltaDisplay} kg on last month.${stale} Set a goal weight in Profile to track a target.`
			}
			if (atGoal) return `At your goal weight.${stale}`
			if (m.direction === 'improving') return `${m.deltaDisplay} kg closer to your goal than last month — ${away} kg to go.${stale}`
			if (m.direction === 'declining') return `${m.deltaDisplay} kg further from your goal than last month — ${away} kg to go.${stale}`
			if (m.direction === 'holding') return `Holding steady, ${away} kg from your goal.${stale}`
			return `${away} kg from your goal.${stale}`
		},
	}))

	// Rate — the number that says whether the current approach is working.
	const rateGood = ratePerWeek === null || goalWeight === null || atGoal
		? null
		: Math.abs(ratePerWeek) < 0.1 ? null : (ratePerWeek < 0) === (losing === true)
	const rateMetric = buildMetric({
		key: 'body-rate',
		label: 'Rate',
		unit: 'kg/wk',
		current: ratePerWeek,
		previous: null,
		trend: trendAnchors(today).map(anchor => {
			const w = windowEnding(anchor)
			const pts = sorted.filter(x => inPeriod(parseISO(x.date), w))
			const sp = pts.length ? dayGap(pts[0].date, pts[pts.length - 1].date) : 0
			const r = pts.length >= 3 && sp >= 10 ? slopePerWeek(pts) : null
			return r === null ? null : round(r, 2)
		}),
		basis: ratePerWeek === null ? null : `fitted through ${plural(recent.length, 'weigh-in')}`,
		format: v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`,
		missing: 'Needs three weigh-ins spread over at least ten days in the last four weeks.',
		note: m => {
			if (m.value === null) return m.missing!
			if (Math.abs(m.value) < 0.1) return 'Essentially stable — under 0.1 kg a week either way.'
			const pct = curr ? Math.abs((m.value / curr) * 100) : 0
			const pace = pct > 1 ? ' That\'s over 1% of body weight a week — faster than is usually sustainable.' : ''
			if (rateGood === true) return `Heading toward your goal.${pace}`
			if (rateGood === false) return `Heading away from your goal.`
			return `${m.value > 0 ? 'Gaining' : 'Losing'} about ${Math.abs(m.value).toFixed(2)} kg a week.${pace}`
		},
	})
	metrics.push({ ...rateMetric, direction: rateGood === null ? (ratePerWeek !== null && Math.abs(ratePerWeek) < 0.1 ? 'holding' : 'unknown') : rateGood ? 'improving' : 'declining', unknownReason: null })

	let weeksToGoal: number | null = null
	if (goalWeight !== null && curr !== null && ratePerWeek !== null && !atGoal && Math.abs(ratePerWeek) >= 0.05) {
		const need = goalWeight - curr
		// Only meaningful when the trend is pointing at the goal.
		if (Math.sign(need) === Math.sign(ratePerWeek)) weeksToGoal = Math.ceil(need / ratePerWeek)
	}

	return { metrics, smoothed, ratePerWeek, weeksToGoal, atGoal, daysSinceLast, hasData: sorted.length > 0 }
}

// ─── load ramp guardrail ──────────────────────────────────────────────────────

export type RampVerdict = 'ok' | 'sharp' | 'detraining' | 'unknown'

export interface Ramp {
	/** The last 7 days' distance against the weekly average of the 28 days before. */
	ratio: number | null
	verdict: RampVerdict
	message: string
}

/**
 * Acute-to-chronic workload, in kilometres.
 *
 * Compares the last seven days against the four weeks before them. It used to
 * compare the *calendar* week so far against full weeks, so every Monday
 * morning reported you as detraining.
 */
export function volumeRamp(sessions: { date: Date; km: number }[], today = new Date()): Ramp {
	const acuteP = windowEnding(today, 7)
	const chronicP = windowEnding(addDays(today, -7), 28)
	if (!sessions.some(s => s.date < addDays(chronicP.from, 7))) {
		return { ratio: null, verdict: 'unknown', message: 'Not enough weeks logged to judge your ramp rate yet.' }
	}
	const sum = (p: Period) => sessions.reduce((s, x) => (inPeriod(x.date, p) ? s + (x.km || 0) : s), 0)
	const acute = sum(acuteP)
	const chronic = sum(chronicP) / 4
	if (chronic <= 0) {
		return { ratio: null, verdict: 'unknown', message: 'No recent volume to compare the last seven days against.' }
	}
	const ratio = round(acute / chronic, 2)
	if (ratio > 1.5) {
		return { ratio, verdict: 'sharp', message: `The last 7 days are ${Math.round((ratio - 1) * 100)}% above your weekly average for the month before. That's the ramp rate that gets people injured — consider easing off.` }
	}
	if (ratio < 0.6) {
		return { ratio, verdict: 'detraining', message: 'The last 7 days are well below your recent weekly average. Fine for a deload or a taper; a habit if it repeats.' }
	}
	if (ratio < 0.9) {
		return { ratio, verdict: 'ok', message: `The last 7 days sit at ${ratio}× your weekly average for the month before — a lighter week, well within a safe range.` }
	}
	return { ratio, verdict: 'ok', message: `The last 7 days sit at ${ratio}× your weekly average for the month before — a sustainable rate of build.` }
}

// ─── small helpers ────────────────────────────────────────────────────────────

function maxOr(xs: number[]): number | null {
	const valid = xs.filter(x => Number.isFinite(x) && x > 0)
	return valid.length ? Math.max(...valid) : null
}
