import type { ActivityStreams } from '@/types'

/**
 * Heart-rate analytics shared by the overview and workout detail pages.
 * When an activity has raw HR streams (file imports), time-in-zone and
 * Relative Effort are computed sample-by-sample — the same way Strava's
 * premium analysis works. Activities with only an average HR fall back
 * to a whole-activity approximation.
 */

export const PULSE_ZONES = [
	{ name: 'Z1 Easy',      min: 0,    max: 0.60, color: '#56d364' },
	{ name: 'Z2 Aerobic',   min: 0.60, max: 0.70, color: '#4f8cff' },
	{ name: 'Z3 Tempo',     min: 0.70, max: 0.80, color: '#f0b429' },
	{ name: 'Z4 Threshold', min: 0.80, max: 0.90, color: '#fb8c00' },
	{ name: 'Z5 VO₂max',   min: 0.90, max: 1.01, color: '#e53935' },
]

export interface HRSettings { maxHR: number; restHR: number }

/** Max HR: profile override if set, else highest ever observed. Rest HR from profile. */
export function getHRSettings(activities: any[]): HRSettings {
	const override = parseInt(localStorage.getItem('maxHR') || '0', 10)
	const observed = Math.max(0, ...activities.map((a: any) => a.max_heartrate || 0))
	return {
		maxHR: override > 100 ? override : observed,
		restHR: parseInt(localStorage.getItem('restingHR') || '60', 10),
	}
}

/** Karvonen zone bounds in absolute bpm. */
export function zoneAbsBpm(z: typeof PULSE_ZONES[number], maxHR: number, restHR: number) {
	const hrr = maxHR - restHR
	return { lo: restHR + hrr * z.min, hi: restHR + hrr * z.max }
}

const hrReserveFrac = (hr: number, maxHR: number, restHR: number) =>
	Math.max(0, Math.min(1, (hr - restHR) / Math.max(1, maxHR - restHR)))

/**
 * Seconds spent in each zone. Uses the HR stream when available,
 * otherwise attributes all moving time to the zone of the average HR.
 */
export function timeInZones(activity: any, maxHR: number, restHR: number): number[] | null {
	const zones = new Array(PULSE_ZONES.length).fill(0)
	const streams: ActivityStreams | undefined = activity.streams

	if (streams?.heartrate && streams.time?.length > 1) {
		const { time, heartrate } = streams
		for (let i = 1; i < time.length; i++) {
			const hr = heartrate[i]
			if (hr === null || hr === undefined) continue
			const dt = time[i] - time[i - 1]
			if (dt <= 0 || dt > 60) continue
			const frac = hrReserveFrac(hr, maxHR, restHR)
			const zi = PULSE_ZONES.findIndex(z => frac >= z.min && frac < z.max)
			if (zi >= 0) zones[zi] += dt
		}
		return zones.some(v => v > 0) ? zones : null
	}

	if (activity.average_heartrate && activity.moving_time) {
		const frac = hrReserveFrac(activity.average_heartrate, maxHR, restHR)
		const zi = PULSE_ZONES.findIndex(z => frac >= z.min && frac < z.max)
		if (zi >= 0) zones[zi] = activity.moving_time
		return zones
	}
	return null
}

/**
 * Relative Effort — Banister TRIMP. Stream-based when possible so hard
 * intervals count more than the same time at the session's average HR.
 */
export function relativeEffort(activity: any, maxHR: number, restHR: number): number | null {
	const streams: ActivityStreams | undefined = activity.streams
	const trimp = (minutes: number, hr: number) => {
		const r = hrReserveFrac(hr, maxHR, restHR)
		return minutes * r * 0.64 * Math.exp(1.92 * r)
	}

	if (streams?.heartrate && streams.time?.length > 1) {
		let sum = 0
		const { time, heartrate } = streams
		for (let i = 1; i < time.length; i++) {
			const hr = heartrate[i]
			if (hr === null || hr === undefined) continue
			const dt = time[i] - time[i - 1]
			if (dt <= 0 || dt > 60) continue
			sum += trimp(dt / 60, hr)
		}
		return sum > 0 ? Math.round(sum) : null
	}

	if (activity.average_heartrate && activity.moving_time) {
		return Math.round(trimp(activity.moving_time / 60, activity.average_heartrate))
	}
	return null
}

export interface FitnessPoint {
	date: string      // yyyy-MM-dd
	fitness: number   // CTL — 42-day exponentially weighted load
	fatigue: number   // ATL — 7-day exponentially weighted load
	form: number      // TSB — fitness minus fatigue
}

/**
 * Fitness & Freshness (CTL/ATL/TSB, the model behind Strava's premium
 * chart). `efforts` maps yyyy-MM-dd to total Relative Effort that day.
 */
export function fitnessSeries(efforts: Record<string, number>, days: number): FitnessPoint[] {
	const dates = Object.keys(efforts).sort()
	if (!dates.length) return []

	const today = new Date()
	const start = new Date(dates[0])
	const out: FitnessPoint[] = []
	let ctl = 0, atl = 0
	const cutoff = new Date(today)
	cutoff.setDate(cutoff.getDate() - days)

	for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
		const key = d.toISOString().slice(0, 10)
		const load = efforts[key] || 0
		ctl += (load - ctl) / 42
		atl += (load - atl) / 7
		if (d >= cutoff) {
			out.push({
				date: key,
				fitness: Math.round(ctl * 10) / 10,
				fatigue: Math.round(atl * 10) / 10,
				form: Math.round((ctl - atl) * 10) / 10,
			})
		}
	}
	return out
}

// ─── Grade Adjusted Pace ──────────────────────────────────────────────────────

/**
 * Minetti et al. energy cost of running at gradient i (J/kg/m), relative to
 * flat ground. The model behind Strava's GAP.
 */
function minettiFactor(i: number): number {
	const g = Math.max(-0.30, Math.min(0.30, i))
	const cost = 155.4 * g ** 5 - 30.4 * g ** 4 - 43.3 * g ** 3 + 46.3 * g ** 2 + 19.5 * g + 3.6
	return Math.max(0.5, cost / 3.6)
}

export interface GapResult {
	speed: number          // overall grade-adjusted speed, m/s
	perKm: (number | null)[] // grade-adjusted speed per km split, m/s
}

/**
 * Grade Adjusted Pace from the altitude + distance streams: each moving
 * sample's speed is scaled by the Minetti cost of its smoothed gradient.
 * Returns null when there is no altitude data or too little variation to
 * matter (flat route ⇒ GAP would equal pace anyway).
 */
export function gradeAdjustedPace(activity: any): GapResult | null {
	const s: ActivityStreams | undefined = activity.streams
	if (!s?.altitude || !s.distance || !s.time || s.time.length < 10) return null

	const n = s.time.length
	// Smooth altitude with a ±2-sample window to tame barometric noise
	const alt: (number | null)[] = s.altitude.map((_, i) => {
		let sum = 0, cnt = 0
		for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
			const a = s.altitude![j]
			if (a !== null && a !== undefined) { sum += a; cnt++ }
		}
		return cnt ? sum / cnt : null
	})

	let adjDist = 0, movTime = 0
	const kmAdj: number[] = [], kmTime: number[] = []
	for (let i = 1; i < n; i++) {
		const dt = s.time[i] - s.time[i - 1]
		const d0 = s.distance[i - 1], d1 = s.distance[i]
		if (dt <= 0 || dt > 60 || d0 === null || d1 === null || d0 === undefined || d1 === undefined) continue
		const dd = d1 - d0
		if (dd < 0.5) continue // paused
		const a0 = alt[i - 1], a1 = alt[i]
		const grade = a0 !== null && a1 !== null && dd > 1 ? (a1 - a0) / dd : 0
		const adj = dd * minettiFactor(grade)
		adjDist += adj
		movTime += dt
		const km = Math.min(Math.floor(d1 / 1000), 199)
		kmAdj[km] = (kmAdj[km] || 0) + adj
		kmTime[km] = (kmTime[km] || 0) + dt
	}
	if (movTime < 60 || adjDist <= 0) return null

	const splits = activity.splits_metric?.length || 0
	const perKm: (number | null)[] = []
	for (let k = 0; k < splits; k++) {
		perKm.push(kmTime[k] > 30 ? kmAdj[k] / kmTime[k] : null)
	}
	return { speed: adjDist / movTime, perKm }
}

// ─── VO₂ max estimate (per activity) ─────────────────────────────────────────

/**
 * Device-free VO₂ max estimate for one run: ACSM oxygen cost at the
 * grade-adjusted speed, scaled up by the %VO₂max implied by %HRmax
 * (Swain et al. 1994) — the same approach as the Home trend chart, but
 * per-activity and terrain-corrected.
 */
export function estimateVO2max(activity: any, maxHR: number): number | null {
	if (!maxHR || maxHR < 140) return null
	if (!activity.average_heartrate || !activity.moving_time || activity.moving_time < 600) return null
	const speed = gradeAdjustedPace(activity)?.speed ?? activity.average_speed
	if (!speed || speed < 1.4) return null

	const vo2AtEffort = 3.5 + speed * 60 * 0.2
	const vo2Frac = 1.537 * (activity.average_heartrate / maxHR) - 0.537
	if (vo2Frac < 0.25) return null // too easy to extrapolate from
	const val = Math.round((vo2AtEffort / vo2Frac) * 10) / 10
	return val >= 22 && val <= 82 ? val : null
}

// ─── Estimated cycling power ──────────────────────────────────────────────────

/**
 * Average estimated power for a ride, watts — Strava-style physics model:
 * rolling resistance + air drag + gravity, from the speed/altitude streams.
 * Downhill/coasting samples clamp to zero (you can't push negative watts).
 */
export function estimateBikePower(activity: any, riderKg: number): number | null {
	const s: ActivityStreams | undefined = activity.streams
	if (!s?.velocity || !s.time || s.time.length < 10 || !riderKg) return null

	const mass = riderKg + 9        // rider + road bike
	const g = 9.81, rho = 1.226
	const crr = 0.005, cda = 0.32   // road tyres, hoods position
	const n = s.time.length

	let joules = 0, movTime = 0
	for (let i = 1; i < n; i++) {
		const dt = s.time[i] - s.time[i - 1]
		const v = s.velocity[i]
		if (dt <= 0 || dt > 60 || v === null || v === undefined || v < 1) continue
		let grade = 0
		const a0 = s.altitude?.[i - 1], a1 = s.altitude?.[i]
		const d0 = s.distance?.[i - 1], d1 = s.distance?.[i]
		if (a0 != null && a1 != null && d0 != null && d1 != null && d1 - d0 > 1) {
			grade = Math.max(-0.25, Math.min(0.25, (a1 - a0) / (d1 - d0)))
		}
		const p = crr * mass * g * v + 0.5 * rho * cda * v ** 3 + mass * g * grade * v
		joules += Math.max(0, p) * dt
		movTime += dt
	}
	if (movTime < 120) return null
	return Math.round(joules / movTime)
}

export function fmtSecs(secs: number): string {
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = Math.round(secs % 60)
	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`
}
