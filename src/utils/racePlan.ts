/**
 * Race-day pacing: what to actually run on the day.
 *
 * A goal time is one number; racing it is a sequence of decisions, and nearly
 * every blown race is decided in the first two kilometres. So this turns the
 * goal into the splits you'd tape to your wrist, and — separately — says
 * whether your current fitness supports that goal at all.
 *
 * The goal time is a time *on the course*. Terrain is already baked into it
 * (a 2:30 on a hilly 30k demands a higher VDOT than 2:30 on the road), which is
 * why nothing here multiplies by a terrain factor a second time. What this
 * can't do is put the hills in the right places: without a course elevation
 * profile, every kilometre is treated as equally hard.
 *
 * Pure: no stores, no `new Date()` unless passed in.
 */
import { raceTimeOnCourse, fmtPace, fmtTime } from './vdot'

/**
 * How the effort is distributed.
 *
 * `negative` is the default because it's what almost everyone should do and
 * almost nobody does: start slower than goal pace, finish faster.
 */
export type RaceStrategy = 'even' | 'negative' | 'positive'

/**
 * How far the opening pace sits from the average, as a fraction. A negative
 * split of 1.5% over a half marathon is about 4 s/km either side of goal —
 * enough to matter, small enough to hold without staring at the watch.
 */
export const SPLIT_FRACTION = 0.015

export interface RaceSegment {
	/** 1-based. */
	index: number
	/** Distance at the end of this segment, metres. */
	atM: number
	/** Length of this segment, metres. The final one is short on odd distances. */
	lengthM: number
	/** Target pace through this segment, seconds per km. */
	paceSecPerKm: number
	/** Time for this segment alone, seconds. */
	splitSecs: number
	/** Cumulative time at the end of the segment, seconds. */
	elapsedSecs: number
}

export interface RacePlan {
	distanceM: number
	/** The time being paced for, seconds. */
	goalSecs: number
	strategy: RaceStrategy
	/** Average pace needed over the whole course, seconds per km. */
	avgPaceSecPerKm: number
	segments: RaceSegment[]
	/** Cumulative time at halfway, seconds — the split that tells you the truth. */
	halfwaySecs: number
	/**
	 * The pace to hold for the opening kilometres, as a [fast, slow] band in
	 * seconds per km. Going out faster than the fast end is the classic error.
	 */
	openingBand: [number, number]
}

/**
 * Pace at a fraction `x` through the race, as a multiple of average pace.
 *
 * A straight line in distance, so the mean over the race is exactly the
 * average — the splits add up to the goal without needing a fudge. `k` is
 * positive for a negative split: slower (a bigger sec/km number) at the start.
 */
function paceMultiplier(x: number, k: number): number {
	return 1 + k * (1 - 2 * x)
}

function splitFractionFor(strategy: RaceStrategy): number {
	if (strategy === 'negative') return SPLIT_FRACTION
	if (strategy === 'positive') return -SPLIT_FRACTION
	return 0
}

/** Kilometre splits below 10 km, 5 km blocks above — 30 rows of table is nobody's race plan. */
export function defaultSegmentM(distanceM: number): number {
	return distanceM <= 10000 ? 1000 : 5000
}

/**
 * Build the pacing plan for a goal time over a distance.
 *
 * Returns null for inputs that can't be paced (no distance, no goal).
 */
export function racePlan(
	distanceM: number,
	goalSecs: number,
	strategy: RaceStrategy = 'negative',
	segmentM = defaultSegmentM(distanceM),
): RacePlan | null {
	if (!(distanceM > 0) || !(goalSecs > 0) || !(segmentM > 0)) return null

	const avg = (goalSecs / distanceM) * 1000
	const k = splitFractionFor(strategy)

	const segments: RaceSegment[] = []
	let covered = 0
	let index = 0

	while (covered < distanceM - 1) {
		const lengthM = Math.min(segmentM, distanceM - covered)
		// Pace at the segment's midpoint. The multiplier is linear in distance,
		// so the midpoint value is the segment's exact average.
		const midFraction = (covered + lengthM / 2) / distanceM
		const paceSecPerKm = avg * paceMultiplier(midFraction, k)
		covered += lengthM
		index += 1
		segments.push({
			index,
			atM: covered,
			lengthM,
			paceSecPerKm,
			splitSecs: (lengthM / 1000) * paceSecPerKm,
			elapsedSecs: 0, // filled below
		})
	}

	if (!segments.length) return null

	// A short final segment pulls the distance-weighted mean off the goal by a
	// second or two. Scale every split so the plan lands exactly on the target —
	// a pacing chart that doesn't add up to the goal is worse than no chart.
	const rawTotal = segments.reduce((sum, s) => sum + s.splitSecs, 0)
	const scale = goalSecs / rawTotal
	let elapsed = 0
	for (const s of segments) {
		s.splitSecs *= scale
		s.paceSecPerKm *= scale
		elapsed += s.splitSecs
		s.elapsedSecs = elapsed
	}

	const openingPace = avg * paceMultiplier(0, k)
	return {
		distanceM,
		goalSecs,
		strategy,
		avgPaceSecPerKm: avg,
		segments,
		halfwaySecs: timeAt(segments, distanceM / 2, goalSecs),
		// A couple of seconds either side: a band you can hold, not a number to chase.
		openingBand: [openingPace - 3, openingPace + 3],
	}
}

/**
 * Cumulative time at an arbitrary point, interpolating inside whichever segment
 * contains it. Used for the halfway split, which rarely lands on a boundary.
 */
function timeAt(segments: RaceSegment[], atM: number, fallback: number): number {
	let before = 0
	for (const s of segments) {
		const startM = s.atM - s.lengthM
		if (atM <= s.atM) {
			const into = Math.max(0, atM - startM)
			return before + (into / s.lengthM) * s.splitSecs
		}
		before = s.elapsedSecs
	}
	return fallback
}

// ─── is the goal realistic? ───────────────────────────────────────────────────

export type GoalVerdict = 'ahead' | 'on-track' | 'stretch' | 'unrealistic' | 'unknown'

export interface GoalCheck {
	verdict: GoalVerdict
	/** What today's fitness predicts on this course, seconds. Null without a VDOT. */
	predictedSecs: number | null
	/** predicted − goal, seconds. Positive means the goal is faster than predicted. */
	deltaSecs: number | null
	message: string
}

/**
 * Bands are a percentage of the predicted time, not a flat number of seconds:
 * 60 seconds is a rounding error over 30 km and a disaster over 5 km.
 */
const STRETCH_PCT = 0.02
const UNREALISTIC_PCT = 0.06

/**
 * Whether the goal matches the fitness. Deliberately blunt — the point of
 * asking ten days out is to hear "that's 4 minutes faster than you can run"
 * while there's still time to pick a different number.
 */
export function checkGoal(
	distanceM: number,
	goalSecs: number,
	currentVdot: number | null,
	terrain?: number | null,
): GoalCheck {
	if (currentVdot === null || !(distanceM > 0) || !(goalSecs > 0)) {
		return {
			verdict: 'unknown',
			predictedSecs: null,
			deltaSecs: null,
			message: 'No fitness reading yet, so there is nothing to check the goal against.',
		}
	}

	const predicted = raceTimeOnCourse(currentVdot, distanceM, terrain)
	const delta = predicted - goalSecs
	const pct = delta / predicted

	if (pct <= -STRETCH_PCT) {
		return {
			verdict: 'ahead', predictedSecs: predicted, deltaSecs: delta,
			message: `Your fitness predicts ${fmtTime(predicted)} on this course — ${fmtTime(Math.abs(delta))} inside the goal. You could target something faster.`,
		}
	}
	if (pct <= STRETCH_PCT) {
		return {
			verdict: 'on-track', predictedSecs: predicted, deltaSecs: delta,
			message: `Your fitness predicts ${fmtTime(predicted)} on this course. The goal is right about where you are — it will come down to the day.`,
		}
	}
	if (pct <= UNREALISTIC_PCT) {
		return {
			verdict: 'stretch', predictedSecs: predicted, deltaSecs: delta,
			message: `Your fitness predicts ${fmtTime(predicted)}; the goal is ${fmtTime(delta)} faster. That's a stretch — reachable on a good day, and only if you pace it patiently.`,
		}
	}
	return {
		verdict: 'unrealistic', predictedSecs: predicted, deltaSecs: delta,
		message: `Your fitness predicts ${fmtTime(predicted)}; the goal is ${fmtTime(delta)} faster. Chasing it from the gun is how races fall apart — consider racing to ${fmtTime(predicted)} instead.`,
	}
}

// ─── race week ────────────────────────────────────────────────────────────────

export interface RaceWeekNote {
	/** Days until the race. 0 is race day. */
	daysOut: number
	title: string
	body: string
}

/**
 * The taper advice that actually changes behaviour, keyed to how close the race
 * is. Only the note for the current distance-out is shown, so it reads as one
 * instruction rather than a wall of generic advice.
 */
export function raceWeekNote(daysOut: number): RaceWeekNote | null {
	if (daysOut < 0 || daysOut > 14) return null
	if (daysOut === 0) {
		return {
			daysOut,
			title: 'Race day',
			body: 'Nothing you do today adds fitness. Eat what you have eaten before long runs, start slower than feels right, and trust the opening band.',
		}
	}
	if (daysOut === 1) {
		return {
			daysOut,
			title: 'Tomorrow',
			body: 'Twenty easy minutes with a few strides, or nothing at all. Lay kit out tonight so race morning is only logistics.',
		}
	}
	if (daysOut <= 6) {
		return {
			daysOut,
			title: 'Race week',
			body: `Volume drops to roughly half a normal week, intensity stays: short efforts at race pace keep you sharp without costing anything. Heavy legs on Wednesday are normal and pass by ${daysOut >= 4 ? 'the weekend' : 'race morning'}.`,
		}
	}
	return {
		daysOut,
		title: 'Taper',
		body: 'Cut weekly volume by about a quarter while keeping one quality session. The training is done — the only thing left to gain is freshness.',
	}
}

// ─── formatting ───────────────────────────────────────────────────────────────

/** "4:45–4:51" for a [fast, slow] band in seconds per km. */
export function fmtBand([fast, slow]: [number, number]): string {
	return `${fmtPace(fast)}–${fmtPace(slow)}`
}

/** "5 km", "21.1 km", "30 km" — segment boundaries read as distances, not metres. */
export function fmtKm(metres: number): string {
	const km = metres / 1000
	return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`
}
