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
/** Training efforts go stale much faster. */
export const EFFORT_WINDOW_DAYS = 42
/** Beyond this we still show a number, but flag it as stale. */
export const STALE_WINDOW_DAYS = 120

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
	if (race) return { vdot: race.vdot, source: 'race', label: race.label, date: race.date, stale: false }

	const fresh = best(efforts.filter(s => within(s, EFFORT_WINDOW_DAYS)))
	if (fresh) return { vdot: fresh.vdot, source: 'effort', label: fresh.label, date: fresh.date, stale: false }

	const stale = best(efforts.filter(s => within(s, STALE_WINDOW_DAYS)))
	if (stale) return { vdot: stale.vdot, source: 'effort', label: stale.label, date: stale.date, stale: true }

	return null
}

// ─── trend ────────────────────────────────────────────────────────────────────

/** Linear extrapolation stops meaning anything much past half a year. */
export const MAX_PROJECTION_DAYS = 182

/** VDOT is only defined over roughly this range; never report outside it. */
const clampVdot = (v: number) => Math.min(90, Math.max(20, v))

/**
 * VDOT gained per 30 days, from a least-squares fit over the best sample in each
 * week. Weekly maxima, not raw samples: easy runs would otherwise drag the line
 * down whenever you happened to log more of them.
 *
 * Pass ONE source. Races and training efforts measure with different rulers — a
 * race in May followed by training efforts in July looks like a collapse in
 * fitness when it's really just two different kinds of measurement.
 */
export function vdotTrendPerMonth(samples: VdotSample[], weeks = 12, today = new Date()): number | null {
	const cutoff = dayDiff.bind(null, today)
	const recent = samples.filter(s => cutoff(new Date(s.date)) <= weeks * 7)
	if (recent.length < 3) return null

	const weekly = new Map<number, number>()
	for (const s of recent) {
		const w = Math.floor(cutoff(new Date(s.date)) / 7) // 0 = this week
		weekly.set(w, Math.max(weekly.get(w) ?? 0, s.vdot))
	}
	if (weekly.size < 3) return null

	// x in days-ago (negated so time runs forwards), y in VDOT
	const pts = [...weekly].map(([w, v]) => ({ x: -w * 7, y: v }))
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
