/**
 * Repairing a heart-rate stream before anything reads it.
 *
 * A recorded HR stream is never the clean line the watch shows you afterwards:
 *
 *   · **Sparse sampling.** Apple Watch (via HealthFit) and most chest-strap
 *     bridges log HR every 3–10 s while GPS goes every second, so a stream
 *     that keeps one row per GPS sample is mostly `null` in the HR column.
 *     Drawn raw that comes out as a dotted, stuttering line that looks like
 *     the monitor cut out for most of the run.
 *   · **Dropouts.** An optical sensor that loses contact emits 0, or a value
 *     far below anything a living person is doing, for a few samples.
 *   · **Spikes.** Cadence lock and a loose strap give single samples 40–60 bpm
 *     clear of their neighbours — enough to flatten a whole chart's y-scale and
 *     to drag a run's max HR (and therefore every zone in the app) upwards.
 *
 * So this is the one place that decides what a plausible beat is, drops the
 * rest, and bridges the short gaps that sparse logging leaves. Charts, the
 * zone bar and Relative Effort all read the repaired stream, which is why they
 * can't disagree about the same run any more.
 */

/** Below this, the sensor lost you rather than you being unusually relaxed. */
export const HR_MIN = 30
/** Above this it's cadence lock or interference, not a heart. */
export const HR_MAX = 235

/**
 * Longest silence to bridge, seconds. Sparse logging leaves a handful of
 * seconds; a strap that genuinely fell off leaves minutes, and a straight line
 * across those would invent effort that never happened.
 */
export const MAX_BRIDGE_SECS = 45

/** A lone sample this far from both neighbours is a spike, not a heart rate. */
const SPIKE_JUMP = 35

export interface CleanHrOptions {
	/** Seconds of gap to interpolate across. Default {@link MAX_BRIDGE_SECS}. */
	maxBridgeSecs?: number
	/** Trailing-mean window, seconds. 0 (default) leaves the shape untouched. */
	smoothSecs?: number
}

const plausible = (v: number | null | undefined): v is number =>
	v !== null && v !== undefined && Number.isFinite(v) && v >= HR_MIN && v <= HR_MAX

/**
 * Drop implausible samples and lone spikes, then linearly bridge gaps shorter
 * than `maxBridgeSecs`. `time` is elapsed seconds, one entry per `hr` entry.
 *
 * Returns a new array the same length as the input. Anything still `null`
 * afterwards is a real gap in the recording.
 */
export function cleanHeartrate(
	time: number[],
	hr: (number | null | undefined)[],
	options: CleanHrOptions = {},
): (number | null)[] {
	const { maxBridgeSecs = MAX_BRIDGE_SECS, smoothSecs = 0 } = options
	const n = Math.min(time.length, hr.length)
	const out: (number | null)[] = new Array(n).fill(null)
	for (let i = 0; i < n; i++) if (plausible(hr[i])) out[i] = hr[i] as number

	// Spike rejection: a sample far above *and* far below what surrounds it is
	// the sensor, not you. Both neighbours have to disagree, so a genuine surge
	// into an interval — where the samples after it stay high — survives.
	const known = out.map(v => v)
	for (let i = 0; i < n; i++) {
		const v = known[i]
		if (v === null) continue
		const prev = prevKnown(known, i)
		const next = nextKnown(known, i)
		if (prev === null || next === null) continue
		if (Math.abs(v - prev) > SPIKE_JUMP && Math.abs(v - next) > SPIKE_JUMP) out[i] = null
	}

	bridge(time, out, maxBridgeSecs)
	return smoothSecs > 0 ? smoothTrailing(time, out, smoothSecs) : out
}

function prevKnown(vals: (number | null)[], i: number): number | null {
	for (let j = i - 1; j >= 0; j--) if (vals[j] !== null) return vals[j]
	return null
}

function nextKnown(vals: (number | null)[], i: number): number | null {
	for (let j = i + 1; j < vals.length; j++) if (vals[j] !== null) return vals[j]
	return null
}

/** Linear fill between known values, in place, for gaps under `maxSecs`. */
function bridge(time: number[], vals: (number | null)[], maxSecs: number) {
	let lastIdx = -1
	for (let i = 0; i < vals.length; i++) {
		if (vals[i] === null) continue
		if (lastIdx >= 0 && i - lastIdx > 1 && time[i] - time[lastIdx] <= maxSecs) {
			const a = vals[lastIdx]!, b = vals[i]!
			const span = time[i] - time[lastIdx]
			for (let j = lastIdx + 1; j < i; j++) {
				const f = span > 0 ? (time[j] - time[lastIdx]) / span : 0
				vals[j] = a + (b - a) * f
			}
		}
		lastIdx = i
	}
}

/** Mean over a trailing time window — takes the fuzz off without shifting peaks much. */
function smoothTrailing(time: number[], vals: (number | null)[], windowSecs: number): (number | null)[] {
	const out: (number | null)[] = []
	let lo = 0, sum = 0, cnt = 0
	for (let i = 0; i < vals.length; i++) {
		const v = vals[i]
		if (v !== null) { sum += v; cnt++ }
		while (lo < i && time[i] - time[lo] > windowSecs) {
			const old = vals[lo]
			if (old !== null) { sum -= old; cnt-- }
			lo++
		}
		out.push(v !== null && cnt > 0 ? sum / cnt : null)
	}
	return out
}

export interface HrSummary {
	avg: number
	min: number
	max: number
	/** Share of the recording that has a usable beat, 0–1. */
	coverage: number
}

/**
 * Average, range and coverage of a repaired stream, weighted by the time each
 * sample covers — the streams are downsampled unevenly, so a plain mean over
 * samples would over-weight whichever stretch the device logged most densely.
 */
export function summariseHeartrate(time: number[], hr: (number | null)[]): HrSummary | null {
	const n = Math.min(time.length, hr.length)
	if (n < 2) return null
	let weighted = 0, secs = 0, covered = 0
	let min = Infinity, max = -Infinity
	for (let i = 1; i < n; i++) {
		const dt = time[i] - time[i - 1]
		if (dt <= 0 || dt > 60) continue
		secs += dt
		const v = hr[i]
		if (v === null || v === undefined) continue
		covered += dt
		weighted += v * dt
		if (v < min) min = v
		if (v > max) max = v
	}
	if (!covered || !secs) return null
	return {
		avg: weighted / covered,
		min,
		max,
		coverage: covered / secs,
	}
}
