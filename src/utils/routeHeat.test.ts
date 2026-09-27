import { describe, expect, it } from 'vitest'
import { buildHeat, levelBreaks } from './routeHeat'

/** A straight east-west line of `n` points starting at (lat, lng). */
const line = (lat: number, lng: number, n = 40, step = 0.0006): [number, number][] =>
	Array.from({ length: n }, (_, i) => [lat, lng + i * step] as [number, number])

const allPaths = (h: ReturnType<typeof buildHeat>) => h.bands.flatMap(b => b.paths)
const totalSegments = (h: ReturnType<typeof buildHeat>) =>
	allPaths(h).reduce((s, p) => s + p.length - 1, 0)

describe('levelBreaks', () => {
	it('spreads bands across the range that is actually present', () => {
		const breaks = levelBreaks([1, 1, 2, 3, 5, 8, 13, 21])
		expect(breaks[0]).toBe(1)
		expect(breaks).toEqual([...breaks].sort((a, b) => a - b))
		expect(new Set(breaks).size).toBe(breaks.length)
	})

	it('collapses to one band when every segment has the same count', () => {
		expect(levelBreaks([4, 4, 4, 4, 4])).toEqual([4])
	})

	it('is empty with nothing to band', () => {
		expect(levelBreaks([])).toEqual([])
	})
})

describe('buildHeat', () => {
	it('gives a single route one cold band', () => {
		const h = buildHeat([line(59.33, 18.07)])
		expect(h.peak).toBe(1)
		expect(h.bands).toHaveLength(1)
		expect(h.bands[0].minCount).toBe(1)
	})

	it('counts a repeated street once per activity, not once per point', () => {
		// The same road five times: the peak is 5 activities, never 5 × points.
		const h = buildHeat(Array.from({ length: 5 }, () => line(59.33, 18.07)))
		expect(h.peak).toBe(5)
	})

	it('does not credit a cell twice when one activity lingers there', () => {
		// Twenty points standing still on one spot, then a normal line away.
		const stall: [number, number][] = [
			...Array.from({ length: 20 }, () => [59.33, 18.07] as [number, number]),
			...line(59.33, 18.07, 10),
		]
		expect(buildHeat([stall]).peak).toBe(1)
	})

	it('separates a repeated loop from a one-off detour', () => {
		const home = line(59.33, 18.07)
		const trip = line(59.40, 18.30)
		const h = buildHeat([home, home, home, home, trip])
		expect(h.bands.length).toBeGreaterThan(1)

		// The one-off is in the coldest band, the repeated road in the hottest.
		const cold = h.bands[0]
		const hot = h.bands[h.bands.length - 1]
		expect(cold.minCount).toBe(1)
		expect(hot.minCount).toBeGreaterThan(1)
		expect(hot.maxCount).toBe(4)
	})

	it('keeps every segment somewhere — nothing is dropped between bands', () => {
		const routes = [line(59.33, 18.07), line(59.33, 18.07), line(59.35, 18.10)]
		const expected = routes.reduce((s, r) => s + r.length - 1, 0)
		expect(totalSegments(buildHeat(routes))).toBe(expected)
	})

	it('stamps the cells between widely spaced points', () => {
		// Two points a kilometre apart: without walking the gap they would land
		// in two cells and the 40 between them would read as never visited.
		const far: [number, number][] = [[59.33, 18.07], [59.33, 18.0876]]
		const a = buildHeat([far, far])
		// Every segment of the doubled line should register two visits.
		expect(a.peak).toBe(2)
	})

	it('treats routes that merely cross as separate, not as a repeat', () => {
		const eastWest = line(59.33, 18.07)
		const northSouth: [number, number][] =
			Array.from({ length: 40 }, (_, i) => [59.32 + i * 0.0006, 18.08])
		const h = buildHeat([eastWest, northSouth])
		// One shared cell at the crossing at most; the map stays cold overall.
		expect(h.peak).toBeLessThanOrEqual(2)
	})

	it('ignores routes too short to draw', () => {
		const h = buildHeat([[[59.33, 18.07]], []])
		expect(h.bands).toEqual([])
		expect(h.peak).toBe(0)
	})

	it('handles nothing at all', () => {
		expect(buildHeat([])).toEqual({ bands: [], peak: 0 })
	})

	it('works near the equator and at high latitude alike', () => {
		for (const lat of [0.5, 59.33, 78.2]) {
			const h = buildHeat([line(lat, 10), line(lat, 10)])
			expect(h.peak).toBe(2)
		}
	})

	it('reports bands in ascending order with no gaps in the count range', () => {
		const routes = [
			...Array.from({ length: 9 }, () => line(59.33, 18.07)),
			...Array.from({ length: 3 }, () => line(59.34, 18.07)),
			line(59.35, 18.07),
		]
		const h = buildHeat(routes)
		for (let i = 1; i < h.bands.length; i++) {
			expect(h.bands[i].minCount).toBeGreaterThan(h.bands[i - 1].minCount)
			expect(h.bands[i - 1].maxCount).toBe(h.bands[i].minCount - 1)
		}
		expect(h.bands[h.bands.length - 1].maxCount).toBe(h.peak)
	})
})
