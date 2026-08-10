import { describe, it, expect } from 'vitest'
import {
	buildMetric,
	efficiencyFactor,
	aerobicPaceSamples,
	bestEffortProgress,
	runningProgress,
	gymProgress,
	bodyProgress,
	volumeRamp,
	weekWindows,
	toSpark,
	median,
	sampleEvenly,
	PERIOD_DAYS,
} from './progress'
import type { Workout } from '@/types'

const TODAY = new Date('2026-06-15T12:00:00Z')

/** yyyy-MM-dd for `n` days before TODAY. */
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10)

function run(opts: {
	days: number
	km?: number
	minutes?: number
	hr?: number
	bests?: { name: string; elapsed_time: number }[]
	sport?: string
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
		best_efforts: opts.bests,
	}
}

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

describe('buildMetric', () => {
	it('reads a rise as improvement when higher is better', () => {
		const m = buildMetric({ key: 'k', label: 'L', unit: 'km', current: 50, previous: 40 })
		expect(m.direction).toBe('improving')
		expect(m.delta).toBe(10)
		expect(m.deltaPct).toBeCloseTo(0.25)
	})

	it('reads a fall as improvement when lower is better', () => {
		const m = buildMetric({
			key: 'pace', label: 'Pace', unit: '/km',
			current: 280, previous: 300, higherIsBetter: false,
		})
		expect(m.direction).toBe('improving')
	})

	it('treats sub-2% movement as holding, not progress', () => {
		const m = buildMetric({ key: 'k', label: 'L', unit: 'kg', current: 80.5, previous: 80.0 })
		expect(m.direction).toBe('holding')
	})

	it('refuses to judge a first period with no baseline', () => {
		const m = buildMetric({ key: 'k', label: 'L', unit: 'km', current: 42, previous: null })
		expect(m.direction).toBe('unknown')
		expect(m.deltaDisplay).toBeNull()
	})

	it('surfaces the missing-data reason instead of a fake zero', () => {
		const m = buildMetric({
			key: 'k', label: 'L', unit: 'km', current: null, previous: null,
			missing: 'Needs a heart rate monitor.',
		})
		expect(m.value).toBeNull()
		expect(m.display).toBe('—')
		expect(m.direction).toBe('unknown')
		expect(m.note).toBe('Needs a heart rate monitor.')
	})
})

describe('efficiencyFactor', () => {
	it('is metres per minute per heartbeat', () => {
		// 10 km in 50 min = 3.333 m/s = 200 m/min; at 150 bpm that's 1.333 m/beat
		const ef = efficiencyFactor(run({ days: 1, km: 10, minutes: 50, hr: 150 }))
		expect(ef).toBeCloseTo(1.333, 2)
	})

	it('rises when the same heart rate covers more ground', () => {
		const before = efficiencyFactor(run({ days: 40, km: 10, minutes: 55, hr: 150 }))!
		const after = efficiencyFactor(run({ days: 1, km: 10, minutes: 50, hr: 150 }))!
		expect(after).toBeGreaterThan(before)
	})

	it('rejects runs too short for average HR to mean anything', () => {
		expect(efficiencyFactor(run({ days: 1, km: 2, minutes: 10, hr: 150 }))).toBeNull()
	})

	it('rejects runs with no heart rate', () => {
		expect(efficiencyFactor(run({ days: 1, km: 10, minutes: 50 }))).toBeNull()
	})
})

describe('aerobicPaceSamples', () => {
	const maxHR = 190
	const restHR = 50
	// reserve 140 -> band is 50 + 77 = 127 to 50 + 105 = 155 bpm

	it('keeps runs inside the aerobic band', () => {
		const s = aerobicPaceSamples([run({ days: 3, km: 10, minutes: 50, hr: 140 })], maxHR, restHR)
		expect(s).toHaveLength(1)
		expect(s[0].paceSec).toBeCloseTo(300, 0)
	})

	it('drops hard efforts above the band', () => {
		expect(aerobicPaceSamples([run({ days: 3, hr: 175 })], maxHR, restHR)).toHaveLength(0)
	})

	it('returns nothing without a usable max HR', () => {
		expect(aerobicPaceSamples([run({ days: 3, hr: 140 })], null, restHR)).toHaveLength(0)
	})
})

describe('bestEffortProgress', () => {
	it('compares the rolling window against the one before it', () => {
		const acts = [
			run({ days: 200, bests: [{ name: '5 km', elapsed_time: 1400 }] }), // outside both
			run({ days: 120, bests: [{ name: '5 km', elapsed_time: 1300 }] }), // previous window
			run({ days: 10, bests: [{ name: '5 km', elapsed_time: 1250 }] }),  // current window
		]
		const [fiveK] = bestEffortProgress(acts, 90, TODAY).filter(b => b.name === '5 km')
		expect(fiveK.current).toBe(1250)
		expect(fiveK.previous).toBe(1300)
		expect(fiveK.allTime).toBe(1250)
		expect(fiveK.freshPB).toBe(true)
	})

	it('does not call an old best a fresh PB', () => {
		const acts = [
			run({ days: 300, bests: [{ name: '5 km', elapsed_time: 1100 }] }),
			run({ days: 5, bests: [{ name: '5 km', elapsed_time: 1250 }] }),
		]
		const [fiveK] = bestEffortProgress(acts, 90, TODAY).filter(b => b.name === '5 km')
		expect(fiveK.allTime).toBe(1100)
		expect(fiveK.freshPB).toBe(false)
	})

	it('omits distances never recorded', () => {
		const out = bestEffortProgress([run({ days: 5, bests: [{ name: '5 km', elapsed_time: 1250 }] })], 90, TODAY)
		expect(out.map(b => b.name)).toEqual(['5 km'])
	})
})

describe('runningProgress', () => {
	it('reports improving efficiency across periods', () => {
		const activities = [
			// previous 28 days: slower for the same heart rate
			run({ days: 40, km: 10, minutes: 55, hr: 145 }),
			run({ days: 35, km: 10, minutes: 55, hr: 145 }),
			// current 28 days: faster at the same heart rate
			run({ days: 10, km: 10, minutes: 50, hr: 145 }),
			run({ days: 4, km: 10, minutes: 50, hr: 145 }),
		]
		const { metrics } = runningProgress({
			activities, runKmByWeek: [10, 20, 20, 20, 20, 20, 20, 20],
			maxHR: 190, restHR: 50, today: TODAY,
		})
		const ef = metrics.find(m => m.key === 'run-efficiency')!
		expect(ef.direction).toBe('improving')
		expect(ef.value).toBeGreaterThan(ef.previous!)
	})

	it('explains a missing efficiency reading rather than hiding it', () => {
		const { metrics } = runningProgress({
			activities: [run({ days: 5, km: 10, minutes: 50 })], // no HR
			runKmByWeek: [10], maxHR: null, restHR: 60, today: TODAY,
		})
		const ef = metrics.find(m => m.key === 'run-efficiency')!
		expect(ef.value).toBeNull()
		expect(ef.missing).toMatch(/heart rate/i)
	})

	it('has no data when nothing has been run', () => {
		expect(runningProgress({ activities: [], runKmByWeek: [], maxHR: null, restHR: 60, today: TODAY }).hasData).toBe(false)
	})
})

describe('gymProgress', () => {
	it('separates lifting more per session from simply training more often', () => {
		const workouts = [
			// previous period: two sessions at 5 t
			gym(40, 5000), gym(35, 5000),
			// current period: four sessions, still 5 t each — volume doubles,
			// but the work per session has not moved
			gym(20, 5000), gym(14, 5000), gym(7, 5000), gym(2, 5000),
		]
		const { metrics } = gymProgress(workouts, TODAY)
		expect(metrics.find(m => m.key === 'gym-volume')!.direction).toBe('improving')
		expect(metrics.find(m => m.key === 'gym-load-per-session')!.direction).toBe('holding')
		expect(metrics.find(m => m.key === 'gym-sessions')!.direction).toBe('improving')
	})

	it('tracks each split independently', () => {
		const workouts = [
			gym(40, 4000, 'Push'), gym(20, 6000, 'Push'),
			gym(40, 5000, 'Legs'), gym(20, 5000, 'Legs'),
		]
		const { splits } = gymProgress(workouts, TODAY)
		const push = splits.find(s => s.split === 'Push')!
		const legs = splits.find(s => s.split === 'Legs')!
		expect(push.direction).toBe('improving')
		expect(legs.direction).toBe('holding')
	})

	it('asks for load data instead of reporting zero', () => {
		const { metrics } = gymProgress([gym(5, 0)], TODAY)
		const perSession = metrics.find(m => m.key === 'gym-load-per-session')!
		expect(perSession.value).toBeNull()
		expect(perSession.missing).toMatch(/total load/i)
	})
})

describe('bodyProgress', () => {
	const weights = Array.from({ length: 60 }, (_, i) => ({
		date: daysAgo(59 - i),
		// drifting down from 85 to ~79, with a kilo of daily noise
		weight: 85 - (59 - i) * -0.1 + (i % 2 ? 0.5 : -0.5),
	}))

	it('smooths out day-to-day noise', () => {
		const { smoothed } = bodyProgress(weights, 78, TODAY)
		const rawSwing = Math.abs(weights[58].weight - weights[59].weight)
		const smoothSwing = Math.abs(smoothed[58].weight - smoothed[59].weight)
		expect(smoothSwing).toBeLessThan(rawSwing)
	})

	it('counts movement toward the goal as improvement, whichever way it lies', () => {
		const losing = [
			{ date: daysAgo(40), weight: 85 }, { date: daysAgo(35), weight: 85 },
			{ date: daysAgo(3), weight: 82 }, { date: daysAgo(1), weight: 82 },
		]
		expect(bodyProgress(losing, 78, TODAY).metrics[0].direction).toBe('improving')

		const gaining = [
			{ date: daysAgo(40), weight: 62 }, { date: daysAgo(35), weight: 62 },
			{ date: daysAgo(3), weight: 65 }, { date: daysAgo(1), weight: 65 },
		]
		expect(bodyProgress(gaining, 70, TODAY).metrics[0].direction).toBe('improving')
	})

	it('projects weeks to goal only when the trend points at it', () => {
		const towards = [
			{ date: daysAgo(PERIOD_DAYS + 1), weight: 84 }, { date: daysAgo(PERIOD_DAYS), weight: 84 },
			{ date: daysAgo(1), weight: 82 },
		]
		expect(bodyProgress(towards, 78, TODAY).weeksToGoal).toBeGreaterThan(0)

		const away = [
			{ date: daysAgo(PERIOD_DAYS + 1), weight: 80 }, { date: daysAgo(PERIOD_DAYS), weight: 80 },
			{ date: daysAgo(1), weight: 83 },
		]
		expect(bodyProgress(away, 78, TODAY).weeksToGoal).toBeNull()
	})

	it('handles having no weigh-ins at all', () => {
		const p = bodyProgress([], null, TODAY)
		expect(p.hasData).toBe(false)
		expect(p.metrics[0].value).toBeNull()
	})
})

describe('volumeRamp', () => {
	it('flags a sharp jump', () => {
		expect(volumeRamp([20, 20, 20, 20, 40]).verdict).toBe('sharp')
	})

	it('accepts a steady build', () => {
		expect(volumeRamp([20, 21, 22, 23, 25]).verdict).toBe('ok')
	})

	it('spots a deload', () => {
		expect(volumeRamp([40, 40, 40, 40, 10]).verdict).toBe('detraining')
	})

	it('says nothing without enough history', () => {
		expect(volumeRamp([20, 20]).verdict).toBe('unknown')
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

	it('toSpark scales to the peak and leaves all-zero alone', () => {
		expect(toSpark([1, 2, 4])).toEqual([25, 50, 100])
		expect(toSpark([0, 0])).toEqual([0, 0])
	})

	it('median averages the middle pair on even counts', () => {
		expect(median([1, 2, 3, 4])).toBe(2.5)
		expect(median([])).toBeNull()
	})

	it('sampleEvenly keeps the endpoints', () => {
		const out = sampleEvenly([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5)
		expect(out).toHaveLength(5)
		expect(out[0]).toBe(0)
		expect(out[4]).toBe(9)
	})
})
