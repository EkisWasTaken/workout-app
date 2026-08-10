/**
 * Progress metrics — "am I getting better?", answered per sport.
 *
 * The old Home page led with VDOT, which is a *race-readiness* number: a
 * trailing maximum over hard efforts. That is the right model for prescribing
 * paces and the wrong model for showing progress, because it only moves when
 * you race or time-trial. Train consistently for six weeks without pinning on a
 * number and the line is flat — not because nothing improved, but because
 * nothing was measured.
 *
 * So progress is measured here from what you do every week instead:
 *
 *   running  aerobic efficiency (speed per heartbeat), easy pace at a fixed
 *            heart rate, volume, longest run, rolling bests, consistency
 *   gym      tonnage, load per session, per-split trends, consistency
 *   bike     volume, climbing, efficiency, longest ride
 *   body     smoothed weight and its trend toward the goal
 *
 * Every one of those moves week to week from ordinary training. VDOT still
 * exists, but it belongs in "race readiness", not on the front page.
 *
 * Everything in this file is pure: no stores, no localStorage, no `new Date()`
 * except as a default argument. That makes it all testable, and it means the
 * caller decides what "today" means.
 */
import { addDays, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { fitnessSeries, gradeAdjustedPace, relativeEffort } from './analysis'
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
	/** The same measure over the immediately preceding period of equal length. */
	previous: number | null
	/** value − previous, in the metric's own units. Null without a baseline. */
	delta: number | null
	/** Signed relative change, e.g. -0.04 for 4% faster. Null without a baseline. */
	deltaPct: number | null
	unit: string
	/** Preformatted for the UI so the template never does arithmetic. */
	display: string
	deltaDisplay: string | null
	/** Whether a rise is good. Pace and body weight say no. */
	higherIsBetter: boolean
	/** Verdict after accounting for `higherIsBetter` and the dead band. */
	direction: Direction
	/** One sentence explaining what the number means for progress. */
	note: string
	/** Weekly values normalised to 0–100, oldest first. Empty if not applicable. */
	spark: number[]
	/** When `value` is null: why, and what the user can do about it. */
	missing: string | null
}

/**
 * Relative change smaller than this reads as "holding", not as progress.
 * Week-to-week noise in pace and body weight is easily 1–2%; calling that an
 * improvement would make the whole page cry wolf.
 */
const DEAD_BAND = 0.02

/** The comparison window. Four weeks is long enough to survive one bad week. */
export const PERIOD_DAYS = 28

export interface Period {
	from: Date
	to: Date
}

/** The current period and the equal-length one before it. */
export function periods(today = new Date(), days = PERIOD_DAYS): { current: Period; previous: Period } {
	const to = today
	const from = addDays(today, -days)
	return {
		current: { from, to },
		previous: { from: addDays(from, -days), to: from },
	}
}

const inPeriod = (date: Date, p: Period) => date >= p.from && date < p.to

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

/** Scale raw weekly values to 0–100 bar heights. All-zero stays all-zero. */
export function toSpark(values: number[]): number[] {
	const max = Math.max(0, ...values)
	if (max <= 0) return values.map(() => 0)
	return values.map(v => Math.round((v / max) * 100))
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

export interface MetricSpec {
	key: string
	label: string
	unit: string
	current: number | null
	previous: number | null
	higherIsBetter?: boolean
	spark?: number[]
	/** How to render the value. Defaults to one decimal place. */
	format?: (v: number) => string
	/** How to render the change. Defaults to `format` of the absolute delta. */
	formatDelta?: (v: number) => string
	/** Overrides the generated sentence. Receives the finished metric. */
	note?: (m: Omit<Metric, 'note'>) => string
	/** Explains a null `current`. */
	missing?: string | null
	deadBand?: number
}

/**
 * Assemble a metric, working out the direction and a default sentence.
 *
 * The direction is deliberately computed from the *relative* change against a
 * dead band rather than the raw sign, so "0.1 kg heavier than last month" reads
 * as holding steady instead of as a regression.
 */
export function buildMetric(spec: MetricSpec): Metric {
	const {
		key, label, unit, current, previous,
		higherIsBetter = true,
		spark = [],
		format: fmt = (v: number) => String(round(v)),
		deadBand = DEAD_BAND,
	} = spec
	const fmtDelta = spec.formatDelta ?? fmt

	const hasBoth = current !== null && previous !== null && Number.isFinite(previous) && previous !== 0
	const delta = current !== null && previous !== null ? current - previous : null
	const deltaPct = hasBoth ? (current! - previous!) / Math.abs(previous!) : null

	let direction: Direction = 'unknown'
	if (current === null) {
		direction = 'unknown'
	} else if (deltaPct === null) {
		// A first period with nothing to compare against isn't progress or
		// regression — it's a baseline. Say so rather than invent a verdict.
		direction = 'unknown'
	} else if (Math.abs(deltaPct) < deadBand) {
		direction = 'holding'
	} else {
		const rising = deltaPct > 0
		direction = rising === higherIsBetter ? 'improving' : 'declining'
	}

	const base: Omit<Metric, 'note'> = {
		key,
		label,
		value: current,
		previous,
		delta,
		deltaPct,
		unit,
		display: current === null ? '—' : fmt(current),
		deltaDisplay: delta === null || delta === 0 ? null : fmtDelta(Math.abs(delta)),
		higherIsBetter,
		direction,
		spark,
		missing: current === null ? (spec.missing ?? null) : null,
	}

	const note = spec.note
		? spec.note(base)
		: defaultNote(base)

	return { ...base, note }
}

function defaultNote(m: Omit<Metric, 'note'>): string {
	if (m.value === null) return m.missing ?? 'Not enough data yet.'
	const window = `last ${PERIOD_DAYS} days`
	switch (m.direction) {
		case 'improving':
			return `Up on the previous ${PERIOD_DAYS} days — ${m.deltaDisplay} ${m.unit} better.`
		case 'declining':
			return `Down ${m.deltaDisplay} ${m.unit} on the previous ${PERIOD_DAYS} days.`
		case 'holding':
			return `Level with the previous ${PERIOD_DAYS} days.`
		default:
			return `Your baseline for the ${window}. Keep logging and the trend appears here.`
	}
}

// ─── activity helpers ─────────────────────────────────────────────────────────

/** A recorded activity. Deliberately loose — imports vary in what they carry. */
export type Act = Record<string, any>

export const actDate = (a: Act): Date => new Date(a.start_date_local || a.start_date || 0)
export const actSport = (a: Act): string => String(a.sport_type || a.type || '').toLowerCase()

const isRun = (a: Act) => actSport(a) === 'run'
const isRide = (a: Act) => ['ride', 'virtualride', 'ebikeride'].includes(actSport(a))

/** Metres per second, from whichever field the import populated. */
function speedOf(a: Act): number | null {
	if (Number.isFinite(a.average_speed) && a.average_speed > 0) return a.average_speed
	if (a.distance > 0 && a.moving_time > 0) return a.distance / a.moving_time
	return null
}

// ─── aerobic efficiency ───────────────────────────────────────────────────────

/** Below this the sample is too short for average HR to mean anything. */
export const MIN_EF_SECONDS = 15 * 60

/**
 * Efficiency factor: metres covered per minute, per heartbeat.
 *
 * This is the single best "am I getting fitter?" signal available from ordinary
 * training, because it is normalised for effort. Going 3% further per beat at
 * the same heart rate is aerobic adaptation, and it shows up in easy running
 * weeks before it shows up in any race.
 *
 * Grade-adjusted speed is used when the file carries altitude, so a hilly week
 * doesn't read as a loss of fitness.
 */
export function efficiencyFactor(a: Act): number | null {
	const hr = a.average_heartrate
	if (!Number.isFinite(hr) || hr < 90) return null
	if (!Number.isFinite(a.moving_time) || a.moving_time < MIN_EF_SECONDS) return null
	const speed = gradeAdjustedPace(a)?.speed ?? speedOf(a)
	if (speed === null || speed < 1.4) return null
	return round((speed * 60) / hr, 3)
}

/**
 * Runs steady enough for efficiency to be comparable between periods.
 *
 * An interval session and a recovery jog have very different efficiency for
 * reasons that have nothing to do with fitness, so hard efforts are excluded
 * when we know max HR. Without max HR we can't tell, and including everything
 * is better than showing nothing.
 */
export const STEADY_HR_FRACTION = 0.88

function steadyRuns(acts: Act[], maxHR: number | null): Act[] {
	return acts.filter(a => {
		if (!isRun(a)) return false
		if (efficiencyFactor(a) === null) return false
		if (maxHR && maxHR >= 140 && a.average_heartrate > maxHR * STEADY_HR_FRACTION) return false
		return true
	})
}

// ─── running ──────────────────────────────────────────────────────────────────

export interface RunInputs {
	activities: Act[]
	/** Completed workouts, used for volume when there is no recording. */
	runKmByWeek: number[]
	maxHR: number | null
	restHR: number
	today?: Date
}

export interface SportProgress {
	metrics: Metric[]
	/** True when there is enough logged work for any of this to be meaningful. */
	hasData: boolean
}

/**
 * Progress for running: efficiency first, because it's the one that moves.
 */
export function runningProgress(input: RunInputs): SportProgress {
	const { activities, runKmByWeek, maxHR } = input
	const today = input.today ?? new Date()
	const { current, previous } = periods(today)

	const runs = activities.filter(isRun)
	const inCur = (a: Act) => inPeriod(actDate(a), current)
	const inPrev = (a: Act) => inPeriod(actDate(a), previous)

	const metrics: Metric[] = []

	// 1. Aerobic efficiency — speed per heartbeat on steady runs.
	const steady = steadyRuns(runs, maxHR)
	const efCur = mean(steady.filter(inCur).map(a => efficiencyFactor(a)!))
	const efPrev = mean(steady.filter(inPrev).map(a => efficiencyFactor(a)!))
	const efWeeks = weekWindows(8, today).map(w =>
		mean(steady.filter(a => actDate(a) >= w.start && actDate(a) <= w.end).map(a => efficiencyFactor(a)!)) ?? 0)

	metrics.push(buildMetric({
		key: 'run-efficiency',
		label: 'Aerobic efficiency',
		unit: 'm/beat',
		current: efCur === null ? null : round(efCur, 2),
		previous: efPrev === null ? null : round(efPrev, 2),
		higherIsBetter: true,
		spark: toSpark(efWeeks),
		format: v => v.toFixed(2),
		formatDelta: v => v.toFixed(2),
		missing: 'Needs runs of 15 minutes or more recorded with a heart rate monitor.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `You're covering ${m.deltaDisplay} more metres per heartbeat than last month. That's aerobic fitness, and it shows up here long before it shows up in a race.`
			if (m.direction === 'declining') return `Down ${m.deltaDisplay} m/beat on last month. Normal during a hard block or a bad-sleep spell — worth watching if it keeps sliding.`
			if (m.direction === 'holding') return 'Holding steady. Same speed for the same effort as last month.'
			return 'Your first month of readings. From here you can watch it climb.'
		},
	}))

	// 2. Easy pace at aerobic heart rate — the same effort, timed.
	const aerobic = aerobicPaceSamples(runs, maxHR, input.restHR)
	const paceCur = median(aerobic.filter(s => inPeriod(s.date, current)).map(s => s.paceSec))
	const pacePrev = median(aerobic.filter(s => inPeriod(s.date, previous)).map(s => s.paceSec))

	metrics.push(buildMetric({
		key: 'run-easy-pace',
		label: 'Easy pace',
		unit: '/km',
		current: paceCur === null ? null : Math.round(paceCur),
		previous: pacePrev === null ? null : Math.round(pacePrev),
		higherIsBetter: false, // faster is a smaller number
		format: v => fmtPace(v),
		formatDelta: v => `${Math.round(v)} s`,
		missing: maxHR && maxHR >= 140
			? 'No easy runs in the aerobic heart rate band yet.'
			: 'Needs a heart rate monitor, or a max HR set in Profile.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `${m.deltaDisplay}/km faster than last month at the same heart rate. Free speed — the effort didn't change.`
			if (m.direction === 'declining') return `${m.deltaDisplay}/km slower at the same heart rate than last month.`
			if (m.direction === 'holding') return 'Same pace for the same effort as last month.'
			return 'Your baseline easy pace. Watch this drop while your heart rate stays put.'
		},
	}))

	// 3. Volume. Not fitness by itself, but it's the input everything else needs.
	const kmCur = sumLast(runKmByWeek, 4)
	const kmPrev = sumLast(runKmByWeek, 8) - kmCur
	metrics.push(buildMetric({
		key: 'run-volume',
		label: 'Volume',
		unit: 'km',
		current: runKmByWeek.length ? round(kmCur) : null,
		previous: runKmByWeek.length >= 8 ? round(kmPrev) : null,
		spark: toSpark(runKmByWeek.slice(-8)),
		format: v => String(round(v)),
		missing: 'No runs logged yet.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `${m.deltaDisplay} km more than the previous four weeks. Rising volume is what makes everything else improve.`
			if (m.direction === 'declining') return `${m.deltaDisplay} km down on the previous four weeks.`
			if (m.direction === 'holding') return 'Steady volume — the same load as last month.'
			return 'Your first four weeks of running.'
		},
	}))

	// 4. Longest run — the number that actually gates a long-distance race.
	const longCur = maxOr(runs.filter(inCur).map(a => (a.distance ?? 0) / 1000))
	const longPrev = maxOr(runs.filter(inPrev).map(a => (a.distance ?? 0) / 1000))
	metrics.push(buildMetric({
		key: 'run-longest',
		label: 'Longest run',
		unit: 'km',
		current: longCur === null ? null : round(longCur),
		previous: longPrev === null ? null : round(longPrev),
		format: v => String(round(v)),
		missing: 'No recorded runs yet.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `${m.deltaDisplay} km further than your longest run last month.`
			if (m.direction === 'declining') return 'Shorter than last month\'s longest. Fine in a speed block, not in a marathon build.'
			if (m.direction === 'holding') return 'Same long run as last month.'
			return 'Your longest run so far this month.'
		},
	}))

	// 5. Consistency. The most predictive number on the page, and the dullest.
	const sessCur = runs.filter(inCur).length
	const sessPrev = runs.filter(inPrev).length
	metrics.push(buildMetric({
		key: 'run-consistency',
		label: 'Runs',
		unit: 'runs',
		current: sessCur,
		previous: runs.length ? sessPrev : null,
		spark: toSpark(weekWindows(8, today).map(w => runs.filter(a => actDate(a) >= w.start && actDate(a) <= w.end).length)),
		format: v => String(Math.round(v)),
		formatDelta: v => String(Math.round(v)),
		note: m => {
			const perWeek = m.value === null ? 0 : round(m.value / 4)
			if (!m.value) return 'No runs in the last four weeks.'
			if (m.direction === 'improving') return `${perWeek} runs a week, up ${m.deltaDisplay} on last month. Consistency beats intensity.`
			if (m.direction === 'declining') return `${perWeek} runs a week, ${m.deltaDisplay} fewer than last month.`
			return `${perWeek} runs a week, same as last month.`
		},
	}))

	return { metrics, hasData: runs.length > 0 || runKmByWeek.some(v => v > 0) }
}

/** Median pace of runs whose average HR sits in the aerobic band. */
export function aerobicPaceSamples(
	activities: Act[],
	maxHR: number | null,
	restHR: number,
): { date: Date; paceSec: number }[] {
	if (!maxHR || maxHR < 140) return []
	const reserve = maxHR - restHR
	const lo = restHR + reserve * 0.55
	const hi = restHR + reserve * 0.75
	return activities
		.filter(a => {
			if (!isRun(a)) return false
			const hr = a.average_heartrate
			return Number.isFinite(hr) && hr >= lo && hr <= hi && (speedOf(a) ?? 0) > 1.5
		})
		.map(a => ({ date: actDate(a), paceSec: 1000 / speedOf(a)! }))
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
 * Best efforts over a rolling window.
 *
 * This is the honest answer to "I can't see progress without racing": every
 * recorded run is scanned for its fastest 1 km, 5 km and so on, so a hard
 * Tuesday counts. A 90-day window means the comparison is against a real
 * training block rather than against one lucky day years ago.
 */
export function bestEffortProgress(
	activities: Act[],
	windowDays = 90,
	today = new Date(),
): BestEffortProgress[] {
	const curFrom = addDays(today, -windowDays)
	const prevFrom = addDays(today, -windowDays * 2)

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
				allTimeDate = when.toISOString().slice(0, 10)
			}
			if (when >= curFrom) {
				if (current === null || t < current) current = t
			} else if (when >= prevFrom) {
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
}

/**
 * Fitness, fatigue and form from heart-rate training load.
 *
 * Fitness is a 42-day weighted average of daily effort, fatigue a 7-day one,
 * and form the difference. Unlike VDOT this moves *every single day you train*,
 * which is exactly the progress signal a training log should lead with. The
 * maths already existed in analysis.ts and was never surfaced.
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
	for (const a of activities) {
		const load = relativeEffort(a, maxHR, restHR)
		if (!load) continue
		const key = actDate(a).toISOString().slice(0, 10)
		efforts[key] = (efforts[key] || 0) + load
	}
	if (!Object.keys(efforts).length) return null

	const series = fitnessSeries(efforts, days, today)
	if (series.length < 7) return null

	const last = series[series.length - 1]
	const prevIdx = series.length - 1 - PERIOD_DAYS
	const fitnessPrev = prevIdx >= 0 ? series[prevIdx].fitness : null

	// Form thresholds follow the usual TSB reading: comfortably positive means
	// rested, deeply negative means you're digging a hole.
	const form = last.form
	const formLabel: TrainingLoad['formLabel'] =
		form > 5 ? 'fresh' : form >= -10 ? 'neutral' : form >= -25 ? 'building' : 'strained'

	return {
		series,
		fitness: last.fitness,
		fatigue: last.fatigue,
		form,
		fitnessPrev,
		formLabel,
	}
}

/** The fitness number as a Metric, so it renders like everything else. */
export function fitnessMetric(load: TrainingLoad | null): Metric {
	return buildMetric({
		key: 'training-load',
		label: 'Fitness',
		unit: 'pts',
		current: load ? load.fitness : null,
		previous: load ? load.fitnessPrev : null,
		spark: load ? toSpark(sampleEvenly(load.series.map(p => p.fitness), 8)) : [],
		format: v => String(Math.round(v)),
		formatDelta: v => String(Math.round(v)),
		missing: 'Needs heart rate data and a max HR in Profile.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `Your accumulated training load is up ${m.deltaDisplay} points on last month. This is the number that moves every time you train.`
			if (m.direction === 'declining') return `Down ${m.deltaDisplay} points — you've trained less than the month before.`
			if (m.direction === 'holding') return 'Load is level with last month. Maintaining, not building.'
			return 'Building your first month of load history.'
		},
	})
}

// ─── gym ──────────────────────────────────────────────────────────────────────

export interface GymSplitProgress {
	split: string
	sessions: number
	/** Mean tonnage per session in the current period, tonnes. */
	loadPerSession: number | null
	previousLoadPerSession: number | null
	direction: Direction
	spark: number[]
}

export interface GymProgress extends SportProgress {
	splits: GymSplitProgress[]
}

/**
 * Progress for lifting.
 *
 * Total tonnage is the obvious metric and a poor one: it rises when you train
 * more often and falls on a deload, so it says more about your calendar than
 * your strength. Load *per session* is the one that answers "am I lifting more
 * than I was", so it leads here, with total volume and consistency behind it.
 */
export function gymProgress(gymWorkouts: Workout[], today = new Date()): GymProgress {
	const { current, previous } = periods(today)
	const dateOf = (w: Workout) => new Date(w.date)
	const tonnes = (w: Workout) => (w.totalWeightLifted || 0) / 1000

	const cur = gymWorkouts.filter(w => inPeriod(dateOf(w), current))
	const prev = gymWorkouts.filter(w => inPeriod(dateOf(w), previous))
	const weeks = weekWindows(8, today)
	const weekTonnage = weeks.map(wk =>
		gymWorkouts
			.filter(w => dateOf(w) >= wk.start && dateOf(w) <= wk.end)
			.reduce((s, w) => s + tonnes(w), 0))

	const loaded = (ws: Workout[]) => ws.filter(w => (w.totalWeightLifted || 0) > 0)
	const perSession = (ws: Workout[]) => mean(loaded(ws).map(tonnes))

	const metrics: Metric[] = []

	metrics.push(buildMetric({
		key: 'gym-load-per-session',
		label: 'Load per session',
		unit: 't',
		current: perSession(cur) === null ? null : round(perSession(cur)!, 2),
		previous: perSession(prev) === null ? null : round(perSession(prev)!, 2),
		spark: toSpark(weeks.map(wk => {
			const ws = loaded(gymWorkouts.filter(w => dateOf(w) >= wk.start && dateOf(w) <= wk.end))
			return mean(ws.map(tonnes)) ?? 0
		})),
		format: v => v.toFixed(2),
		formatDelta: v => v.toFixed(2),
		missing: 'Log the total load lifted when you complete a gym session and this starts tracking.',
		note: m => {
			if (m.value === null) return m.missing!
			if (m.direction === 'improving') return `${m.deltaDisplay} t more per session than last month — you're doing more work each time you train, not just training more often.`
			if (m.direction === 'declining') return `${m.deltaDisplay} t less per session than last month. Expected on a deload.`
			if (m.direction === 'holding') return 'Same work per session as last month.'
			return 'Your baseline session load.'
		},
	}))

	metrics.push(buildMetric({
		key: 'gym-volume',
		label: 'Total volume',
		unit: 't',
		current: round(cur.reduce((s, w) => s + tonnes(w), 0)),
		previous: gymWorkouts.length ? round(prev.reduce((s, w) => s + tonnes(w), 0)) : null,
		spark: toSpark(weekTonnage),
		format: v => String(round(v)),
		note: m => {
			if (!m.value) return 'No load logged in the last four weeks.'
			if (m.direction === 'improving') return `${m.deltaDisplay} t more moved than the previous four weeks.`
			if (m.direction === 'declining') return `${m.deltaDisplay} t less than the previous four weeks.`
			return 'Level with the previous four weeks.'
		},
	}))

	metrics.push(buildMetric({
		key: 'gym-sessions',
		label: 'Sessions',
		unit: 'sessions',
		current: cur.length,
		previous: gymWorkouts.length ? prev.length : null,
		spark: toSpark(weeks.map(wk => gymWorkouts.filter(w => dateOf(w) >= wk.start && dateOf(w) <= wk.end).length)),
		format: v => String(Math.round(v)),
		formatDelta: v => String(Math.round(v)),
		note: m => {
			if (!m.value) return 'No gym sessions in the last four weeks.'
			const perWeek = round(m.value / 4)
			if (m.direction === 'improving') return `${perWeek} a week, up ${m.deltaDisplay} on last month.`
			if (m.direction === 'declining') return `${perWeek} a week, ${m.deltaDisplay} fewer than last month.`
			return `${perWeek} a week, same as last month.`
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
		const c = perSession(ws.filter(w => inPeriod(dateOf(w), current)))
		const p = perSession(ws.filter(w => inPeriod(dateOf(w), previous)))
		const m = buildMetric({
			key: `split-${split}`, label: split, unit: 't',
			current: c === null ? null : round(c, 2),
			previous: p === null ? null : round(p, 2),
		})
		return {
			split,
			sessions: ws.length,
			loadPerSession: c === null ? null : round(c, 2),
			previousLoadPerSession: p === null ? null : round(p, 2),
			direction: m.direction,
			spark: toSpark(weeks.map(wk => {
				const inWk = loaded(ws.filter(w => dateOf(w) >= wk.start && dateOf(w) <= wk.end))
				return mean(inWk.map(tonnes)) ?? 0
			})),
		}
	}).sort((a, b) => b.sessions - a.sessions)

	return { metrics, splits, hasData: gymWorkouts.length > 0 }
}

// ─── bike ─────────────────────────────────────────────────────────────────────

export function bikeProgress(activities: Act[], bikeKmByWeek: number[], maxHR: number | null, today = new Date()): SportProgress {
	const { current, previous } = periods(today)
	const rides = activities.filter(isRide)
	const inCur = (a: Act) => inPeriod(actDate(a), current)
	const inPrev = (a: Act) => inPeriod(actDate(a), previous)

	const metrics: Metric[] = []

	const kmCur = sumLast(bikeKmByWeek, 4)
	const kmPrev = sumLast(bikeKmByWeek, 8) - kmCur
	metrics.push(buildMetric({
		key: 'bike-volume',
		label: 'Volume',
		unit: 'km',
		current: bikeKmByWeek.length ? round(kmCur) : null,
		previous: bikeKmByWeek.length >= 8 ? round(kmPrev) : null,
		spark: toSpark(bikeKmByWeek.slice(-8)),
		format: v => String(round(v)),
		missing: 'No rides logged yet.',
	}))

	const steady = rides.filter(a => efficiencyFactor(a) !== null &&
		(!maxHR || maxHR < 140 || a.average_heartrate <= maxHR * STEADY_HR_FRACTION))
	const efCur = mean(steady.filter(inCur).map(a => efficiencyFactor(a)!))
	const efPrev = mean(steady.filter(inPrev).map(a => efficiencyFactor(a)!))
	metrics.push(buildMetric({
		key: 'bike-efficiency',
		label: 'Aerobic efficiency',
		unit: 'm/beat',
		current: efCur === null ? null : round(efCur, 2),
		previous: efPrev === null ? null : round(efPrev, 2),
		format: v => v.toFixed(2),
		formatDelta: v => v.toFixed(2),
		missing: 'Needs rides recorded with a heart rate monitor.',
		note: m => m.value === null ? m.missing!
			: m.direction === 'improving' ? `${m.deltaDisplay} more metres per heartbeat than last month.`
			: m.direction === 'declining' ? `Down ${m.deltaDisplay} m/beat on last month.`
			: m.direction === 'holding' ? 'Same speed for the same effort as last month.'
			: 'Your first month of readings.',
	}))

	const climbCur = rides.filter(inCur).reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
	const climbPrev = rides.filter(inPrev).reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
	metrics.push(buildMetric({
		key: 'bike-climb',
		label: 'Climbing',
		unit: 'm',
		current: rides.length ? Math.round(climbCur) : null,
		previous: rides.length ? Math.round(climbPrev) : null,
		format: v => String(Math.round(v)),
		formatDelta: v => String(Math.round(v)),
		missing: 'No recorded rides yet.',
	}))

	const longCur = maxOr(rides.filter(inCur).map(a => (a.distance ?? 0) / 1000))
	const longPrev = maxOr(rides.filter(inPrev).map(a => (a.distance ?? 0) / 1000))
	metrics.push(buildMetric({
		key: 'bike-longest',
		label: 'Longest ride',
		unit: 'km',
		current: longCur === null ? null : round(longCur),
		previous: longPrev === null ? null : round(longPrev),
		format: v => String(round(v)),
		missing: 'No recorded rides yet.',
	}))

	return { metrics, hasData: rides.length > 0 || bikeKmByWeek.some(v => v > 0) }
}

// ─── body weight ──────────────────────────────────────────────────────────────

export interface WeighIn {
	date: string
	weight: number
}

export interface BodyProgress extends SportProgress {
	/** Smoothed series for the chart: date plus 7-day trailing mean. */
	smoothed: { date: string; weight: number }[]
	/** Weeks until the goal at the current rate, null when not applicable. */
	weeksToGoal: number | null
	atGoal: boolean
}

/**
 * Progress for body weight, on a 7-day trailing mean.
 *
 * A single morning reading swings a kilo on hydration alone, so comparing "last
 * weigh-in" to "the one four weeks ago" mostly measures noise. Smoothing first
 * means the direction shown is the direction that's real.
 */
export function bodyProgress(weights: WeighIn[], goalWeight: number | null, today = new Date()): BodyProgress {
	const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))

	const smoothed = sorted.map((w, i) => {
		const from = addDays(new Date(w.date), -6)
		const window = sorted.slice(0, i + 1).filter(x => new Date(x.date) >= from)
		return { date: w.date, weight: round(mean(window.map(x => x.weight))!, 2) }
	})

	const at = (when: Date): number | null => {
		const cutoff = when.toISOString().slice(0, 10)
		const upto = smoothed.filter(s => s.date <= cutoff)
		return upto.length ? upto[upto.length - 1].weight : null
	}

	const curr = smoothed.length ? smoothed[smoothed.length - 1].weight : null
	const prev = at(addDays(today, -PERIOD_DAYS))

	// Direction depends on which way the goal lies. Without a goal, "no change"
	// is the neutral reading — we must not assume everyone wants to lose weight.
	const losing = goalWeight !== null && curr !== null ? goalWeight < curr : null
	const higherIsBetter = losing === null ? true : !losing

	const metrics: Metric[] = []
	metrics.push(buildMetric({
		key: 'body-weight',
		label: 'Body weight',
		unit: 'kg',
		current: curr,
		previous: prev,
		higherIsBetter,
		spark: toSpark(weekWindows(8, today).map(wk => {
			const inWk = smoothed.filter(s => new Date(s.date) >= wk.start && new Date(s.date) <= wk.end)
			return inWk.length ? inWk[inWk.length - 1].weight : 0
		})),
		format: v => v.toFixed(1),
		formatDelta: v => v.toFixed(1),
		missing: 'Log your weight from the schedule page to start tracking.',
		note: m => {
			if (m.value === null) return m.missing!
			if (goalWeight === null) {
				if (m.direction === 'holding') return '7-day average, level with last month. Set a goal weight in Profile to track a target.'
				return `7-day average, ${m.delta! > 0 ? 'up' : 'down'} ${m.deltaDisplay} kg on last month. Set a goal weight in Profile to track a target.`
			}
			const away = round(Math.abs(m.value - goalWeight))
			if (away <= 0.3) return 'At your goal weight. Nice.'
			if (m.direction === 'improving') return `${m.deltaDisplay} kg closer to your goal than last month — ${away} kg to go.`
			if (m.direction === 'declining') return `Moving away from your goal — ${away} kg to go.`
			return `Holding steady, ${away} kg from your goal.`
		},
	}))

	// Rate of change per week, from the smoothed series over the period.
	const ratePerWeek = curr !== null && prev !== null ? ((curr - prev) / PERIOD_DAYS) * 7 : null
	let weeksToGoal: number | null = null
	if (goalWeight !== null && curr !== null && ratePerWeek !== null && Math.abs(ratePerWeek) > 0.01) {
		const need = goalWeight - curr
		// Only meaningful when the trend is pointing at the goal.
		if (Math.sign(need) === Math.sign(ratePerWeek)) weeksToGoal = Math.ceil(need / ratePerWeek)
	}

	return {
		metrics,
		smoothed,
		weeksToGoal,
		atGoal: goalWeight !== null && curr !== null && Math.abs(curr - goalWeight) <= 0.3,
		hasData: sorted.length > 0,
	}
}

// ─── load ramp guardrail ──────────────────────────────────────────────────────

export type RampVerdict = 'ok' | 'sharp' | 'detraining' | 'unknown'

export interface Ramp {
	/** This week's distance against the trailing 4-week mean. 1.0 is steady. */
	ratio: number | null
	verdict: RampVerdict
	message: string
}

/**
 * Acute-to-chronic workload, in kilometres.
 *
 * Ramping volume faster than roughly 1.5× your recent average is the single
 * most reliable way to get injured, and the app already had every number needed
 * to warn about it. Progress that lands you injured isn't progress.
 */
export function volumeRamp(kmByWeek: number[]): Ramp {
	if (kmByWeek.length < 5) {
		return { ratio: null, verdict: 'unknown', message: 'Not enough weeks logged to judge your ramp rate yet.' }
	}
	const thisWeek = kmByWeek[kmByWeek.length - 1]
	const priorFour = kmByWeek.slice(-5, -1)
	const chronic = mean(priorFour)!
	if (chronic <= 0) {
		return { ratio: null, verdict: 'unknown', message: 'No recent volume to compare this week against.' }
	}
	const ratio = round(thisWeek / chronic, 2)
	if (ratio > 1.5) {
		return { ratio, verdict: 'sharp', message: `This week is ${Math.round((ratio - 1) * 100)}% above your four-week average. That's the ramp rate that gets people injured — consider easing off.` }
	}
	if (ratio < 0.6) {
		return { ratio, verdict: 'detraining', message: `This week is well below your four-week average. Fine for a deload or a taper; a habit if it repeats.` }
	}
	return { ratio, verdict: 'ok', message: `This week sits at ${ratio}× your four-week average — a sustainable rate of build.` }
}

// ─── small helpers ────────────────────────────────────────────────────────────

function sumLast(xs: number[], n: number): number {
	return xs.slice(-n).reduce((s, x) => s + x, 0)
}

function maxOr(xs: number[]): number | null {
	const valid = xs.filter(x => Number.isFinite(x) && x > 0)
	return valid.length ? Math.max(...valid) : null
}

/** Take `n` roughly evenly spaced values, keeping the first and last. */
export function sampleEvenly(xs: number[], n: number): number[] {
	if (xs.length <= n) return xs
	const out: number[] = []
	for (let i = 0; i < n; i++) out.push(xs[Math.round((i * (xs.length - 1)) / (n - 1))])
	return out
}
