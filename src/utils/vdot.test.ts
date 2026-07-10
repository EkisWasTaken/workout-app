import { describe, it, expect } from 'vitest'
import {
	DISTANCES,
	vdotFromRace,
	raceTimeFromVdot,
	paceTable,
	racePaceSecPerKm,
	equivalentTimes,
	matchZone,
	parsePaceValue,
	parseTime,
	fmtTime,
} from './vdot'

/** The athlete's known benchmark: half marathon in 1:42:00. */
const HALF_1_42 = 1 * 3600 + 42 * 60

const zone = (vdot: number, key: string) => paceTable(vdot).find(z => z.key === key)!

describe('vdotFromRace', () => {
	it('derives VDOT 44.1 from a 1:42 half marathon', () => {
		expect(vdotFromRace(DISTANCES.half, HALF_1_42)).toBeCloseTo(44.1, 1)
	})

	it('matches published anchors: 5k in 20:00 is VDOT ~49.8', () => {
		expect(vdotFromRace(5000, 20 * 60)).toBeCloseTo(49.8, 1)
	})

	it('rejects distances and times outside the model', () => {
		expect(vdotFromRace(300, 60)).toBeNull()   // too short
		expect(vdotFromRace(5000, 30)).toBeNull()  // impossibly fast
		expect(vdotFromRace(5000, 9 * 3600)).toBeNull() // walking
	})
})

describe('raceTimeFromVdot', () => {
	it('round-trips with vdotFromRace', () => {
		const vdot = vdotFromRace(DISTANCES.half, HALF_1_42)!
		const back = raceTimeFromVdot(vdot, DISTANCES.half)
		// within a second over 102 minutes
		expect(Math.abs(back - HALF_1_42)).toBeLessThanOrEqual(1)
	})

	it('is monotonic: a higher VDOT is always faster', () => {
		const a = raceTimeFromVdot(45, 10000)
		const b = raceTimeFromVdot(55, 10000)
		expect(b).toBeLessThan(a)
	})

	it('is monotonic in distance at fixed VDOT', () => {
		const t = equivalentTimes(50)
		expect(t['5k']).toBeLessThan(t['10k'])
		expect(t['10k']).toBeLessThan(t.half)
		expect(t.half).toBeLessThan(t.marathon)
	})
})

describe('paceTable', () => {
	/**
	 * Daniels' published per-km paces at VDOT 44, the external check on the
	 * whole model. Each zone's fast end should land on the book value ±3 s.
	 * (E is a range in the book; its endpoints anchor both ends of our band.)
	 */
	const DANIELS_VDOT_44 = {
		easyFast: 5 * 60 + 35,
		easySlow: 6 * 60 + 14,
		marathon: 4 * 60 + 58,
		threshold: 4 * 60 + 41,
		interval: 4 * 60 + 19,
		rep: 4 * 60 + 0,
	}
	const near = (actual: number, expected: number, tol = 3) =>
		expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol)

	it('reproduces Daniels\' easy range at VDOT 44', () => {
		const e = zone(44, 'easy')
		near(e.fastSecPerKm, DANIELS_VDOT_44.easyFast)
		near(e.slowSecPerKm, DANIELS_VDOT_44.easySlow)
	})

	it('reproduces Daniels\' M, T, I and R paces at VDOT 44', () => {
		near(zone(44, 'marathon').fastSecPerKm, DANIELS_VDOT_44.marathon)
		near(zone(44, 'threshold').fastSecPerKm, DANIELS_VDOT_44.threshold)
		near(zone(44, 'interval').fastSecPerKm, DANIELS_VDOT_44.interval)
		near(zone(44, 'rep').fastSecPerKm, DANIELS_VDOT_44.rep)
	})

	it('overlaps the paces the athlete already trains at (1:42 half)', () => {
		// VDOT 44.1 derived from his half. These are the bands he trains at
		// today; the derived band should overlap each, not necessarily contain it.
		const overlaps = (key: string, fast: number, slow: number) => {
			const z = zone(44.1, key)
			expect(z.fastSecPerKm).toBeLessThanOrEqual(slow)
			expect(z.slowSecPerKm).toBeGreaterThanOrEqual(fast)
		}
		overlaps('easy', 5 * 60 + 45, 6 * 60 + 15)
		overlaps('threshold', 4 * 60 + 45, 4 * 60 + 55)
		overlaps('interval', 4 * 60 + 20, 4 * 60 + 30)
	})

	it('orders zones from slowest to fastest', () => {
		const t = paceTable(50)
		const fast = t.map(z => z.fastSecPerKm)
		// recovery is slowest, repetition fastest
		expect(fast[0]).toBeGreaterThan(fast[fast.length - 1])
		for (let i = 1; i < fast.length; i++) expect(fast[i]).toBeLessThan(fast[i - 1])
	})

	it('keeps the fast end of every range faster than the slow end', () => {
		for (const z of paceTable(44.1)) expect(z.fastSecPerKm).toBeLessThan(z.slowSecPerKm)
	})
})

describe('racePaceSecPerKm', () => {
	it('gives a 30k race pace near 5:00–5:10/km at VDOT 44.1', () => {
		const p = racePaceSecPerKm(44.1, 30000)
		expect(p).toBeGreaterThan(4 * 60 + 55)
		expect(p).toBeLessThan(5 * 60 + 15)
	})

	it('is slower over longer distances', () => {
		expect(racePaceSecPerKm(50, 42195)).toBeGreaterThan(racePaceSecPerKm(50, 5000))
	})
})

describe('matchZone', () => {
	it.each([
		['Easy', 'easy'],
		['Recovery', 'recovery'],
		['Threshold 4:45–4:55/km', 'threshold'],
		['Tempo', 'threshold'],
		['VO2 intervals', 'interval'],
		['VO₂ max', 'interval'],
		['30k race pace', 'marathon'],
		['Strides', 'rep'],
	])('maps %s to %s', (label, expected) => {
		expect(matchZone(label)).toBe(expected)
	})

	it('returns null for labels with no zone', () => {
		expect(matchZone('Push day')).toBeNull()
		expect(matchZone('')).toBeNull()
	})
})

describe('parsePaceValue', () => {
	it('reads a single pace', () => {
		expect(parsePaceValue('4:50')).toBe(290)
	})

	it('reads a range as its midpoint, en-dash or hyphen', () => {
		expect(parsePaceValue('4:45–4:55')).toBe(290)
		expect(parsePaceValue('4:45-4:55')).toBe(290)
		expect(parsePaceValue(' 5:45 – 6:15 ')).toBe(360)
	})

	it('rejects junk and out-of-range values', () => {
		expect(parsePaceValue('')).toBeNull()
		expect(parsePaceValue('fast')).toBeNull()
		expect(parsePaceValue('4:5')).toBeNull()
		expect(parsePaceValue('0:00')).toBeNull()
		expect(parsePaceValue('4:45–4:55–5:05')).toBeNull()
	})
})

describe('parseTime / fmtTime', () => {
	it('parses h:mm:ss, mm:ss, and bare minutes', () => {
		expect(parseTime('1:42:00')).toBe(6120)
		expect(parseTime('44:30')).toBe(2670)
		expect(parseTime('44')).toBe(2640)
	})

	it('rejects junk', () => {
		expect(parseTime('')).toBeNull()
		expect(parseTime('abc')).toBeNull()
		expect(parseTime('0:00')).toBeNull()
		expect(parseTime('-5:00')).toBeNull()
	})

	it('round-trips through fmtTime', () => {
		expect(fmtTime(parseTime('1:42:00')!)).toBe('1:42:00')
		expect(fmtTime(parseTime('44:30')!)).toBe('44:30')
	})
})
