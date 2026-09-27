/**
 * Turning a pile of GPS tracks into an actual heat map.
 *
 * The all-routes map used to draw every route at 22% opacity and let the
 * overlaps stack: run a street twenty times and twenty translucent lines pile up
 * until it looks bright. That reads as *something*, but it can't be measured —
 * alpha saturates, so by about eight passes a street is as bright as it will
 * ever get, and a road you've run 10 times looks identical to one you've run
 * 200. It also means "how often" is encoded in a channel the eye is bad at
 * comparing across a map.
 *
 * So: bin every point into a fixed ground grid, count how many *separate
 * activities* touched each cell, and give each stretch of route a level on a
 * cold-to-warm ramp. Twenty passes is now a colour, not a stack.
 *
 * Everything here is pure and coordinate-only — no Leaflet, no DOM — so the
 * binning can be unit-tested and the drawing stays in the component.
 */

/** Ground size of one heat cell, metres. About the width of a street. */
export const CELL_METRES = 25

/** Levels on the ramp. Six is as many steps as the eye can order at a glance. */
export const HEAT_LEVELS = 6

const METRES_PER_DEG_LAT = 111_320
/** Half of 2^22 — the per-axis offset that keeps cell keys positive. */
const KEY_OFFSET = 2 ** 21
const KEY_STRIDE = 2 ** 22

export interface HeatBand {
	/** 0 = coldest. */
	level: number
	/** Fewest activity-visits any segment in this band has. */
	minCount: number
	/** Most activity-visits any segment in this band has. */
	maxCount: number
	/** Segment runs to draw at this level, as polyline paths. */
	paths: [number, number][][]
}

export interface HeatMap {
	bands: HeatBand[]
	/** Highest visit count anywhere — the top of the legend. */
	peak: number
}

/**
 * Cell key for a coordinate, as a single number so the counting map can avoid
 * string keys. `lngStep` is passed in rather than derived per point: longitude
 * degrees shrink with latitude, and over one city the difference is nil, so one
 * value computed at the area's centre keeps cells square without a `cos` per
 * point.
 */
function cellKey(lat: number, lng: number, latStep: number, lngStep: number): number {
	const cy = Math.round(lat / latStep) + KEY_OFFSET
	const cx = Math.round(lng / lngStep) + KEY_OFFSET
	return cy * KEY_STRIDE + cx
}

/**
 * How many activities visited each cell.
 *
 * A cell is credited once per activity, however many of that activity's points
 * land in it — otherwise a route that happens to be recorded densely, or one
 * where you stood still at a crossing, would light up as if you'd been there
 * fifty times.
 *
 * Long gaps between recorded points are walked, so a track simplified down to a
 * few hundred points still stamps every cell it passes through instead of
 * leaving a dotted trail.
 */
function countCells(routes: [number, number][][], latStep: number, lngStep: number): Map<number, number> {
	const counts = new Map<number, number>()
	const lastSeen = new Map<number, number>()

	for (let r = 0; r < routes.length; r++) {
		const pts = routes[r]
		for (let i = 0; i < pts.length; i++) {
			const [lat, lng] = pts[i]
			stamp(lat, lng)
			// Fill in between this point and the next when they're more than
			// half a cell apart.
			if (i + 1 < pts.length) {
				const [lat2, lng2] = pts[i + 1]
				const steps = Math.floor(Math.max(
					Math.abs(lat2 - lat) / latStep,
					Math.abs(lng2 - lng) / lngStep,
				) * 2)
				for (let s = 1; s < steps; s++) {
					const f = s / steps
					stamp(lat + (lat2 - lat) * f, lng + (lng2 - lng) * f)
				}
			}
		}

		function stamp(lat: number, lng: number) {
			const key = cellKey(lat, lng, latStep, lngStep)
			if (lastSeen.get(key) === r) return
			lastSeen.set(key, r)
			counts.set(key, (counts.get(key) ?? 0) + 1)
		}
	}
	return counts
}

/**
 * Level boundaries, chosen from the data rather than fixed.
 *
 * Fixed thresholds ("10+ runs is hot") would leave a city you've only visited
 * twice drawn entirely in the coldest colour, and squash a home town with 400
 * runs into the top band. Quantiles over the segments actually on screen mean
 * the ramp is always fully used, and the legend reports the real counts each
 * band covers, so the colours never claim more than they know.
 */
export function levelBreaks(counts: number[], levels = HEAT_LEVELS): number[] {
	const sorted = [...counts].sort((a, b) => a - b)
	if (!sorted.length) return []
	const breaks: number[] = []
	for (let i = 0; i < levels; i++) {
		const v = sorted[Math.min(sorted.length - 1, Math.floor((i / levels) * sorted.length))]
		// Distinct, ascending — with few distinct counts this yields fewer bands
		// rather than several bands meaning the same thing.
		if (!breaks.length || v > breaks[breaks.length - 1]) breaks.push(v)
	}
	return breaks
}

const levelFor = (count: number, breaks: number[]): number => {
	let lvl = 0
	for (let i = 0; i < breaks.length; i++) if (count >= breaks[i]) lvl = i
	return lvl
}

/**
 * Build the heat bands for a set of decoded routes.
 *
 * Each route is cut into runs of consecutive segments sharing a level, so the
 * caller can draw one multi-path layer per level instead of one layer per
 * segment — six Leaflet layers for the whole map rather than a hundred thousand.
 */
export function buildHeat(routes: [number, number][][], cellMetres = CELL_METRES): HeatMap {
	const usable = routes.filter(r => r.length >= 2)
	if (!usable.length) return { bands: [], peak: 0 }

	// One reference latitude for the whole map keeps cells square without a
	// trigonometric call per point.
	let latSum = 0, n = 0
	for (const r of usable) { latSum += r[0][0]; n++ }
	const refLat = latSum / n
	const latStep = cellMetres / METRES_PER_DEG_LAT
	const lngStep = cellMetres / (METRES_PER_DEG_LAT * Math.max(0.05, Math.cos((refLat * Math.PI) / 180)))

	const counts = countCells(usable, latStep, lngStep)

	// Segment counts: the visit count at each segment's midpoint.
	const segCounts: number[][] = []
	let peak = 0
	for (const pts of usable) {
		const row: number[] = []
		for (let i = 1; i < pts.length; i++) {
			const mLat = (pts[i - 1][0] + pts[i][0]) / 2
			const mLng = (pts[i - 1][1] + pts[i][1]) / 2
			const c = counts.get(cellKey(mLat, mLng, latStep, lngStep)) ?? 1
			if (c > peak) peak = c
			row.push(c)
		}
		segCounts.push(row)
	}

	const breaks = levelBreaks(segCounts.flat())
	const bands: HeatBand[] = breaks.map((minCount, i) => ({
		level: i,
		minCount,
		maxCount: i + 1 < breaks.length ? breaks[i + 1] - 1 : peak,
		paths: [],
	}))
	if (!bands.length) return { bands: [], peak: 0 }

	// Cut each route into runs of one level. A run carries the point that starts
	// it, so neighbouring bands meet rather than leaving a gap at the boundary.
	for (let r = 0; r < usable.length; r++) {
		const pts = usable[r]
		const row = segCounts[r]
		let runLevel = levelFor(row[0], breaks)
		let runStart = 0
		for (let i = 1; i <= row.length; i++) {
			const lvl = i < row.length ? levelFor(row[i], breaks) : -1
			if (lvl === runLevel) continue
			bands[runLevel].paths.push(pts.slice(runStart, i + 1))
			runStart = i
			runLevel = lvl
		}
	}

	return { bands: bands.filter(b => b.paths.length), peak }
}
