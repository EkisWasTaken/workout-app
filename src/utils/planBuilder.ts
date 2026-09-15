/**
 * Training plan generation — a race date in, a schedule out.
 *
 * The plan carries *zones*, never paces. A generated session records
 * "Threshold" and the number is derived at render time from your current VDOT,
 * exactly like a hand-entered one (see `paceAdvice.ts`). So a plan built today
 * re-paces itself as you get fitter, and nothing has to be rewritten.
 *
 * What this is not: it will not out-think a coach. It encodes the handful of
 * rules that make most amateur plans work — progress volume gradually, back off
 * every fourth week, keep the easy days genuinely easy, put the hard days where
 * they don't collide with the rest of your life, and taper.
 *
 * Pure: no database, no stores, no clock of its own.
 */
import { addDays, differenceInCalendarDays, format, getDay, parseISO, startOfWeek } from 'date-fns'

export type Phase = 'base' | 'build' | 'peak' | 'taper'

export const PHASE_LABELS: Record<Phase, string> = {
	base: 'Base',
	build: 'Build',
	peak: 'Peak',
	taper: 'Taper',
}

export type SessionKind = 'long' | 'quality' | 'easy' | 'recovery' | 'race'

export interface PlannedSession {
	date: string
	name: string
	/** Always a run. Gym days are the user's own and are never touched. */
	type: 'Running'
	/** The zone label written to `targetPace`; the pace itself is derived later. */
	zone: string
	distanceKm?: number
	durationMin?: number
	notes?: string
	kind: SessionKind
}

export interface PlannedWeek {
	/** 1-based, counting from the first week of the plan. */
	index: number
	/** Monday of the week. */
	startDate: string
	phase: Phase
	/** Planned kilometres for the week. */
	targetKm: number
	/** A deliberate step back, every fourth week. */
	deload: boolean
	sessions: PlannedSession[]
}

export interface TrainingPlan {
	weeks: PlannedWeek[]
	raceDate: string
	raceName: string
	totalKm: number
	/** Biggest week in the plan, km. */
	peakKm: number
}

export interface PlanInput {
	/** Any date in the first week; the plan starts from that week's Monday. */
	startDate: string
	raceDate: string
	raceName: string
	distanceM: number
	/** Runs per week, including the long run. */
	runsPerWeek: number
	/** Weekly volume you can comfortably handle today, km. */
	startKm: number
	/** Biggest week the plan should reach, km. */
	peakKm: number
	/** 0 = Sunday … 6 = Saturday, matching date-fns `getDay`. */
	longRunDay: number
	/**
	 * Days that must stay easy — typically gym days. Hard running is kept off
	 * them; an easy run alongside a lift is fine.
	 */
	easyOnlyDays?: number[]
}

/** Below this there isn't enough room for a progression worth the name. */
export const MIN_WEEKS = 4
/** Long runs stop being productive somewhere around here, whatever the race. */
export const MAX_LONG_RUN_KM = 35
/** Every fourth week steps back, so fatigue doesn't accumulate unchecked. */
export const DELOAD_EVERY = 4
const DELOAD_FACTOR = 0.82

/** Taper length: longer races need longer to shed the fatigue. */
export function taperWeeks(distanceM: number): number {
	if (distanceM >= 30000) return 3
	if (distanceM >= 15000) return 2
	return 1
}

/**
 * How much of the week the long run may take. Beyond about a third, the long
 * run stops being one session in a week and becomes the week.
 */
const LONG_RUN_SHARE = 0.32
/** A quality session, warm-up and cool-down included. */
const QUALITY_SHARE = 0.2

/** The longest single run the race distance justifies. */
export function longRunCapKm(distanceM: number): number {
	const km = distanceM / 1000
	if (km <= 10) return Math.min(km * 2, MAX_LONG_RUN_KM)
	if (km <= 21.1) return Math.min(km * 0.95, MAX_LONG_RUN_KM)
	return Math.min(km * 0.85, MAX_LONG_RUN_KM)
}

// ─── week structure ───────────────────────────────────────────────────────────

/**
 * Which days of the week to run on.
 *
 * Runs are spread as evenly as the count allows, anchored on the long run.
 * Returns days as 0–6, long run first. At five runs a week or more the day
 * before the long run is usually one of them — that's normal, it's an easy day.
 */
export function runDays(runsPerWeek: number, longRunDay: number): number[] {
	const n = Math.max(1, Math.min(7, Math.round(runsPerWeek)))
	const offsets = Array.from({ length: n }, (_, i) => Math.round((i * 7) / n))
	const days = offsets.map(o => (longRunDay + o) % 7)
	// Rounding can collide on some counts; fill any gap with the first free day.
	const seen = new Set<number>()
	const out: number[] = []
	for (const d of days) {
		let day = d
		while (seen.has(day)) day = (day + 1) % 7
		seen.add(day)
		out.push(day)
	}
	return out
}

/**
 * Pick which of the running days carry the hard sessions.
 *
 * Two constraints, in this order of importance:
 *
 *   1. Never the day after the long run. Intervals on legs that ran 25 km
 *      yesterday buy nothing and cost a week.
 *   2. Prefer days the athlete doesn't already lift on. This one is a
 *      preference, not a rule — on a five-run week with three gym days there
 *      often isn't a clean day left, and a tempo after a Pull session is a
 *      normal thing to do.
 *
 * Both are dropped before the session is: a plan with no hard running isn't a
 * plan.
 */
export function qualityDays(days: number[], longRunDay: number, count: number, easyOnly: number[] = []): number[] {
	if (count <= 0) return []
	const candidates = days.filter(d => d !== longRunDay)
	const dayAfterLong = (longRunDay + 1) % 7
	const gap = (d: number) => Math.min((d - longRunDay + 7) % 7, (longRunDay - d + 7) % 7)

	// Furthest from the long run first, so the week's hard days sit apart.
	const rank = (pool: number[]) => [...pool].sort((a, b) => gap(b) - gap(a) || a - b)

	const fresh = candidates.filter(d => d !== dayAfterLong)
	const tiers = [
		rank(fresh.filter(d => !easyOnly.includes(d))),
		rank(fresh.filter(d => easyOnly.includes(d))),
		rank(candidates.filter(d => d === dayAfterLong)),
	]
	const picked = tiers.flat().slice(0, count)
	return picked.sort((a, b) => a - b)
}

/** How many hard sessions a phase carries. */
export function qualityCount(phase: Phase, runsPerWeek: number): number {
	if (runsPerWeek <= 2) return phase === 'base' ? 0 : 1
	if (phase === 'base') return 1
	if (phase === 'taper') return 1
	return runsPerWeek >= 5 ? 2 : 1
}

// ─── volume ───────────────────────────────────────────────────────────────────

/**
 * Weekly volume across the plan.
 *
 * Builds linearly from `startKm` to `peakKm` over everything before the taper,
 * drops every fourth week, then sheds volume through the taper. The last week
 * is the race itself and stays small.
 */
export function weeklyVolumes(totalWeeks: number, startKm: number, peakKm: number, taper: number): number[] {
	const buildWeeks = Math.max(1, totalWeeks - taper)
	const out: number[] = []

	for (let i = 0; i < buildWeeks; i++) {
		const t = buildWeeks === 1 ? 1 : i / (buildWeeks - 1)
		const base = startKm + (peakKm - startKm) * t
		const isDeload = (i + 1) % DELOAD_EVERY === 0 && i !== buildWeeks - 1
		out.push(base * (isDeload ? DELOAD_FACTOR : 1))
	}

	// Taper: roughly 75%, 55%, 40% of peak, always ending on the smallest.
	const taperFactors = [0.75, 0.55, 0.4].slice(0, taper)
	for (const f of taperFactors.slice(0, taper)) out.push(peakKm * f)

	return out.map(km => Math.round(km * 2) / 2)
}

export function isDeloadWeek(index: number, totalWeeks: number, taper: number): boolean {
	const buildWeeks = Math.max(1, totalWeeks - taper)
	return index % DELOAD_EVERY === 0 && index !== buildWeeks && index <= buildWeeks
}

/** Which phase a week belongs to. `index` is 1-based. */
export function phaseFor(index: number, totalWeeks: number, taper: number): Phase {
	const buildWeeks = Math.max(1, totalWeeks - taper)
	if (index > buildWeeks) return 'taper'
	// The last third before the taper is the peak; the first third is base.
	if (index > Math.round(buildWeeks * 0.7)) return 'peak'
	if (index <= Math.round(buildWeeks * 0.35)) return 'base'
	return 'build'
}

// ─── sessions ─────────────────────────────────────────────────────────────────

const round5 = (km: number) => Math.round(km * 2) / 2

/**
 * The hard session for a given phase and slot.
 *
 * Base earns speed with strides on an easy run — no real intensity until
 * there's a base to hang it on. Build alternates threshold and VO₂. Peak trades
 * VO₂ for race-pace work, because by then the specific thing matters more than
 * the general one. Taper keeps one short sharpener.
 */
function qualitySession(phase: Phase, slot: number, weekIndex: number, km: number, raceName: string): {
	name: string; zone: string; notes: string
} {
	const reps = Math.max(3, Math.min(6, Math.round(km / 1.6)))
	if (phase === 'base') {
		return {
			name: 'Easy run + strides',
			zone: 'Easy',
			notes: `Easy throughout. Finish with 6 × 20 seconds fast and relaxed, walking back between each. These are form work, not a workout.`,
		}
	}
	if (phase === 'taper') {
		return {
			name: 'Race-pace sharpener',
			zone: 'Race pace',
			notes: `2 km easy warm-up. 3 × 1 km at ${raceName} pace with 2 minutes easy jog. 2 km easy cool-down. This should feel controlled — you are rehearsing, not testing.`,
		}
	}
	// Alternate the two hard slots so a week never doubles up on the same stimulus.
	const wantsThreshold = (slot + weekIndex) % 2 === 0
	if (phase === 'peak' && !wantsThreshold) {
		return {
			name: 'Race-pace intervals',
			zone: 'Race pace',
			notes: `2 km easy warm-up. ${Math.max(3, reps - 1)} × 2 km at ${raceName} pace with 90 seconds easy jog. 2 km easy cool-down.`,
		}
	}
	if (wantsThreshold) {
		return {
			name: 'Threshold intervals',
			zone: 'Threshold',
			notes: `2 km easy warm-up. ${reps} × 1 km at threshold with 90 seconds easy jog. 2 km easy cool-down. Threshold is comfortably hard — you could speak a sentence, not hold a conversation.`,
		}
	}
	return {
		name: 'VO₂ max intervals',
		zone: 'VO₂ max',
		notes: `2 km easy warm-up. ${Math.max(4, reps)} × 3 minutes hard with 3 minutes easy jog. 2 km easy cool-down. Hard means the last rep is a fight.`,
	}
}

/** Build one week's sessions. */
function buildWeek(
	weekIndex: number,
	monday: Date,
	phase: Phase,
	targetKm: number,
	input: PlanInput,
	raceDay: string,
): PlannedSession[] {
	const days = runDays(input.runsPerWeek, input.longRunDay)
	const quality = qualityDays(days, input.longRunDay, qualityCount(phase, input.runsPerWeek), input.easyOnlyDays)

	const longCap = longRunCapKm(input.distanceM)
	const taperShrink = phase === 'taper' ? 0.6 : 1
	const longKm = round5(Math.min(targetKm * LONG_RUN_SHARE * taperShrink, longCap))
	const qualityKm = round5(targetKm * QUALITY_SHARE)

	const easyDays = days.filter(d => d !== input.longRunDay && !quality.includes(d))
	const easyTotal = Math.max(0, targetKm - longKm - qualityKm * quality.length)
	const easyKm = easyDays.length ? round5(easyTotal / easyDays.length) : 0

	const sessions: PlannedSession[] = []
	// Monday-started week: day 0 (Sunday) belongs at the end.
	const dayOffset = (d: number) => (d + 6) % 7

	for (const d of days) {
		const date = format(addDays(monday, dayOffset(d)), 'yyyy-MM-dd')

		// The race replaces whatever was planned that day, and race week's
		// remaining days fall after the finish line — the plan ends there.
		if (date >= raceDay) continue

		if (d === input.longRunDay) {
			sessions.push({
				date, type: 'Running', kind: 'long',
				name: phase === 'taper' ? 'Long run (taper)' : 'Long run',
				zone: 'Easy',
				distanceKm: longKm,
				notes: phase === 'peak'
					? 'Steady and controlled. Practise your race-day breakfast and drinks on this one.'
					: 'Conversational the whole way. If the last few kilometres are a grind, it was too fast.',
			})
			continue
		}

		if (quality.includes(d)) {
			const q = qualitySession(phase, quality.indexOf(d), weekIndex, qualityKm, input.raceName)
			sessions.push({
				date, type: 'Running', kind: 'quality',
				name: q.name, zone: q.zone, distanceKm: qualityKm, notes: q.notes,
			})
			continue
		}

		// The day after the long run is a recovery jog, never an easy run.
		const isAfterLong = dayOffset(d) === (dayOffset(input.longRunDay) + 1) % 7
		sessions.push({
			date, type: 'Running', kind: isAfterLong ? 'recovery' : 'easy',
			name: isAfterLong ? 'Recovery run' : 'Easy run',
			zone: isAfterLong ? 'Recovery' : 'Easy',
			distanceKm: easyKm,
			notes: isAfterLong
				? 'Deliberately slow. This exists to move blood through tired legs, nothing more.'
				: undefined,
		})
	}

	return sessions.sort((a, b) => a.date.localeCompare(b.date))
}

// ─── the plan ─────────────────────────────────────────────────────────────────

export interface PlanProblem {
	field: 'weeks' | 'volume' | 'runsPerWeek'
	message: string
}

/** Everything wrong with the inputs, in plain language. Empty means buildable. */
export function planProblems(input: PlanInput): PlanProblem[] {
	const problems: PlanProblem[] = []
	const weeks = planWeekCount(input)

	if (weeks < MIN_WEEKS) {
		problems.push({
			field: 'weeks',
			message: `Only ${weeks} week${weeks === 1 ? '' : 's'} until race day — too short to build anything. Pick an earlier start or a later race.`,
		})
	}
	if (!(input.startKm > 0) || !(input.peakKm > 0)) {
		problems.push({ field: 'volume', message: 'Set both a current and a peak weekly distance.' })
	} else if (input.peakKm < input.startKm) {
		problems.push({
			field: 'volume',
			message: 'Peak weekly distance is below where you are now — the plan would ask you to detrain.',
		})
	} else if (input.peakKm > input.startKm * 2.2) {
		problems.push({
			field: 'volume',
			message: `Going from ${input.startKm} to ${input.peakKm} km a week is more than doubling your volume. That is how people get injured — aim for roughly 1.5×.`,
		})
	}
	if (input.runsPerWeek < 2 || input.runsPerWeek > 7) {
		problems.push({ field: 'runsPerWeek', message: 'Pick between 2 and 7 runs a week.' })
	}
	return problems
}

/** Whole weeks from the plan's first Monday to race week, inclusive. */
export function planWeekCount(input: PlanInput): number {
	const monday = startOfWeek(parseISO(input.startDate), { weekStartsOn: 1 })
	const race = parseISO(input.raceDate)
	return Math.max(0, Math.floor(differenceInCalendarDays(race, monday) / 7) + 1)
}

/**
 * Generate the plan. Returns null when the inputs can't produce one — call
 * `planProblems` first to find out why.
 */
export function buildPlan(input: PlanInput): TrainingPlan | null {
	if (planProblems(input).length) return null

	const totalWeeks = planWeekCount(input)
	const taper = Math.min(taperWeeks(input.distanceM), totalWeeks - 1)
	const volumes = weeklyVolumes(totalWeeks, input.startKm, input.peakKm, taper)
	const firstMonday = startOfWeek(parseISO(input.startDate), { weekStartsOn: 1 })

	const weeks: PlannedWeek[] = []
	for (let i = 0; i < totalWeeks; i++) {
		const monday = addDays(firstMonday, i * 7)
		const index = i + 1
		const phase = phaseFor(index, totalWeeks, taper)
		const targetKm = volumes[i]
		const isRaceWeek = index === totalWeeks

		const sessions = buildWeek(index, monday, phase, targetKm, input, input.raceDate)

		if (isRaceWeek) {
			sessions.push({
				date: input.raceDate,
				type: 'Running',
				kind: 'race',
				name: input.raceName,
				zone: 'Race pace',
				distanceKm: Math.round((input.distanceM / 1000) * 10) / 10,
				notes: 'Race day. Start in the opening band from your race plan and let the second half take care of itself.',
			})
			sessions.sort((a, b) => a.date.localeCompare(b.date))
		}

		weeks.push({
			index,
			startDate: format(monday, 'yyyy-MM-dd'),
			phase,
			targetKm,
			deload: isDeloadWeek(index, totalWeeks, taper),
			sessions,
		})
	}

	const totalKm = weeks.reduce(
		(sum, w) => sum + w.sessions.reduce((s, x) => s + (x.distanceKm || 0), 0), 0)

	return {
		weeks,
		raceDate: input.raceDate,
		raceName: input.raceName,
		totalKm: Math.round(totalKm),
		peakKm: Math.max(...weeks.map(w => w.targetKm)),
	}
}

/** Sessions across every week, flattened — what actually gets written to the schedule. */
export function planSessions(plan: TrainingPlan): PlannedSession[] {
	return plan.weeks.flatMap(w => w.sessions)
}

/** `getDay` numbering, Monday first, for day pickers. */
export const WEEKDAYS = [
	{ value: 1, label: 'Monday' },
	{ value: 2, label: 'Tuesday' },
	{ value: 3, label: 'Wednesday' },
	{ value: 4, label: 'Thursday' },
	{ value: 5, label: 'Friday' },
	{ value: 6, label: 'Saturday' },
	{ value: 0, label: 'Sunday' },
] as const

/** Day-of-week of a date string, for pre-filling the long-run day from a race. */
export const dayOfWeek = (date: string) => getDay(parseISO(date))
