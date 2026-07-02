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

export function fmtSecs(secs: number): string {
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = Math.round(secs % 60)
	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`
}
