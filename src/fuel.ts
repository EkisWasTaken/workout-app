/**
 * The fuel plan, as a thing the rest of the app can read cheaply.
 *
 * The planner dialog computes a plan from what you type into it. Everything
 * else — a day cell on the calendar, the card on Home, last week's review —
 * needs the same numbers without a dialog, on every render, for any date. So
 * the plan is built **once** into a date-keyed map and looked up from there.
 * Nothing on a calendar cell does arithmetic; a month of cells is a month of
 * `Map.get` calls.
 *
 * Why a composable rather than a module singleton like `stats.ts`: the schedule
 * page and Home load their workouts and weigh-ins from different places, and
 * the schedule page deliberately never loads the Home statistics store. Passing
 * the sources in means one implementation serves both without either page
 * fetching data twice.
 *
 * **Reviewing a past week** needs a target for a week the forward plan doesn't
 * cover. Rather than projecting backwards — which would compound the plan's
 * own errors into the thing meant to measure them — each past week is re-solved
 * from the weight you actually were on that Monday. The question it answers is
 * "given where you stood and where you're going, what did that week ask for",
 * which is the only version worth grading yourself against.
 */
import { computed, type Ref } from 'vue'
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import { settings, bodyStats } from './settings'
import {
	buildEnergyPlan, energySport,
	type EnergyDay, type EnergyPlan, type EnergySession, type EnergyWeek,
} from './utils/energy'
import { fuelTrend, reviewFuelWeek, WEIGH_IN_WINDOW_DAYS, type FuelWeekReview, type LoggedSession } from './utils/fuelReview'
import { trendWeightAt, weightTrend } from './utils/progress'
import type { DailyWeight, Workout } from './types'

/** How far ahead to plan when the calendar doesn't reach further itself. */
export const DEFAULT_HORIZON_WEEKS = 12
/** A hard ceiling, so a goal five years out can't build a five-year table. */
export const MAX_HORIZON_WEEKS = 52
/** How many completed weeks the review looks back over. */
export const REVIEW_WEEKS = 4

/** Why there are no numbers to show, when there aren't. */
export type FuelBlocked = 'stats' | 'weight' | null

export interface FuelSources {
	workouts: Ref<Workout[]>
	dailyWeights: Ref<DailyWeight[]>
	/**
	 * The workout's real sport, where the caller can do better than the typed
	 * `type` column — a linked recording knows what it was.
	 */
	sportOf?: (w: Workout) => string
	/** Actual distance covered, where a recording says so. */
	kmOf?: (w: Workout) => number | undefined
	/**
	 * Calories the watch reported, and over how many minutes. A completed run
	 * that has them is priced from them instead of from the plan.
	 */
	recordedOf?: (w: Workout) => { kcal: number; minutes: number } | undefined
	/**
	 * The date the goal weight is wanted by — your next race, normally. Without
	 * one the deadline is twelve weeks out, which is far enough to keep the
	 * implied rate sane and near enough to mean something.
	 */
	goalDate?: Ref<string | null>
	today?: Ref<Date>
}

export function useFuelPlan(src: FuelSources) {
	const today = computed(() => src.today?.value ?? new Date())
	const todayISO = computed(() => format(today.value, 'yyyy-MM-dd'))
	const monday = computed(() => startOfWeek(today.value, { weekStartsOn: 1 }))
	const mondayISO = computed(() => format(monday.value, 'yyyy-MM-dd'))

	// ─── inputs ───────────────────────────────────────────────────────────────

	/** The weigh-in trend, computed once; every weight question reads from it. */
	const smoothed = computed(() => weightTrend(
		[...src.dailyWeights.value]
			.filter(w => Number.isFinite(w.weight) && w.weight > 0)
			.sort((a, b) => a.date.localeCompare(b.date))))

	const currentWeightKg = computed(() => smoothed.value[smoothed.value.length - 1]?.weight ?? null)

	/**
	 * Every session on the calendar, priced. Rest days cost nothing and are left
	 * out; the day still gets a target, it just has no training in it.
	 */
	const allSessions = computed<LoggedSession[]>(() =>
		src.workouts.value.flatMap(w => {
			const sport = energySport(src.sportOf?.(w) ?? w.type, w.name)
			if (!sport) return []
			const recorded = w.isCompleted === 1 ? src.recordedOf?.(w) : undefined
			return [{
				date: w.date,
				sport,
				km: w.distance ?? null,
				durationMin: w.duration ?? null,
				done: w.isCompleted === 1,
				actualKm: src.kmOf?.(w) ?? w.distance ?? null,
				actualMin: w.actualDuration ?? w.duration ?? null,
				recordedKcal: recorded?.kcal ?? null,
				recordedMin: recorded?.minutes ?? null,
			}]
		}))

	/**
	 * What the targets are built from: the plan, except where a finished run has
	 * a recording, which is priced from what actually happened — so a 10 km
	 * plan that became 14 km raises that day's target.
	 */
	const plannedSessions = computed<EnergySession[]>(() =>
		allSessions.value.map(s => s.recordedKcal
			? {
				date: s.date, sport: s.sport, km: s.actualKm ?? s.km, durationMin: s.actualMin ?? s.durationMin,
				recordedKcal: s.recordedKcal, recordedMin: s.recordedMin,
			}
			: { date: s.date, sport: s.sport, km: s.km, durationMin: s.durationMin }))

	const defaultDeadline = computed(() => format(addWeeks(monday.value, DEFAULT_HORIZON_WEEKS), 'yyyy-MM-dd'))

	/**
	 * When the goal weight is wanted by. This is what sets the rate, and so
	 * every number on every day — which is why the planner dialog is handed the
	 * same date rather than picking its own. Two screens quoting different
	 * calorie targets for the same Tuesday is worse than either being wrong.
	 */
	const goalDate = computed(() => {
		const race = src.goalDate?.value
		return race && race > todayISO.value ? race : defaultDeadline.value
	})

	/**
	 * Where the plan runs to. At least to the deadline, further if the calendar
	 * reaches further, and never past the ceiling.
	 */
	const horizonEnd = computed(() => {
		const latest = src.workouts.value.reduce((max, w) => (w.date > max ? w.date : max), '')
		const ceiling = format(addWeeks(monday.value, MAX_HORIZON_WEEKS), 'yyyy-MM-dd')
		const end = [latest, defaultDeadline.value, goalDate.value].reduce((a, b) => (b > a ? b : a))
		return end > ceiling ? ceiling : end
	})

	/**
	 * With no goal weight set this is a maintenance plan rather than nothing:
	 * "what should I eat today" is a fair question whether or not you want the
	 * number on the scale to move.
	 */
	const goalWeightKg = computed(() => settings.goalWeight ?? currentWeightKg.value)

	const blocked = computed<FuelBlocked>(() => {
		if (currentWeightKg.value === null) return 'weight'
		if (!bodyStats.value) return 'stats'
		return null
	})

	/**
	 * The common half of a plan request; only the dates and weight differ.
	 *
	 * The seed weight is rounded to the tenth a scale actually reads. The trend
	 * carries two decimals, and planning from 79.97 while the planner dialog
	 * shows you 80.0 puts a five-calorie disagreement between two screens for no
	 * gain — precision that isn't real is worse than none.
	 */
	function planInput(startDate: string, endDate: string, seedWeightKg: number) {
		const stats = bodyStats.value!
		const startWeightKg = Math.round(seedWeightKg * 10) / 10
		return {
			startWeightKg,
			goalWeightKg: goalWeightKg.value ?? seedWeightKg,
			heightCm: stats.heightCm,
			age: stats.age,
			sex: stats.sex,
			activityLevel: stats.activityLevel,
			startDate,
			endDate,
			targetDate: goalDate.value,
			sessions: plannedSessions.value,
		}
	}

	// ─── the forward plan ─────────────────────────────────────────────────────

	const plan = computed<EnergyPlan | null>(() => {
		if (blocked.value) return null
		return buildEnergyPlan(planInput(mondayISO.value, horizonEnd.value, currentWeightKg.value!))
	})

	/** Date → that day's targets. The whole point of this module. */
	const dayTargets = computed(() => {
		const map = new Map<string, EnergyDay>()
		for (const w of plan.value?.weeks ?? []) {
			for (const d of w.days) map.set(d.date, d)
		}
		return map
	})

	/** Monday → that week's plan, for the week view's summary line. */
	const weekTargets = computed(() => {
		const map = new Map<string, EnergyWeek>()
		for (const w of plan.value?.weeks ?? []) map.set(w.startDate, w)
		return map
	})

	const dayFuel = (date: string): EnergyDay | null => dayTargets.value.get(date) ?? null
	const todayFuel = computed(() => dayFuel(todayISO.value))
	const thisWeek = computed(() => weekTargets.value.get(mondayISO.value) ?? null)

	// ─── looking back ─────────────────────────────────────────────────────────

	/**
	 * What a past week asked for, re-solved from the weight you actually were on
	 * its Monday. One week is built, not a whole plan: the rate still comes from
	 * the real target date, so the answer matches what the plan would have said.
	 */
	function retroWeek(weekStart: string): EnergyWeek | null {
		if (blocked.value) return null
		const at = trendWeightAt(smoothed.value, weekStart, WEIGH_IN_WINDOW_DAYS)
		if (at === null) return null
		const end = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')
		return buildEnergyPlan(planInput(weekStart, end, at))?.weeks[0] ?? null
	}

	/** Review of the week containing `anchor`. Null when it can't be graded. */
	function reviewWeek(weekStart: string): FuelWeekReview | null {
		const week = weekStart === mondayISO.value ? thisWeek.value : retroWeek(weekStart)
		if (!week) return null
		const end = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')

		// A week still running is graded only as far as today.
		const throughDay = weekStart === mondayISO.value
			? Math.round((parseISO(todayISO.value).getTime() - parseISO(weekStart).getTime()) / 86_400_000)
			: 6
		const measureTo = throughDay >= 6 ? end : todayISO.value

		return reviewFuelWeek({
			week,
			sessions: allSessions.value.filter(s => s.date >= weekStart && s.date <= end),
			startWeightKg: trendWeightAt(smoothed.value, weekStart, WEIGH_IN_WINDOW_DAYS),
			endWeightKg: trendWeightAt(smoothed.value, measureTo, WEIGH_IN_WINDOW_DAYS),
			throughDay,
		})
	}

	/** The last completed week, which is the one worth reading on a Monday. */
	const lastWeek = computed(() => reviewWeek(format(addWeeks(monday.value, -1), 'yyyy-MM-dd')))

	/** The last few completed weeks, oldest first, and what they say together. */
	const recentWeeks = computed<FuelWeekReview[]>(() => {
		if (blocked.value) return []
		const out: FuelWeekReview[] = []
		for (let i = REVIEW_WEEKS; i >= 1; i--) {
			const r = reviewWeek(format(addWeeks(monday.value, -i), 'yyyy-MM-dd'))
			if (r) out.push(r)
		}
		return out
	})

	const trend = computed(() => fuelTrend(recentWeeks.value))

	return {
		blocked,
		plan,
		currentWeightKg,
		goalWeightKg,
		goalDate,
		horizonEnd,
		dayFuel,
		todayFuel,
		thisWeek,
		weekTargets,
		reviewWeek,
		lastWeek,
		recentWeeks,
		trend,
	}
}

export type FuelPlanStore = ReturnType<typeof useFuelPlan>
