import { describe, it, expect } from 'vitest'
import {
	MIN_EFFORT_M,
	raceVdotSamples,
	effortVdotSamples,
	loggedRunVdotSamples,
	currentVdot,
	vdotTrendPerMonth,
	rollingBestSeries,
	projectVdot,
	goalProgress,
	type VdotSample,
} from './fitness'
import type { RaceGoal } from '@/types'

const TODAY = new Date('2026-07-10T12:00:00Z')
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10)

const race = (over: Partial<RaceGoal>): RaceGoal =>
	({ id: 1, name: 'R', date: daysAgo(30), ...over }) as RaceGoal

const run = (over: Record<string, any>) => ({
	sport_type: 'Run',
	start_date_local: daysAgo(10),
	...over,
})

const sample = (date: string, vdot: number): VdotSample =>
	({ date, vdot, source: 'effort', label: 'x' })

describe('raceVdotSamples', () => {
	it('turns a 1:42 half result into VDOT 44.1', () => {
		const s = raceVdotSamples([race({ name: 'Gbg', distance_km: 21.097, result_time_secs: 6120 })])
		expect(s).toHaveLength(1)
		expect(s[0].vdot).toBeCloseTo(44.1, 1)
		expect(s[0].source).toBe('race')
	})

	it('ignores races with no result or no distance', () => {
		expect(raceVdotSamples([race({ distance_km: 21.097 })])).toHaveLength(0)
		expect(raceVdotSamples([race({ result_time_secs: 6120 })])).toHaveLength(0)
	})
})

describe('effortVdotSamples', () => {
	it('takes the best qualifying effort inside a run', () => {
		const s = effortVdotSamples([run({
			distance: 12000, moving_time: 4200,          // whole run, easy
			best_efforts: [
				{ name: '1 km', distance: 1000, elapsed_time: 278 },   // too short to count
				{ name: '5 km', distance: 5000, elapsed_time: 24 * 60 + 51 },
			],
		})])
		expect(s).toHaveLength(1)
		expect(s[0].vdot).toBeCloseTo(38.6, 1)
		expect(s[0].label).toBe('5 km best effort')
	})

	it(`ignores efforts under ${MIN_EFFORT_M} m — a fast km is not a VDOT`, () => {
		const s = effortVdotSamples([run({
			best_efforts: [{ name: '1 km', distance: 1000, elapsed_time: 200 }], // ~3:20/km
		})])
		expect(s).toHaveLength(0)
	})

	it('falls back to the whole activity when there are no best efforts', () => {
		const s = effortVdotSamples([run({ distance: 10000, moving_time: 46 * 60 + 1, name: 'Tempo' })])
		expect(s).toHaveLength(1)
		expect(s[0].vdot).toBeCloseTo(44.1, 1)
		expect(s[0].label).toBe('Tempo')
	})

	it('skips non-running activities', () => {
		expect(effortVdotSamples([run({ sport_type: 'Ride', distance: 40000, moving_time: 3600 })])).toHaveLength(0)
	})
})

describe('loggedRunVdotSamples', () => {
	const run = (over: Partial<any> = {}) =>
		({ date: daysAgo(3), name: 'Fast', distanceKm: 14.14, minutes: 65, ...over })

	it('scores a hand-logged run', () => {
		const s = loggedRunVdotSamples([run()])
		expect(s).toHaveLength(1)
		expect(s[0].vdot).toBeCloseTo(45.3, 1)
		expect(s[0].label).toBe('Fast (logged)')
		expect(s[0].source).toBe('effort')
	})

	it(`ignores runs under ${MIN_EFFORT_M} m`, () => {
		expect(loggedRunVdotSamples([run({ distanceKm: 2, minutes: 8 })])).toHaveLength(0)
	})

	it('rejects the mistyped rows: 31 km in a 20-minute session', () => {
		// 31.164 km in 60 min is 31 km/h — the model refuses it rather than
		// reporting a superhuman VDOT.
		expect(loggedRunVdotSamples([run({ distanceKm: 31.164, minutes: 60 })])).toHaveLength(0)
		expect(loggedRunVdotSamples([run({ distanceKm: 28.38, minutes: 65 })])).toHaveLength(0)
	})

	it('ignores runs missing a distance or a duration', () => {
		expect(loggedRunVdotSamples([run({ minutes: 0 })])).toHaveLength(0)
		expect(loggedRunVdotSamples([run({ distanceKm: undefined })])).toHaveLength(0)
	})

	it('reads lower than a recording of the same run, so it cannot inflate the max', () => {
		// The recording surfaces a hard 5k inside the run; the logged row only
		// knows the overall average.
		const logged = loggedRunVdotSamples([run({ distanceKm: 12, minutes: 66 })])[0]
		const recorded = effortVdotSamples([{
			sport_type: 'Run', start_date_local: daysAgo(3), distance: 12000, moving_time: 66 * 60,
			best_efforts: [{ name: '5 km', distance: 5000, elapsed_time: 22 * 60 + 41 }],
		}])[0]
		expect(logged.vdot).toBeLessThan(recorded.vdot)
	})
})

describe('currentVdot', () => {
	const races = raceVdotSamples([race({ name: 'Half', distance_km: 21.097, result_time_secs: 6120 })])
	const efforts = [sample(daysAgo(5), 38.6)]

	it('prefers a manual override over everything', () => {
		const c = currentVdot(races, efforts, 46)!
		expect(c).toMatchObject({ vdot: 46, source: 'override' })
	})

	it('ignores an override outside the modelled range', () => {
		expect(currentVdot(races, efforts, 5, TODAY)!.source).toBe('race')
		expect(currentVdot(races, efforts, 200, TODAY)!.source).toBe('race')
	})

	it('prefers a recent race over training efforts', () => {
		const c = currentVdot(races, efforts, null, TODAY)!
		expect(c.source).toBe('race')
		expect(c.vdot).toBeCloseTo(44.1, 1)
	})

	it('falls back to training efforts once the race goes stale', () => {
		const old = raceVdotSamples([race({ date: daysAgo(300), distance_km: 21.097, result_time_secs: 6120 })])
		const c = currentVdot(old, efforts, null, TODAY)!
		expect(c.source).toBe('effort')
		expect(c.vdot).toBeCloseTo(38.6, 1)
		expect(c.stale).toBe(false)
	})

	it('flags an effort older than six weeks as ageing, but still uses it', () => {
		const c = currentVdot([], [sample(daysAgo(60), 40)], null, TODAY)!
		expect(c).toMatchObject({ vdot: 40, source: 'effort', stale: true })
	})

	it('returns null with nothing to go on', () => {
		expect(currentVdot([], [], null, TODAY)).toBeNull()
		expect(currentVdot([], [sample(daysAgo(400), 40)], null, TODAY)).toBeNull()
		expect(currentVdot([], [sample(daysAgo(120), 44)], null, TODAY)).toBeNull()  // past the 90-day window
	})

	it('takes the best of several recent efforts, not the newest', () => {
		const c = currentVdot([], [sample(daysAgo(30), 45), sample(daysAgo(2), 39)], null, TODAY)!
		expect(c.vdot).toBe(45)
	})

	/**
	 * The real regression: a half-marathon effort 55 days ago read VDOT 44.9,
	 * but a 42-day window threw it away and returned 38.6 from an easy July run.
	 */
	it('prefers an older hard effort over a recent easy one', () => {
		const hard = sample(daysAgo(55), 44.9)
		const easy = sample(daysAgo(3), 38.6)
		const c = currentVdot([], [easy, hard], null, TODAY)!
		expect(c.vdot).toBe(44.9)
		expect(c.stale).toBe(true)   // ageing, and says so
	})

	it('an effort inside six weeks is not flagged as ageing', () => {
		expect(currentVdot([], [sample(daysAgo(20), 44)], null, TODAY)!.stale).toBe(false)
	})

	it('flags an ageing race result too', () => {
		const old = raceVdotSamples([race({ date: daysAgo(120), distance_km: 21.097, result_time_secs: 6120 })])
		const c = currentVdot(old, [], null, TODAY)!
		expect(c.source).toBe('race')
		expect(c.stale).toBe(true)
	})
})

describe('rollingBestSeries', () => {
	it('holds the best effort until it ages out of the window', () => {
		const hard = sample(daysAgo(60), 45)
		const easy = [0, 7, 14].map(d => sample(daysAgo(d), 38))
		const series = rollingBestSeries([hard, ...easy], 12, 90, TODAY)
		// Every anchor within 90 days of the hard effort still reports it.
		expect(series[series.length - 1].vdot).toBe(45)
		expect(series[series.length - 1].sourceDate).toBe(hard.date)
	})

	it('drops to the next best once the good effort falls out of the window', () => {
		const old = sample(daysAgo(100), 45)
		const recent = sample(daysAgo(10), 38)
		const series = rollingBestSeries([old, recent], 12, 90, TODAY)
		expect(series[series.length - 1].vdot).toBe(38)   // 100 days > 90-day window
	})

	it('skips anchors with nothing in the window', () => {
		expect(rollingBestSeries([sample(daysAgo(2), 40)], 12, 90, TODAY).length).toBeGreaterThan(0)
		expect(rollingBestSeries([], 12, 90, TODAY)).toEqual([])
	})
})

describe('vdotTrendPerMonth', () => {
	it('measures a steady climb of new best efforts', () => {
		const s = Array.from({ length: 12 }, (_, i) => sample(daysAgo(i * 7), 45 - (i * 7) / 30))
		expect(vdotTrendPerMonth(s, 12, TODAY)).toBeCloseTo(1, 1)
	})

	/**
	 * The regression this whole function exists for: a hard May effort followed
	 * by a block of easy July running used to fit a -5/month "collapse". Not
	 * doing hard efforts is not losing fitness.
	 */
	it('does not read a base-training block as fitness loss', () => {
		const hard = [sample(daysAgo(55), 44.9), sample(daysAgo(48), 44.2)]
		const easyJuly = [9, 7, 4, 3, 2, 1].map(d => sample(daysAgo(d), 26 + d))
		expect(vdotTrendPerMonth([...hard, ...easyJuly], 12, TODAY)).toBeNull()
	})

	it('is null when one effort dominates every window', () => {
		const s = [sample(daysAgo(30), 45), ...[0, 7, 14].map(d => sample(daysAgo(d), 30))]
		expect(vdotTrendPerMonth(s, 12, TODAY)).toBeNull()
	})

	it('goes negative when a good effort ages out and nothing replaces it', () => {
		const s = [sample(daysAgo(100), 46), ...[0, 14, 28, 42, 56, 70].map(d => sample(daysAgo(d), 40))]
		expect(vdotTrendPerMonth(s, 12, TODAY)!).toBeLessThan(0)
	})

	it('is unmoved by extra easy runs', () => {
		const real = Array.from({ length: 6 }, (_, i) => sample(daysAgo(i * 7), 45 - (i * 7) / 30))
		const withJunk = [...real, ...real.map(s => ({ ...s, vdot: 30 }))]
		expect(vdotTrendPerMonth(withJunk, 12, TODAY)).toBeCloseTo(vdotTrendPerMonth(real, 12, TODAY)!, 5)
	})

	it('needs at least three anchors', () => {
		expect(vdotTrendPerMonth([sample(daysAgo(1), 44)], 2, TODAY)).toBeNull()
	})
})

describe('projectVdot', () => {
	it('extrapolates the trend to a date', () => {
		expect(projectVdot(44, 1, daysAgo(-60), TODAY)).toBeCloseTo(46, 1)
	})
	it('a flat trend projects flat', () => {
		expect(projectVdot(44, 0, daysAgo(-90), TODAY)).toBe(44)
	})
	it('never returns a physiologically impossible VDOT', () => {
		// A steep negative slope run far out used to produce a negative VDOT.
		expect(projectVdot(44.1, -5, daysAgo(-309), TODAY)).toBeGreaterThanOrEqual(20)
		expect(projectVdot(60, 10, daysAgo(-365), TODAY)).toBeLessThanOrEqual(90)
	})
})

describe('goalProgress', () => {
	const inDays = (n: number) => daysAgo(-n)

	it('says on track when the trend arrives in time', () => {
		// need 49.8, at 44.1, +1.5/month, 140 days out => 44.1 + 7.0 = 51.1
		const p = goalProgress(49.8, 44.1, 1.5, inDays(140), TODAY)
		expect(p.gap).toBeCloseTo(5.7, 1)
		expect(p.onTrack).toBe(true)
		expect(p.projectedShortfall!).toBeLessThan(0)
	})

	it('says off track when the trend arrives short', () => {
		// sub-20 5k (49.8) from 44.1 at +0.4/month over 98 days => ~45.4
		const p = goalProgress(49.8, 44.1, 0.4, inDays(98), TODAY)
		expect(p.onTrack).toBe(false)
		expect(p.projectedShortfall).toBeCloseTo(4.4, 1)
	})

	it('reports a gap but no projection for an undated goal', () => {
		const p = goalProgress(51, 44.1, 1.0, null, TODAY)
		expect(p.gap).toBeCloseTo(6.9, 1)
		expect(p.daysOut).toBeNull()
		expect(p.onTrack).toBeNull()
		expect(p.projectedVdot).toBeNull()
	})

	it('reports no projection with no trend', () => {
		expect(goalProgress(49.8, 44.1, null, inDays(60), TODAY).onTrack).toBeNull()
	})

	it('a goal already reached has a non-positive gap', () => {
		expect(goalProgress(44, 46, 0.2, inDays(30), TODAY).gap).toBeLessThan(0)
	})

	it('does not project a goal whose date has passed', () => {
		const p = goalProgress(49.8, 44.1, 1, daysAgo(10), TODAY)
		expect(p.onTrack).toBeNull()
		expect(p.noProjectionReason).toBe('past')
	})

	it('declines to project further out than half a year', () => {
		const p = goalProgress(51, 44.1, 1.5, inDays(309), TODAY)   // next-year half
		expect(p.onTrack).toBeNull()
		expect(p.projectedVdot).toBeNull()
		expect(p.noProjectionReason).toBe('too-far')
		expect(p.gap).toBeCloseTo(6.9, 1)   // the gap is still reported
	})

	it('reports why it declined, in every case', () => {
		expect(goalProgress(50, 44, 1, null, TODAY).noProjectionReason).toBe('undated')
		expect(goalProgress(50, 44, null, inDays(60), TODAY).noProjectionReason).toBe('no-trend')
		expect(goalProgress(50, 44, 1, inDays(60), TODAY).noProjectionReason).toBeNull()
	})
})
