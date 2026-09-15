import { describe, it, expect } from 'vitest'
import { addDays, format } from 'date-fns'
import {
	buildMetric,
	aerobicSpeed,
	bestEffortProgress,
	runningProgress,
	gymProgress,
	bodyProgress,
	volumeRamp,
	weekWindows,
	windowEnding,
	trendAnchors,
	weightTrend,
	median,
	referenceHR,
	trainingLoad,
	longTrend,
	COMPARE_OFFSET,
	REF_HRR,
	TREND_WEEKS,
	type DistanceSession,
} from './progress'
import type { Workout } from '@/types'

// Local noon, so day arithmetic is unambiguous in any time zone.
const TODAY = new Date(2026, 5, 15, 12, 0, 0) // Monday 15 June 2026

/** yyyy-MM-dd for `n` days before TODAY, in local time. */
const daysAgo = (n: number) => format(addDays(TODAY, -n), 'yyyy-MM-dd')

const MAX_HR = 190
const REST_HR = 50 // reserve 140

/** Heart rate at a given fraction of reserve. */
const hrAt = (frac: number) => REST_HR + frac * (MAX_HR - REST_HR)

function run(opts: {
	days: number
	km?: number
	minutes?: number
	hr?: number
	bests?: { name: string; elapsed_time: number }[]
	sport?: string
	maxHr?: number
}) {
	const km = opts.km ?? 10
	const minutes = opts.minutes ?? 50
	return {
		id: Math.random(),
		sport_type: opts.sport ?? 'Run',
		start_date_local: `${daysAgo(opts.days)}T07:00:00`,
		distance: km * 1000,
		moving_time: minutes * 60,
		average_speed: (km * 1000) / (minutes * 60),
		average_heartrate: opts.hr,
		max_heartrate: opts.maxHr,
		best_efforts: opts.bests,
	}
}

const session = (a: ReturnType<typeof run>): DistanceSession => ({
	date: new Date(a.start_date_local), km: a.distance / 1000, activity: a,
})

function gym(days: number, kg: number, gymType = 'Push'): Workout {
	return {
		id: Math.round(Math.random() * 1e6),
		date: daysAgo(days),
		name: `${gymType} day`,
		type: 'Gym',
		gymType,
		isCompleted: 1,
		totalWeightLifted: kg,
	}
}

const progress = (acts: ReturnType<typeof run>[], maxHR: number | null = MAX_HR) =>
	runningProgress({ sessions: acts.map(session), activities: acts, maxHR, restHR: REST_HR, today: TODAY })

describe('windows', () => {
	it('covers 28 whole calendar days including today', () => {
		const w = windowEnding(TODAY)
		expect(format(w.from, 'yyyy-MM-dd')).toBe(daysAgo(27))
		expect(format(w.to, 'yyyy-MM-dd')).toBe(daysAgo(-1))
	})

	it('puts the comparison point exactly four weeks back on the trend', () => {
		const anchors = trendAnchors(TODAY)
		expect(anchors).toHaveLength(TREND_WEEKS)
		expect(format(anchors[anchors.length - 1], 'yyyy-MM-dd')).toBe(daysAgo(0))
		expect(format(anchors[anchors.length - 1 - COMPARE_OFFSET], 'yyyy-MM-dd')).toBe(daysAgo(28))
	})
})

describe('buildMetric', () => {
	it('reads a rise as improvement when higher is better', () => {
		const m = buildMetric({ key: 'k', label: 'L', unit: 'km', current: 50, previous: 40 })
		expect(m.direction).toBe('improving')
		expect(m.delta).toBe(10)
		expect(m.deltaPct).toBeCloseTo(0.25)
	})

	it('reads a fall as improvement when lower is better', () => {
		const m = buildMetric({ key: 'pace', label: 'Pace', unit: '/km', current: 280, previous: 300, higherIsBetter: false })
		expect(m.direction).toBe('improving')
	})

	it('treats movement inside the band as holding', () => {
		const m = buildMetric({ key: 'k', label: 'L', unit: 'kg', current: 80.5, previous: 80.0 })
		expect(m.direction).toBe('holding')
	})

	it('refuses to judge a first period with no baseline', () => {
		const m = buildMetric({ key: 'k', label: 'L', unit: 'km', current: 42, previous: null })
		expect(m.direction).toBe('unknown')
		expect(m.unknownReason).toBe('baseline')
		expect(m.deltaDisplay).toBeNull()
	})

	it('surfaces the missing-data reason instead of a fake zero', () => {
		const m = buildMetric({ key: 'k', label: 'L', unit: 'km', current: null, previous: null, missing: 'Needs a heart rate monitor.' })
		expect(m.display).toBe('—')
		expect(m.note).toBe('Needs a heart rate monitor.')
	})

	it('will not call a trend from too few samples', () => {
		const m = buildMetric({
			key: 'k', label: 'L', unit: 'x', current: 10, previous: 5,
			verdict: { kind: 'samples', current: [10, 10], previous: [5, 5, 5], minRel: 0.01 },
		})
		expect(m.direction).toBe('unknown')
		expect(m.unknownReason).toBe('thin')
	})

	it('will not call noise a trend', () => {
		// Medians differ by 3%, but the runs scatter by far more than that.
		const m = buildMetric({
			key: 'k', label: 'L', unit: 'x', current: 103, previous: 100,
			verdict: { kind: 'samples', current: [80, 103, 125], previous: [78, 100, 122], minRel: 0.01 },
		})
		expect(m.direction).toBe('holding')
	})

	it('calls a consistent shift a trend', () => {
		const m = buildMetric({
			key: 'k', label: 'L', unit: 'x', current: 110, previous: 100,
			verdict: { kind: 'samples', current: [109, 110, 111, 110], previous: [99, 100, 101, 100], minRel: 0.01 },
		})
		expect(m.direction).toBe('improving')
	})
})

describe('aerobicSpeed', () => {
	it('rescales speed to the reference heart rate', () => {
		// 10 km in 50 min = 3.333 m/s at exactly the reference HR: unchanged
		const s = aerobicSpeed(run({ days: 1, km: 10, minutes: 50, hr: hrAt(REF_HRR) }), MAX_HR, REST_HR)
		expect(s).toBeCloseTo(10000 / 3000, 3)
	})

	it('scores an easy run and a steadier run at the same fitness equally', () => {
		const easy = aerobicSpeed(run({ days: 1, km: 10, minutes: 60, hr: hrAt(0.55) }), MAX_HR, REST_HR)!
		const steady = aerobicSpeed(run({ days: 1, km: 10, minutes: 60 * (0.55 / 0.75), hr: hrAt(0.75) }), MAX_HR, REST_HR)!
		expect(easy).toBeCloseTo(steady, 3)
	})

	it('rejects short runs, missing HR, hard efforts and no max HR', () => {
		expect(aerobicSpeed(run({ days: 1, km: 2, minutes: 10, hr: hrAt(0.65) }), MAX_HR, REST_HR)).toBeNull()
		expect(aerobicSpeed(run({ days: 1 }), MAX_HR, REST_HR)).toBeNull()
		expect(aerobicSpeed(run({ days: 1, hr: hrAt(0.92) }), MAX_HR, REST_HR)).toBeNull()
		expect(aerobicSpeed(run({ days: 1, hr: hrAt(0.65) }), null, REST_HR)).toBeNull()
	})

	it('quotes the reference in bpm for this athlete', () => {
		expect(referenceHR(MAX_HR, REST_HR)).toBe(Math.round(50 + 0.65 * 140))
	})
})

describe('runningProgress', () => {
	it('reports getting faster at the same heart rate', () => {
		const hr = hrAt(0.65)
		const acts = [
			run({ days: 50, minutes: 55, hr }), run({ days: 42, minutes: 55.2, hr }), run({ days: 35, minutes: 54.8, hr }),
			run({ days: 20, minutes: 50, hr }), run({ days: 10, minutes: 50.2, hr }), run({ days: 4, minutes: 49.8, hr }),
		]
		const pace = progress(acts).metrics.find(m => m.key === 'run-aerobic-pace')!
		expect(pace.direction).toBe('improving')
		expect(pace.value).toBeLessThan(pace.previous!)
		expect(pace.basis).toMatch(/3 runs/)
	})

	it('does not mistake a shift to harder runs for fitness', () => {
		// Same fitness throughout; the recent month just has faster, harder runs.
		const acts = [
			run({ days: 50, minutes: 60, hr: hrAt(0.55) }), run({ days: 42, minutes: 60, hr: hrAt(0.55) }), run({ days: 35, minutes: 60, hr: hrAt(0.55) }),
			run({ days: 20, minutes: 60 * (0.55 / 0.75), hr: hrAt(0.75) }),
			run({ days: 10, minutes: 60 * (0.55 / 0.75), hr: hrAt(0.75) }),
			run({ days: 4, minutes: 60 * (0.55 / 0.75), hr: hrAt(0.75) }),
		]
		const pace = progress(acts).metrics.find(m => m.key === 'run-aerobic-pace')!
		expect(pace.direction).toBe('holding')
	})

	it('trend line ends on the headline and passes through the comparison', () => {
		const hr = hrAt(0.65)
		const acts = [40, 36, 33, 20, 12, 3].map(d => run({ days: d, minutes: 50 + d / 10, hr }))
		const pace = progress(acts).metrics.find(m => m.key === 'run-aerobic-pace')!
		const volume = progress(acts).metrics.find(m => m.key === 'run-volume')!
		for (const m of [pace, volume]) {
			expect(m.trend[m.trend.length - 1]).toBe(m.value)
			expect(m.trend[m.trend.length - 1 - COMPARE_OFFSET]).toBe(m.previous)
		}
	})

	it('does not report volume falling just because it is Monday', () => {
		// Exactly 30 km every week for 12 weeks, one run every Saturday. TODAY is a
		// Monday, so the current calendar week holds nothing yet. The old
		// calendar-week comparison read that as a 25% drop.
		const acts = Array.from({ length: 12 }, (_, i) => run({ days: 2 + 7 * i, km: 30, minutes: 150 }))
		const volume = progress(acts).metrics.find(m => m.key === 'run-volume')!
		expect(volume.value).toBe(30)
		expect(volume.previous).toBe(30)
		expect(volume.direction).toBe('holding')
	})

	it('counts runs from sessions, so logged runs without a file count too', () => {
		const sessions: DistanceSession[] = [
			{ date: new Date(daysAgo(3)), km: 8, activity: null },
			{ date: new Date(daysAgo(10)), km: 12, activity: null },
		]
		const p = runningProgress({ sessions, activities: [], maxHR: null, restHR: 60, today: TODAY })
		expect(p.metrics.find(m => m.key === 'run-consistency')!.basis).toMatch(/2 runs/)
		expect(p.metrics.find(m => m.key === 'run-longest')!.value).toBe(12)
		expect(p.hasData).toBe(true)
	})

	it('explains a missing aerobic reading rather than hiding it', () => {
		const pace = progress([run({ days: 5 })], null).metrics.find(m => m.key === 'run-aerobic-pace')!
		expect(pace.value).toBeNull()
		expect(pace.missing).toMatch(/heart rate/i)
	})

	it('has no data when nothing has been run', () => {
		expect(progress([]).hasData).toBe(false)
	})
})

describe('bestEffortProgress', () => {
	it('compares the rolling window against the one before it', () => {
		const acts = [
			run({ days: 200, bests: [{ name: '5 km', elapsed_time: 1400 }] }),
			run({ days: 120, bests: [{ name: '5 km', elapsed_time: 1300 }] }),
			run({ days: 10, bests: [{ name: '5 km', elapsed_time: 1250 }] }),
		]
		const [fiveK] = bestEffortProgress(acts, 90, TODAY)
		expect(fiveK.current).toBe(1250)
		expect(fiveK.previous).toBe(1300)
		expect(fiveK.freshPB).toBe(true)
		expect(fiveK.allTimeDate).toBe(daysAgo(10))
	})

	it('does not call an old best a fresh PB', () => {
		const acts = [
			run({ days: 300, bests: [{ name: '5 km', elapsed_time: 1100 }] }),
			run({ days: 5, bests: [{ name: '5 km', elapsed_time: 1250 }] }),
		]
		expect(bestEffortProgress(acts, 90, TODAY)[0].freshPB).toBe(false)
	})

	it('omits distances never recorded', () => {
		const out = bestEffortProgress([run({ days: 5, bests: [{ name: '5 km', elapsed_time: 1250 }] })], 90, TODAY)
		expect(out.map(b => b.name)).toEqual(['5 km'])
	})
})

describe('trainingLoad', () => {
	it('keys an early-morning run to its own local day', () => {
		const older = run({ days: 20, hr: hrAt(0.7) })
		const a = { ...run({ days: 0, hr: hrAt(0.7) }), start_date_local: `${daysAgo(0)}T00:30:00` }
		const l = trainingLoad([older, a], MAX_HR, REST_HR, 30, TODAY)!
		const last = l.series[l.series.length - 1]
		expect(last.date).toBe(daysAgo(0))
		// Today's run lands today: fatigue jumps on the last day, not the one before.
		expect(last.fatigue).toBeGreaterThan(l.series[l.series.length - 2].fatigue)
	})

	it('flags a short history as warming up instead of claiming progress', () => {
		const acts = [20, 15, 10, 5].map(d => run({ days: d, hr: hrAt(0.7) }))
		const l = trainingLoad(acts, MAX_HR, REST_HR, 120, TODAY)!
		expect(l.warmingUp).toBe(true)
		expect(l.fitnessPrev).toBeNull()
	})
})

describe('gymProgress', () => {
	it('separates lifting more per session from simply training more often', () => {
		const workouts = [
			gym(50, 5000), gym(42, 5000), gym(35, 5000),
			gym(24, 5000), gym(20, 5000), gym(14, 5000), gym(7, 5000), gym(2, 5000), gym(1, 5000),
		]
		const { metrics } = gymProgress(workouts, TODAY)
		expect(metrics.find(m => m.key === 'gym-volume')!.direction).toBe('improving')
		expect(metrics.find(m => m.key === 'gym-load-per-session')!.direction).toBe('holding')
		expect(metrics.find(m => m.key === 'gym-sessions')!.direction).toBe('improving')
	})

	it('uses the median, so one huge session is not a stronger month', () => {
		const workouts = [gym(50, 5000), gym(42, 5000), gym(35, 5000), gym(20, 5000), gym(10, 5000), gym(3, 20000)]
		const perSession = gymProgress(workouts, TODAY).metrics.find(m => m.key === 'gym-load-per-session')!
		expect(perSession.value).toBe(5)
		expect(perSession.direction).toBe('holding')
	})

	it('tracks each split independently', () => {
		const workouts = [
			gym(45, 4000, 'Push'), gym(35, 4100, 'Push'), gym(20, 6000, 'Push'), gym(10, 6100, 'Push'),
			gym(45, 5000, 'Legs'), gym(35, 5000, 'Legs'), gym(20, 5000, 'Legs'), gym(10, 5000, 'Legs'),
		]
		const { splits } = gymProgress(workouts, TODAY)
		expect(splits.find(s => s.split === 'Push')!.direction).toBe('improving')
		expect(splits.find(s => s.split === 'Legs')!.direction).toBe('holding')
	})

	it('sees a steady gain through a mix of heavy and light split days', () => {
		const workouts: Workout[] = []
		for (let d = 83; d >= 0; d -= 2) {
			const split = ['Push', 'Pull', 'Legs'][(d / 2) % 3]
			const base = split === 'Legs' ? 7200 : 5000
			const growth = 1 + 0.04 * ((83 - d) / 28) // 4% every 4 weeks
			workouts.push(gym(d, Math.round(base * growth * (d % 4 ? 1.03 : 0.97)), split))
		}
		const perSession = gymProgress(workouts, TODAY).metrics.find(m => m.key === 'gym-load-per-session')!
		expect(perSession.longTrend!.significant).toBe(true)
		expect(perSession.longTrend!.pctPer4Weeks).toBeGreaterThan(0.025)
	})

	it('asks for load data instead of reporting zero', () => {
		const perSession = gymProgress([gym(5, 0)], TODAY).metrics.find(m => m.key === 'gym-load-per-session')!
		expect(perSession.value).toBeNull()
		expect(perSession.missing).toMatch(/total load/i)
	})
})

describe('bodyProgress', () => {
	it('smooths out day-to-day noise', () => {
		const weights = Array.from({ length: 60 }, (_, i) => ({ date: daysAgo(59 - i), weight: 80 + (i % 2 ? 0.5 : -0.5) }))
		const smoothed = weightTrend(weights)
		expect(Math.abs(smoothed[58].weight - smoothed[59].weight)).toBeLessThan(0.5)
	})

	it('means the same thing however often you weigh in', () => {
		// Losing 0.5 kg a week, weighed daily vs twice a week.
		const daily = Array.from({ length: 56 }, (_, i) => ({ date: daysAgo(55 - i), weight: 85 - ((i / 7) * 0.5) }))
		const sparse = daily.filter((_, i) => i % 3 === 0 || i === 55)
		const a = bodyProgress(daily, 78, TODAY)
		const b = bodyProgress(sparse, 78, TODAY)
		expect(Math.abs(a.metrics[0].value! - b.metrics[0].value!)).toBeLessThan(0.25)
		expect(a.ratePerWeek).toBeCloseTo(-0.5, 1)
		expect(b.ratePerWeek).toBeCloseTo(-0.5, 1)
	})

	it('notices a 1.5 kg month, which a 2% band called holding', () => {
		const w = [
			{ date: daysAgo(40), weight: 81.5 }, { date: daysAgo(33), weight: 81.5 },
			{ date: daysAgo(8), weight: 80 }, { date: daysAgo(1), weight: 80 },
		]
		expect(bodyProgress(w, 75, TODAY).metrics[0].direction).toBe('improving')
	})

	it('counts movement toward the goal as improvement, whichever way it lies', () => {
		const losing = [{ date: daysAgo(40), weight: 85 }, { date: daysAgo(33), weight: 85 }, { date: daysAgo(3), weight: 82 }, { date: daysAgo(1), weight: 82 }]
		expect(bodyProgress(losing, 78, TODAY).metrics[0].direction).toBe('improving')
		const gaining = [{ date: daysAgo(40), weight: 62 }, { date: daysAgo(33), weight: 62 }, { date: daysAgo(3), weight: 65 }, { date: daysAgo(1), weight: 65 }]
		expect(bodyProgress(gaining, 70, TODAY).metrics[0].direction).toBe('improving')
	})

	it('projects weeks to goal only when the trend points at it', () => {
		const towards = Array.from({ length: 10 }, (_, i) => ({ date: daysAgo(27 - i * 3), weight: 84 - i * 0.2 }))
		expect(bodyProgress(towards, 78, TODAY).weeksToGoal).toBeGreaterThan(0)
		const away = Array.from({ length: 10 }, (_, i) => ({ date: daysAgo(27 - i * 3), weight: 80 + i * 0.2 }))
		expect(bodyProgress(away, 78, TODAY).weeksToGoal).toBeNull()
	})

	it('will not compare against a reading from months ago', () => {
		const w = [{ date: daysAgo(200), weight: 90 }, { date: daysAgo(2), weight: 80 }]
		const m = bodyProgress(w, 75, TODAY).metrics[0]
		expect(m.previous).toBeNull()
		expect(m.direction).toBe('unknown')
	})

	it('handles having no weigh-ins at all', () => {
		const p = bodyProgress([], null, TODAY)
		expect(p.hasData).toBe(false)
		expect(p.metrics[0].value).toBeNull()
	})
})

describe('volumeRamp', () => {
	const weekly = (kms: number[]) =>
		// kms oldest first; one session per week, the last one inside the last 7 days
		kms.map((km, i) => ({ date: addDays(TODAY, -7 * (kms.length - 1 - i) - 1), km }))

	it('flags a sharp jump', () => {
		expect(volumeRamp(weekly([20, 20, 20, 20, 20, 40]), TODAY).verdict).toBe('sharp')
	})

	it('accepts a steady build', () => {
		expect(volumeRamp(weekly([20, 20, 21, 22, 23, 25]), TODAY).verdict).toBe('ok')
	})

	it('spots a deload', () => {
		expect(volumeRamp(weekly([40, 40, 40, 40, 40, 10]), TODAY).verdict).toBe('detraining')
	})

	it('does not call a Monday morning detraining', () => {
		// 30 km every Saturday. On Monday the calendar week is empty, but the last
		// seven days still hold a normal week.
		const sessions = Array.from({ length: 8 }, (_, i) => ({ date: addDays(TODAY, -2 - 7 * i), km: 30 }))
		expect(volumeRamp(sessions, TODAY).verdict).toBe('ok')
	})

	it('says nothing without enough history', () => {
		expect(volumeRamp(weekly([20, 20]), TODAY).verdict).toBe('unknown')
	})
})

describe('longTrend', () => {
	const series = (perSession: (i: number) => number) =>
		Array.from({ length: 30 }, (_, i) => ({ date: addDays(TODAY, -(29 - i) * 2.8), v: perSession(i) }))

	it('sees slow steady progress that month-on-month calls steady', () => {
		// ~3% gain per 4 weeks with ±6% alternating scatter
		const xs = series(i => 5 * (1 + 0.03 * ((i * 2.8) / 28)) * (i % 2 ? 1.06 : 0.94))
		const t = longTrend(xs, TODAY)!
		expect(t.significant).toBe(true)
		expect(t.pctPer4Weeks).toBeGreaterThan(0.02)
		expect(t.pctPer4Weeks).toBeLessThan(0.04)
	})

	it('does not find a trend in pure scatter', () => {
		const xs = series(i => 5 * (i % 2 ? 1.06 : 0.94))
		expect(longTrend(xs, TODAY)!.significant).toBe(false)
	})

	it('needs enough sessions over enough time', () => {
		expect(longTrend(series(() => 5).slice(-4), TODAY)).toBeNull()
	})
})

describe('helpers', () => {
	it('weekWindows ends with the current week, Monday-started', () => {
		const weeks = weekWindows(4, TODAY)
		expect(weeks).toHaveLength(4)
		expect(weeks[3].start.getDay()).toBe(1)
		expect(weeks[3].start.getTime()).toBeLessThanOrEqual(TODAY.getTime())
		expect(weeks[3].end.getTime()).toBeGreaterThanOrEqual(TODAY.getTime())
	})

	it('median averages the middle pair on even counts', () => {
		expect(median([1, 2, 3, 4])).toBe(2.5)
		expect(median([])).toBeNull()
	})
})
