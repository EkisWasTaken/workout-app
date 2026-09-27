import { describe, expect, it } from 'vitest'
import {
	byCountry, clusterStartPoints, coordLabel, haversineKm, labelFromAddress, placeKey,
	type RunPlace, type StartPoint,
} from './runPlaces'

const STOCKHOLM: [number, number] = [59.3293, 18.0686]
const GOTHENBURG: [number, number] = [57.7089, 11.9746]
const BERLIN: [number, number] = [52.52, 13.405]

let n = 0
const at = ([lat, lng]: [number, number], jitterKm = 0, distance = 10000): StartPoint => {
	// ~0.009° of latitude is a kilometre.
	const off = jitterKm * 0.009
	n++
	return {
		activity: { id: n, distance, start_date_local: `2026-01-${String((n % 28) + 1).padStart(2, '0')}T07:00:00` },
		lat: lat + off,
		lng: lng,
	}
}

describe('haversineKm', () => {
	it('measures a known city pair', () => {
		// Stockholm to Gothenburg is about 400 km as the crow flies.
		const d = haversineKm(...STOCKHOLM, ...GOTHENBURG)
		expect(d).toBeGreaterThan(370)
		expect(d).toBeLessThan(420)
	})

	it('is zero for a point against itself', () => {
		expect(haversineKm(...STOCKHOLM, ...STOCKHOLM)).toBeCloseTo(0, 6)
	})
})

describe('clusterStartPoints', () => {
	it('keeps runs from one home base together', () => {
		const places = clusterStartPoints([at(STOCKHOLM), at(STOCKHOLM, 1), at(STOCKHOLM, 2.5)])
		expect(places).toHaveLength(1)
		expect(places[0].activities).toHaveLength(3)
	})

	it('separates cities hundreds of kilometres apart', () => {
		const places = clusterStartPoints([at(STOCKHOLM), at(GOTHENBURG), at(BERLIN)])
		expect(places).toHaveLength(3)
	})

	it('puts the place you run in most first', () => {
		const places = clusterStartPoints([
			at(BERLIN),
			at(STOCKHOLM), at(STOCKHOLM, 1), at(STOCKHOLM, 2), at(STOCKHOLM, 3),
			at(GOTHENBURG), at(GOTHENBURG, 1),
		])
		expect(places.map(p => p.activities.length)).toEqual([4, 2, 1])
	})

	it('breaks a tie on total distance, so the place you log more km in leads', () => {
		const places = clusterStartPoints([
			at(STOCKHOLM, 0, 5000), at(STOCKHOLM, 1, 5000),
			at(BERLIN, 0, 21000), at(BERLIN, 1, 21000),
		])
		expect(places[0].totalDistance).toBe(42000)
	})

	it('sums distance and records the latest run per place', () => {
		const places = clusterStartPoints([
			{ activity: { distance: 10000, start_date_local: '2026-03-01T07:00' }, lat: STOCKHOLM[0], lng: STOCKHOLM[1] },
			{ activity: { distance: 5000, start_date_local: '2026-05-20T07:00' }, lat: STOCKHOLM[0] + 0.01, lng: STOCKHOLM[1] },
		])
		expect(places[0].totalDistance).toBe(15000)
		expect(places[0].lastDate).toBe('2026-05-20T07:00')
	})

	it('ignores points with no usable coordinates', () => {
		const places = clusterStartPoints([
			at(STOCKHOLM),
			{ activity: {}, lat: NaN, lng: 18 },
			{ activity: {}, lat: 59, lng: Infinity },
		])
		expect(places).toHaveLength(1)
	})

	it('gives every place a coordinate label until a name arrives', () => {
		const [p] = clusterStartPoints([at(STOCKHOLM)])
		expect(p.label).toContain('°N')
		expect(p.country).toBeNull()
	})

	it('produces the same keys on a second run over the same points', () => {
		const a = clusterStartPoints([at(STOCKHOLM), at(STOCKHOLM, 1)])
		const b = clusterStartPoints([at(STOCKHOLM), at(STOCKHOLM, 1)])
		expect(a[0].key).toBe(b[0].key)
	})

	it('returns nothing for no points', () => {
		expect(clusterStartPoints([])).toEqual([])
	})
})

describe('placeKey / coordLabel', () => {
	it('keys on the rounded centre', () => {
		expect(placeKey(59.3293, 18.0686)).toBe('59.33,18.07')
	})

	it('labels both hemispheres', () => {
		expect(coordLabel(-33.86, 151.2)).toBe('33.86°S, 151.20°E')
		expect(coordLabel(40.71, -74.0)).toBe('40.71°N, 74.00°W')
	})
})

describe('labelFromAddress', () => {
	it('prefers the most recognisable settlement name', () => {
		expect(labelFromAddress({ city: 'Stockholm', state: 'Stockholm County', country: 'Sweden' })).toBe('Stockholm')
		expect(labelFromAddress({ town: 'Lidingö', country: 'Sweden' })).toBe('Lidingö')
		expect(labelFromAddress({ village: 'Åre', country: 'Sweden' })).toBe('Åre')
	})

	it('falls back through region to country', () => {
		expect(labelFromAddress({ state: 'Jämtland', country: 'Sweden' })).toBe('Jämtland')
		expect(labelFromAddress({ country: 'Sweden' })).toBe('Sweden')
	})

	it('is null with nothing to go on', () => {
		expect(labelFromAddress(undefined)).toBeNull()
		expect(labelFromAddress({})).toBeNull()
	})
})

describe('byCountry', () => {
	const place = (country: string | null, count: number): RunPlace => ({
		key: `${country}-${count}`, label: 'x', country,
		lat: 0, lng: 0,
		activities: new Array(count).fill({}),
		totalDistance: 0, lastDate: '',
	})

	it('groups and orders by how much you run there', () => {
		const groups = byCountry([place('Sweden', 3), place('Norway', 9), place('Sweden', 8)])
		expect(groups.map(g => g.country)).toEqual(['Sweden', 'Norway'])
		expect(groups[0].count).toBe(11)
		expect(groups[0].places).toHaveLength(2)
	})

	it('puts places with no resolved country last', () => {
		const groups = byCountry([place(null, 40), place('Sweden', 1)])
		expect(groups.map(g => g.country)).toEqual(['Sweden', ''])
	})
})
