import { describe, it, expect, beforeEach } from 'vitest'
import {
	PULSE_ZONES,
	getHRSettings,
	zoneAbsBpm,
	timeInZones,
	relativeEffort,
	fitnessSeries,
	gradeAdjustedPace,
	estimateVO2max,
	estimateBikePower,
	fmtSecs,
} from './analysis'

// Node has no localStorage; the analysis code reads profile overrides from it.
const store = new Map<string, string>()
;(globalThis as any).localStorage = {
	getItem: (k: string) => store.get(k) ?? null,
	setItem: (k: string, v: string) => store.set(k, v),
	removeItem: (k: string) => store.delete(k),
}

beforeEach(() => store.clear())

const MAX_HR = 200
const REST_HR = 60 // HR reserve = 140

/** Constant-HR run: `secs` seconds of 1 Hz samples at heart rate `hr`. */
function constantHrStreams(secs: number, hr: number) {
	const time = Array.from({ length: secs + 1 }, (_, i) => i)
	return { time, heartrate: time.map(() => hr) }
}

describe('getHRSettings', () => {
	it('uses profile override when set', () => {
		store.set('maxHR', '195')
		store.set('restingHR', '52')
		const s = getHRSettings([{ max_heartrate: 188 }])
		expect(s).toEqual({ maxHR: 195, restHR: 52 })
	})

	it('falls back to highest observed max HR and default rest HR', () => {
		const s = getHRSettings([{ max_heartrate: 172 }, { max_heartrate: 191 }, {}])
		expect(s).toEqual({ maxHR: 191, restHR: 60 })
	})
})

describe('zoneAbsBpm', () => {
	it('converts Karvonen fractions to absolute bpm', () => {
		const z2 = PULSE_ZONES[1] // 60–70% of HR reserve
		const { lo, hi } = zoneAbsBpm(z2, MAX_HR, REST_HR)
		expect(lo).toBeCloseTo(60 + 140 * 0.6) // 144
		expect(hi).toBeCloseTo(60 + 140 * 0.7) // 158
	})
})

describe('timeInZones', () => {
	it('attributes stream time to the right zone', () => {
		// HR 150 → reserve frac (150-60)/140 ≈ 0.643 → Z2
		const activity = { streams: constantHrStreams(600, 150) }
		const zones = timeInZones(activity, MAX_HR, REST_HR)!
		expect(zones[1]).toBe(600)
		expect(zones[0] + zones[2] + zones[3] + zones[4]).toBe(0)
	})

	it('ignores recording gaps longer than 60 s', () => {
		const s = constantHrStreams(100, 150)
		s.time = s.time.map(t => (t > 50 ? t + 3600 : t)) // 1 h pause mid-run
		const zones = timeInZones({ streams: s }, MAX_HR, REST_HR)!
		expect(zones[1]).toBe(99) // the paused sample is dropped
	})

	it('falls back to average HR over moving time', () => {
		const activity = { average_heartrate: 185, moving_time: 1800 } // frac ≈ 0.89 → Z4
		const zones = timeInZones(activity, MAX_HR, REST_HR)!
		expect(zones[3]).toBe(1800)
	})

	it('returns null without any HR data', () => {
		expect(timeInZones({ moving_time: 1800 }, MAX_HR, REST_HR)).toBeNull()
	})
})

describe('relativeEffort', () => {
	it('matches the closed-form TRIMP for a constant-HR run', () => {
		// 30 min at HR 150: r = 0.643, TRIMP = 30 * r * 0.64 * e^(1.92 r)
		const r = (150 - REST_HR) / (MAX_HR - REST_HR)
		const expected = Math.round(30 * r * 0.64 * Math.exp(1.92 * r))
		const fromStreams = relativeEffort({ streams: constantHrStreams(1800, 150) }, MAX_HR, REST_HR)
		const fromAverage = relativeEffort({ average_heartrate: 150, moving_time: 1800 }, MAX_HR, REST_HR)
		expect(fromStreams).toBe(expected)
		expect(fromAverage).toBe(expected)
	})

	it('weights hard intervals more than the same average HR', () => {
		// Half at 120, half at 180 (avg 150) must beat steady 150 — TRIMP is convex in HR.
		const secs = 1800
		const time = Array.from({ length: secs + 1 }, (_, i) => i)
		const heartrate = time.map(i => (i < secs / 2 ? 120 : 180))
		const intervals = relativeEffort({ streams: { time, heartrate } }, MAX_HR, REST_HR)!
		const steady = relativeEffort({ streams: constantHrStreams(secs, 150) }, MAX_HR, REST_HR)!
		expect(intervals).toBeGreaterThan(steady)
	})
})

describe('fitnessSeries', () => {
	it('models fatigue responding faster than fitness under constant load', () => {
		const efforts: Record<string, number> = {}
		for (let back = 30; back >= 1; back--) {
			const d = new Date()
			d.setDate(d.getDate() - back)
			efforts[d.toISOString().slice(0, 10)] = 100
		}
		const series = fitnessSeries(efforts, 60)
		expect(series.length).toBeGreaterThan(25)
		const last = series[series.length - 1]
		expect(last.fitness).toBeGreaterThan(0)
		// ATL (7-day) converges to the 100/day load much faster than CTL (42-day)
		expect(last.fatigue).toBeGreaterThan(last.fitness)
		// form is rounded from the unrounded CTL/ATL, so allow one rounding step
		expect(Math.abs(last.form - (last.fitness - last.fatigue))).toBeLessThanOrEqual(0.11)
		// Fitness must rise monotonically while the constant load lasts
		// (efforts end yesterday, so skip the trailing zero-load days)
		for (let i = 1; i < series.length - 2; i++) {
			expect(series[i].fitness).toBeGreaterThanOrEqual(series[i - 1].fitness)
		}
	})

	it('returns empty series for no efforts', () => {
		expect(fitnessSeries({}, 60)).toEqual([])
	})
})

describe('gradeAdjustedPace', () => {
	/** Steady run at `speed` m/s for `secs` seconds climbing `grade` the whole way. */
	function steadyRun(secs: number, speed: number, grade: number) {
		const time = Array.from({ length: secs + 1 }, (_, i) => i)
		return {
			streams: {
				time,
				distance: time.map(t => t * speed),
				altitude: time.map(t => t * speed * grade),
			},
		}
	}

	it('equals raw speed on flat ground', () => {
		const gap = gradeAdjustedPace(steadyRun(1200, 3.0, 0))!
		expect(gap.speed).toBeCloseTo(3.0, 2)
	})

	it('is faster than raw speed uphill and slower downhill', () => {
		const up = gradeAdjustedPace(steadyRun(1200, 2.5, 0.05))!
		const down = gradeAdjustedPace(steadyRun(1200, 3.5, -0.05))!
		expect(up.speed).toBeGreaterThan(2.5)
		expect(down.speed).toBeLessThan(3.5)
	})

	it('returns null without altitude data', () => {
		const run = steadyRun(1200, 3.0, 0) as any
		delete run.streams.altitude
		expect(gradeAdjustedPace(run)).toBeNull()
	})
})

describe('estimateVO2max', () => {
	it('matches ACSM + Swain closed form for a steady flat run', () => {
		// 5:00/km (3.333 m/s) at 90% HRmax for 40 min
		const activity = { average_speed: 10 / 3, average_heartrate: 180, moving_time: 2400 }
		const vo2AtEffort = 3.5 + (10 / 3) * 60 * 0.2
		const vo2Frac = 1.537 * 0.9 - 0.537
		const expected = Math.round((vo2AtEffort / vo2Frac) * 10) / 10
		expect(estimateVO2max(activity, MAX_HR)).toBe(expected)
		expect(expected).toBeGreaterThan(40) // sanity: this is a plausible VO₂max
	})

	it('rejects walks, short efforts and missing HR', () => {
		expect(estimateVO2max({ average_speed: 1.0, average_heartrate: 180, moving_time: 2400 }, MAX_HR)).toBeNull()
		expect(estimateVO2max({ average_speed: 3.0, average_heartrate: 180, moving_time: 300 }, MAX_HR)).toBeNull()
		expect(estimateVO2max({ average_speed: 3.0, moving_time: 2400 }, MAX_HR)).toBeNull()
	})
})

describe('estimateBikePower', () => {
	it('matches the physics closed form on a flat steady ride', () => {
		const v = 8 // m/s ≈ 28.8 km/h
		const secs = 1200
		const time = Array.from({ length: secs + 1 }, (_, i) => i)
		const activity = { streams: { time, velocity: time.map(() => v) } }
		const riderKg = 75
		const mass = riderKg + 9
		const expected = Math.round(0.005 * mass * 9.81 * v + 0.5 * 1.226 * 0.32 * v ** 3)
		expect(estimateBikePower(activity, riderKg)).toBe(expected)
	})

	it('returns null for too-short rides', () => {
		const time = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
		const activity = { streams: { time, velocity: time.map(() => 8) } }
		expect(estimateBikePower(activity, 75)).toBeNull()
	})
})

describe('fmtSecs', () => {
	it('formats minutes and hours with zero padding', () => {
		expect(fmtSecs(65)).toBe('1:05')
		expect(fmtSecs(3600)).toBe('1:00:00')
		expect(fmtSecs(3725)).toBe('1:02:05')
	})
})
