import { describe, expect, it } from 'vitest'
import { cleanHeartrate, summariseHeartrate, HR_MAX } from './hrStream'

/** One sample per second, 0..n-1. */
const secs = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('cleanHeartrate', () => {
	it('bridges the gaps a sparsely-sampling watch leaves', () => {
		// HR every 5 s, GPS every second — the Apple Watch / HealthFit shape.
		const time = secs(21)
		const hr = time.map(t => (t % 5 === 0 ? 140 + t : null))
		const out = cleanHeartrate(time, hr)
		expect(out.filter(v => v === null)).toHaveLength(0)
		// Linear between the known ends of each gap
		expect(out[0]).toBe(140)
		expect(out[5]).toBe(145)
		expect(out[3]).toBeCloseTo(143, 5)
	})

	it('leaves a real dropout as a gap instead of inventing effort across it', () => {
		const time = secs(200)
		const hr = time.map(t => (t < 20 || t > 150 ? 150 : null))
		const out = cleanHeartrate(time, hr)
		expect(out[60]).toBeNull()
		expect(out[19]).toBe(150)
		expect(out[151]).toBe(150)
	})

	it('drops zeros and other lost-contact readings', () => {
		const time = secs(6)
		const out = cleanHeartrate(time, [150, 0, 0, 0, 0, 152])
		// Bridged from the plausible ends, not left at zero
		expect(out[1]).toBeGreaterThan(149)
		expect(out[4]).toBeLessThan(153)
	})

	it('rejects a lone spike but keeps a genuine surge', () => {
		const time = secs(7)
		const spike = cleanHeartrate(time, [140, 141, 142, 210, 143, 144, 145])
		expect(spike[3]).toBeLessThan(150)

		const surge = cleanHeartrate(time, [140, 141, 142, 185, 186, 187, 188])
		expect(surge[3]).toBe(185)
	})

	it('discards readings above a plausible human maximum', () => {
		const time = secs(4)
		const out = cleanHeartrate(time, [HR_MAX + 40, 150, 151, 152])
		expect(out[0]).toBeNull()
	})

	it('returns an array matching the input length', () => {
		expect(cleanHeartrate(secs(10), new Array(10).fill(null))).toHaveLength(10)
	})

	it('optionally smooths without introducing nulls', () => {
		const time = secs(30)
		const hr = time.map(t => 150 + (t % 2 ? 8 : -8))
		const out = cleanHeartrate(time, hr, { smoothSecs: 10 })
		// The ±8 jitter is gone; the level is not.
		expect(out[20]).toBeGreaterThan(146)
		expect(out[20]).toBeLessThan(154)
		expect(Math.abs((out[20] as number) - (out[21] as number))).toBeLessThan(4)
	})
})

describe('summariseHeartrate', () => {
	it('weights each sample by the time it covers', () => {
		// Two 1-second samples at 120, then a 50-second stretch at 170: a plain
		// mean over samples says ~150, but the session was mostly at 170.
		const time = [0, 1, 2, 52]
		const hr = [120, 120, 120, 170]
		const s = summariseHeartrate(time, hr)!
		expect(s.avg).toBeGreaterThan(160)
		expect(s.min).toBe(120)
		expect(s.max).toBe(170)
	})

	it('reports the share of the session that has a beat', () => {
		const time = secs(101)
		const hr = time.map(t => (t < 50 ? 150 : null))
		const s = summariseHeartrate(time, hr)!
		expect(s.coverage).toBeGreaterThan(0.45)
		expect(s.coverage).toBeLessThan(0.55)
	})

	it('is null when nothing was recorded', () => {
		expect(summariseHeartrate(secs(10), new Array(10).fill(null))).toBeNull()
	})
})
