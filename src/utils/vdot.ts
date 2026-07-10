/**
 * Daniels & Gilbert VDOT model.
 *
 * A race result implies an effective VO₂max ("VDOT"); that single number then
 * yields both the training paces you should run and your equivalent times at
 * other distances. Two published equations do the work:
 *
 *   VO₂ cost of running at velocity v (m/min)   — Daniels & Gilbert
 *   %VO₂max sustainable for a duration t (min)  — Daniels & Gilbert
 *
 * VDOT = VO₂(v) / %VO₂max(t).
 */

/** Canonical race distances, metres. */
export const DISTANCES = {
	'5k': 5000,
	'10k': 10000,
	half: 21097,
	marathon: 42195,
} as const

export type DistanceKey = keyof typeof DISTANCES

export const DISTANCE_LABELS: Record<DistanceKey, string> = {
	'5k': '5 km',
	'10k': '10 km',
	half: 'Half marathon',
	marathon: 'Marathon',
}

/** Oxygen cost, ml/kg/min, of running at v metres per minute. */
const vo2Cost = (v: number) => -4.60 + 0.182258 * v + 0.000104 * v * v

/** Fraction of VO₂max sustainable for t minutes. */
const pctMax = (t: number) =>
	0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t)

/** Invert vo2Cost: the velocity (m/min) whose oxygen cost is `vo2`. */
function velocityForVo2(vo2: number): number {
	// 0.000104v² + 0.182258v − (4.60 + vo2) = 0 — positive root only.
	const a = 0.000104, b = 0.182258, c = -(4.60 + vo2)
	return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)
}

/**
 * VDOT implied by covering `distanceM` metres in `timeSecs` seconds.
 * Returns null for inputs too short or slow to model meaningfully.
 */
export function vdotFromRace(distanceM: number, timeSecs: number): number | null {
	if (!(distanceM > 400) || !(timeSecs > 60)) return null
	const minutes = timeSecs / 60
	const v = distanceM / minutes
	if (v < 100 || v > 500) return null // outside the model's useful range
	const vdot = vo2Cost(v) / pctMax(minutes)
	return vdot > 20 && vdot < 90 ? Math.round(vdot * 10) / 10 : null
}

/**
 * Time (seconds) to cover `distanceM` at the given VDOT — the inverse of
 * vdotFromRace. %VO₂max depends on duration, which depends on the time we're
 * solving for, so iterate to a fixed point (converges in a handful of passes).
 */
export function raceTimeFromVdot(vdot: number, distanceM: number): number {
	let minutes = distanceM / velocityForVo2(vdot * 0.85) // seed
	for (let i = 0; i < 30; i++) {
		const v = velocityForVo2(vdot * pctMax(minutes))
		const next = distanceM / v
		if (Math.abs(next - minutes) < 1e-6) break
		minutes = next
	}
	return Math.round(minutes * 60)
}

/**
 * Training intensities as a fraction of VDOT, after Daniels' tables.
 * `zone` keys match the labels used in workout targetPace strings.
 */
// Fractions are tuned so the derived table reproduces Daniels' published
// per-km paces at VDOT 44 (E 5:35–6:14, M 4:58, T 4:41, I 4:19, R 4:00).
export const PACE_ZONES = [
	{ key: 'recovery',  label: 'Recovery',  lo: 0.55, hi: 0.62 },
	{ key: 'easy',      label: 'Easy',      lo: 0.62, hi: 0.715 },
	{ key: 'marathon',  label: 'Marathon',  lo: 0.78, hi: 0.825 },
	{ key: 'threshold', label: 'Threshold', lo: 0.83, hi: 0.88 },
	{ key: 'interval',  label: 'VO₂ max',   lo: 0.95, hi: 0.982 },
	{ key: 'rep',       label: 'Repetition', lo: 1.05, hi: 1.078 },
] as const

export type ZoneKey = typeof PACE_ZONES[number]['key']

export interface PaceRange {
	key: ZoneKey
	label: string
	fastSecPerKm: number  // the hi-intensity end — a smaller number
	slowSecPerKm: number
}

/** Seconds per km at a given fraction of VDOT. */
function paceAt(vdot: number, frac: number): number {
	const v = velocityForVo2(vdot * frac) // m/min
	return (1000 / v) * 60
}

/** Full training-pace table for a VDOT, in seconds per km. */
export function paceTable(vdot: number): PaceRange[] {
	return PACE_ZONES.map(z => ({
		key: z.key,
		label: z.label,
		fastSecPerKm: Math.round(paceAt(vdot, z.hi)),
		slowSecPerKm: Math.round(paceAt(vdot, z.lo)),
	}))
}

/** Goal race pace: the average pace implied by holding VDOT over `distanceM`. */
export function racePaceSecPerKm(vdot: number, distanceM: number): number {
	return Math.round((raceTimeFromVdot(vdot, distanceM) / distanceM) * 1000)
}

/** Equivalent times at every canonical distance for a given VDOT. */
export function equivalentTimes(vdot: number): Record<DistanceKey, number> {
	return Object.fromEntries(
		(Object.keys(DISTANCES) as DistanceKey[]).map(k => [k, raceTimeFromVdot(vdot, DISTANCES[k])]),
	) as Record<DistanceKey, number>
}

// ─── targetPace string matching ───────────────────────────────────────────────

/**
 * Map the free-text zone label on a workout ("Threshold", "VO2 intervals",
 * "30k race pace") onto a pace zone. Returns null when nothing matches, which
 * is the common case for gym sessions and unlabelled runs.
 */
export function matchZone(zoneLabel: string): ZoneKey | null {
	const n = zoneLabel.toLowerCase()
	if (/recovery|shakeout/.test(n)) return 'recovery'
	if (/easy|aerobic|base/.test(n)) return 'easy'
	if (/threshold|tempo|lt/.test(n)) return 'threshold'
	if (/vo2|vo₂|interval/.test(n)) return 'interval'
	if (/rep|stride|sprint/.test(n)) return 'rep'
	// "Goal 4:00–4:20/km" is how the plan labels a race-pace rehearsal.
	if (/marathon|race pace|goal|\d+\s*k\s*pace/.test(n)) return 'marathon'
	return null
}

/** "4:48" from 288 seconds. */
export function fmtPace(secPerKm: number): string {
	const m = Math.floor(secPerKm / 60)
	const s = Math.round(secPerKm % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}

/** "4:45–4:55" from a range. */
export function fmtPaceRange(r: PaceRange): string {
	return `${fmtPace(r.fastSecPerKm)}–${fmtPace(r.slowSecPerKm)}`
}

/**
 * Midpoint of a written pace value, in seconds per km. Accepts a single pace
 * ("4:50") or a range with an en-dash or hyphen ("4:45–4:55"). Null if neither.
 */
export function parsePaceValue(value: string): number | null {
	const parts = value.trim().split(/[–—-]/).map(p => p.trim()).filter(Boolean)
	if (!parts.length || parts.length > 2) return null

	const secs = parts.map(p => {
		const m = p.match(/^(\d{1,2}):(\d{2})$/)
		if (!m) return null
		const s = Number(m[1]) * 60 + Number(m[2])
		return s > 0 && s < 20 * 60 ? s : null
	})
	if (secs.some(s => s === null)) return null

	const nums = secs as number[]
	return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

/** Midpoint of a derived range, for comparison against a written pace. */
export const paceMid = (r: PaceRange) => Math.round((r.fastSecPerKm + r.slowSecPerKm) / 2)

/** Parse "1:42:00", "44:30", or "44" (bare = minutes) into seconds. */
export function parseTime(str: string): number | null {
	const parts = str.trim().split(':').map(s => Number(s))
	if (!parts.length || parts.some(n => !Number.isFinite(n) || n < 0)) return null
	let secs = 0
	if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
	else if (parts.length === 2) secs = parts[0] * 60 + parts[1]
	else if (parts.length === 1) secs = parts[0] * 60
	else return null
	return secs > 0 ? secs : null
}

/** Seconds to "1:42:00" / "44:30". */
export function fmtTime(secs: number): string {
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = Math.round(secs % 60)
	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`
}
