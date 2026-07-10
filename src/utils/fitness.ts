/**
 * Current fitness, expressed as a VDOT.
 *
 * Training paces come from the fitness you have, not the fitness you want —
 * that's the whole point of Daniels' model, and prescribing off a goal is how
 * people get hurt. So we need an honest read on "what could you race today?".
 *
 * Sources, in descending order of trust:
 *
 *   1. A manual override. You know when you actually raced.
 *   2. A logged race result. A race is a maximal effort by definition.
 *   3. Best efforts inside training runs. Always an underestimate — nobody
 *      time-trials a Tuesday — but it's real data and it decays honestly.
 */
import { vdotFromRace } from './vdot'
import type { RaceGoal } from '@/types'

/** Daniels' tables are meaningless below ~1500 m; a fast km inside a run is not a VDOT. */
export const MIN_EFFORT_M = 3000

/** A race stays a valid read on fitness for about six months. */
export const RACE_WINDOW_DAYS = 180

/**
 * How far back we look for a hard training effort.
 *
 * This used to be 42 days, which had it backwards: a slow easy run from last
 * week outranked a hard effort from seven weeks ago, so a block of base training
 * made you look unfit. A maximal effort still says something about you three
 * months later; an easy run never said anything at all. So look back 90 days and
 * take the best — but flag the reading as ageing once the winner is old.
 */
export const EFFORT_WINDOW_DAYS = 90

/** Past this age, the winning effort still counts but is reported as ageing. */
export const EFFORT_FRESH_DAYS = 42

export type VdotSource = 'override' | 'race' | 'effort'

export interface VdotSample {
	date: string        // yyyy-MM-dd
	vdot: number
	source: Exclude<VdotSource, 'override'>
	label: string       // "Half marathon 1:42:00", "5 km best effort"
}

export interface CurrentVdot {
	vdot: number
	source: VdotSource
	label: string
	date: string | null
	/** True when the newest supporting sample is older than EFFORT_WINDOW_DAYS. */
	stale: boolean
}

const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000)
const iso = (d: Date | string) => (typeof d === 'string' ? d : d.toISOString()).slice(0, 10)

/** VDOT samples from logged race results. */
export function raceVdotSamples(races: RaceGoal[]): VdotSample[] {
	const out: VdotSample[] = []
	for (const r of races) {
		if (!r.result_time_secs || !r.distance_km) continue
		const v = vdotFromRace(r.distance_km * 1000, r.result_time_secs)
		if (v === null) continue
		out.push({ date: iso(r.date), vdot: v, source: 'race', label: r.name })
	}
	return out.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * VDOT samples from imported activities: the best sub-effort inside each run,
 * plus the run taken whole. One sample per activity — its strongest showing.
 */
export function effortVdotSamples(activities: any[]): VdotSample[] {
	const out: VdotSample[] = []
	for (const a of activities) {
		const sport = (a.sport_type || a.type || '').toLowerCase()
		if (sport !== 'run') continue
		const date = iso(a.start_date_local || a.start_date || '')
		if (!date) continue

		let bestVdot = 0
		let bestLabel = ''
		const consider = (m: number, secs: number, label: string) => {
			if (m < MIN_EFFORT_M || !secs) return
			const v = vdotFromRace(m, secs)
			if (v !== null && v > bestVdot) { bestVdot = v; bestLabel = label }
		}

		for (const be of a.best_efforts ?? []) consider(be.distance, be.elapsed_time, `${be.name} best effort`)
		if (a.distance && a.moving_time) consider(a.distance, a.moving_time, a.name || 'Run')

		if (bestVdot > 0) out.push({ date, vdot: bestVdot, source: 'effort', label: bestLabel })
	}
	return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** A run you typed in by hand: distance and duration, no recording behind it. */
export interface LoggedRun {
	date: string
	name: string
	distanceKm: number
	minutes: number
}

/**
 * VDOT samples from hand-logged runs — the ones with no FIT file behind them.
 *
 * These read lower than a recording of the same run: a recording surfaces the
 * best hard stretch *inside* the run, while a logged run only knows its overall
 * average. Since `currentVdot` takes a maximum, that asymmetry is safe — a
 * logged run only moves the number when it was genuinely fast.
 *
 * The caller must exclude runs that have a recording, or the same run counts twice.
 */
export function loggedRunVdotSamples(runs: LoggedRun[]): VdotSample[] {
	const out: VdotSample[] = []
	for (const r of runs) {
		if (!(r.distanceKm > 0) || !(r.minutes > 0)) continue
		const metres = r.distanceKm * 1000
		if (metres < MIN_EFFORT_M) continue
		// vdotFromRace rejects impossible speeds, which is what catches the
		// mistyped rows (a "20 min threshold" carrying 31 km).
		const v = vdotFromRace(metres, r.minutes * 60)
		if (v === null) continue
		out.push({ date: iso(r.date), vdot: v, source: 'effort', label: `${r.name} (logged)` })
	}
	return out.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Your current VDOT. `override` wins outright; otherwise the best recent race,
 * then the best recent training effort. Null when there's nothing to go on.
 */
export function currentVdot(
	races: VdotSample[],
	efforts: VdotSample[],
	override: number | null,
	today = new Date(),
): CurrentVdot | null {
	if (override && override >= 20 && override <= 90) {
		return { vdot: override, source: 'override', label: 'Set manually', date: null, stale: false }
	}

	const within = (s: VdotSample, days: number) => dayDiff(today, new Date(s.date)) <= days
	const best = (xs: VdotSample[]) =>
		xs.length ? xs.reduce((b, s) => (s.vdot > b.vdot ? s : b)) : null

	const race = best(races.filter(s => within(s, RACE_WINDOW_DAYS)))
	if (race) {
		const stale = !within(race, EFFORT_FRESH_DAYS)
		return { vdot: race.vdot, source: 'race', label: race.label, date: race.date, stale }
	}

	// Best effort over the whole window, not the freshest — an easy run from
	// yesterday tells you less than a hard one from two months ago.
	const effort = best(efforts.filter(s => within(s, EFFORT_WINDOW_DAYS)))
	if (effort) {
		const stale = !within(effort, EFFORT_FRESH_DAYS)
		return { vdot: effort.vdot, source: 'effort', label: effort.label, date: effort.date, stale }
	}

	return null
}

// ─── trend ────────────────────────────────────────────────────────────────────

/** Linear extrapolation stops meaning anything much past half a year. */
export const MAX_PROJECTION_DAYS = 182

/** VDOT is only defined over roughly this range; never report outside it. */
const clampVdot = (v: number) => Math.min(90, Math.max(20, v))

export interface BestPoint {
	date: string        // the weekly anchor
	vdot: number        // best effort within the trailing window at that anchor
	sourceDate: string  // which sample supplied it
}

/**
 * Your fitness line: at each weekly anchor, the best VDOT recorded in the
 * preceding `windowDays`. This is exactly the number `currentVdot` reports, just
 * plotted through time.
 *
 * Raw per-run VDOT is the wrong thing to trend. Easy runs imply a low VDOT, so a
 * base-training block reads as a collapse in fitness when nothing has been lost —
 * you simply haven't tried hard lately. A trailing maximum only falls when a good
 * effort ages out, which is the honest meaning of "getting slower".
 */
export function rollingBestSeries(
	samples: VdotSample[],
	weeks = 12,
	windowDays = EFFORT_WINDOW_DAYS,
	today = new Date(),
): BestPoint[] {
	const out: BestPoint[] = []
	for (let w = weeks - 1; w >= 0; w--) {
		const anchor = new Date(today.getTime() - w * 7 * 86_400_000)
		let best: VdotSample | null = null
		for (const s of samples) {
			const age = dayDiff(anchor, new Date(s.date))
			if (age < 0 || age > windowDays) continue
			if (!best || s.vdot > best.vdot) best = s
		}
		if (best) out.push({ date: iso(anchor), vdot: best.vdot, sourceDate: best.date })
	}
	return out
}

/**
 * VDOT gained per 30 days, from a least-squares fit over the fitness line.
 *
 * Null when a single effort dominates every window: the line is then flat only
 * because nothing new has been measured, and reporting "0/month" would imply we
 * looked and found no change. We didn't look — there was nothing to look at.
 */
export function vdotTrendPerMonth(samples: VdotSample[], weeks = 12, today = new Date()): number | null {
	const series = rollingBestSeries(samples, weeks, EFFORT_WINDOW_DAYS, today)
	if (series.length < 3) return null
	if (new Set(series.map(p => p.sourceDate)).size < 2) return null

	// x in days-ago (negated so time runs forwards), y in VDOT
	const pts = series.map(p => ({ x: -dayDiff(today, new Date(p.date)), y: p.vdot }))
	const n = pts.length
	const mx = pts.reduce((s, p) => s + p.x, 0) / n
	const my = pts.reduce((s, p) => s + p.y, 0) / n
	const den = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0)
	if (!den) return null
	const slopePerDay = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / den
	return Math.round(slopePerDay * 30 * 100) / 100
}

/** Where the trend puts you on `targetDate`, clamped to a physiologically real range. */
export function projectVdot(current: number, perMonth: number, targetDate: string, today = new Date()): number {
	const days = dayDiff(new Date(targetDate), today)
	return Math.round(clampVdot(current + (perMonth * days) / 30) * 10) / 10
}

// ─── goal tracking ────────────────────────────────────────────────────────────

export interface GoalProgress {
	neededVdot: number
	currentVdot: number
	gap: number               // VDOT still to find; <= 0 means already there
	daysOut: number | null    // null for undated (aspirational) goals
	projectedVdot: number | null
	projectedShortfall: number | null  // > 0 means the trend arrives short
	onTrack: boolean | null
	/** Set when we deliberately declined to project. */
	noProjectionReason: 'undated' | 'past' | 'no-trend' | 'too-far' | null
}

export function goalProgress(
	neededVdot: number,
	current: number,
	perMonth: number | null,
	targetDate: string | null,
	today = new Date(),
): GoalProgress {
	const gap = Math.round((neededVdot - current) * 10) / 10
	const daysOut = targetDate ? dayDiff(new Date(targetDate), today) : null
	const base = { neededVdot, currentVdot: current, gap, daysOut, projectedVdot: null, projectedShortfall: null, onTrack: null }

	if (targetDate === null || daysOut === null) return { ...base, noProjectionReason: 'undated' }
	if (daysOut < 0) return { ...base, noProjectionReason: 'past' }
	if (perMonth === null) return { ...base, noProjectionReason: 'no-trend' }
	// A straight line drawn ten months out is a fantasy, not a projection.
	if (daysOut > MAX_PROJECTION_DAYS) return { ...base, noProjectionReason: 'too-far' }

	const projectedVdot = projectVdot(current, perMonth, targetDate, today)
	const projectedShortfall = Math.round((neededVdot - projectedVdot) * 10) / 10
	return {
		neededVdot, currentVdot: current, gap, daysOut,
		projectedVdot, projectedShortfall, onTrack: projectedShortfall <= 0,
		noProjectionReason: null,
	}
}
