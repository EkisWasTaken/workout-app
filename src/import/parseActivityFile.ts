import FitParser from 'fit-file-parser'
import { encode } from '@mapbox/polyline'
import type { ActivityStreams, BestEffort } from '@/types'

/**
 * Parses workout files exported from Apple Health (via HealthFit/RunGap),
 * Strava bulk export, or any Garmin-compatible source. Supported:
 * .fit, .fit.gz, .gpx, .gpx.gz, .tcx, .tcx.gz
 *
 * Everything is computed in the browser from the raw samples: moving time,
 * km splits, best efforts, elevation gain and downsampled streams — the
 * data Strava's premium analysis is built on.
 */

export interface ParsedActivity {
	name: string
	sport_type: string           // Strava-style: Run / Ride / Walk / Swim / Workout
	start_date_local: string     // ISO, local wall time
	start_date: string           // ISO, UTC
	distance: number             // metres
	moving_time: number          // seconds
	elapsed_time: number         // seconds
	average_speed?: number       // m/s (moving)
	average_heartrate?: number
	max_heartrate?: number
	calories?: number
	total_elevation_gain?: number
	map?: { polyline?: string }
	splits_metric?: any[]
	streams?: ActivityStreams
	best_efforts?: BestEffort[]
}

interface Sample {
	t: number                    // ms epoch
	lat?: number
	lng?: number
	dist?: number                // cumulative metres
	speed?: number               // m/s
	hr?: number
	alt?: number
}

const MAX_STREAM_POINTS = 900

export async function parseActivityFile(file: File): Promise<ParsedActivity> {
	let name = file.name
	let buffer = await file.arrayBuffer()

	if (name.toLowerCase().endsWith('.gz')) {
		buffer = await gunzip(buffer)
		name = name.slice(0, -3)
	}

	const lower = name.toLowerCase()
	if (lower.endsWith('.fit')) return parseFit(buffer)
	if (lower.endsWith('.gpx')) return parseGpx(new TextDecoder().decode(buffer))
	if (lower.endsWith('.tcx')) return parseTcx(new TextDecoder().decode(buffer))
	throw new Error(`Unsupported file type: ${file.name}. Use .fit, .gpx or .tcx (optionally .gz).`)
}

async function gunzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
	const ds = new DecompressionStream('gzip')
	const stream = new Blob([buffer]).stream().pipeThrough(ds)
	return await new Response(stream).arrayBuffer()
}

// ─── FIT ──────────────────────────────────────────────────────────────────────

const FIT_SPORT_MAP: Record<string, string> = {
	running: 'Run', trail_running: 'Run', track_running: 'Run', treadmill_running: 'Run',
	cycling: 'Ride', road_cycling: 'Ride', mountain_biking: 'Ride', indoor_cycling: 'Ride', virtual_ride: 'Ride',
	walking: 'Walk', hiking: 'Hike', swimming: 'Swim',
	training: 'Workout', strength_training: 'WeightTraining', fitness_equipment: 'Workout',
}

function parseFit(buffer: ArrayBuffer): Promise<ParsedActivity> {
	return new Promise((resolve, reject) => {
		const parser = new FitParser({
			force: true,
			speedUnit: 'm/s',
			lengthUnit: 'm',
			temperatureUnit: 'celsius',
			elapsedRecordField: true,
			mode: 'list',
		})
		parser.parse(buffer, (error, data) => {
			if (error) return reject(new Error(`FIT parse error: ${error}`))
			try {
				const records: any[] = data.records || []
				const session: any = (data.sessions && data.sessions[0]) || {}

				const samples: Sample[] = records
					.filter(r => r.timestamp)
					.map(r => ({
						t: new Date(r.timestamp).getTime(),
						lat: typeof r.position_lat === 'number' ? r.position_lat : undefined,
						lng: typeof r.position_long === 'number' ? r.position_long : undefined,
						dist: typeof r.distance === 'number' ? r.distance : undefined,
						speed: typeof r.enhanced_speed === 'number' ? r.enhanced_speed
							: typeof r.speed === 'number' ? r.speed : undefined,
						hr: typeof r.heart_rate === 'number' ? r.heart_rate : undefined,
						alt: typeof r.enhanced_altitude === 'number' ? r.enhanced_altitude
							: typeof r.altitude === 'number' ? r.altitude : undefined,
					}))

				const sportRaw = String(session.sport || data.activity?.sport || '').toLowerCase()
				const subSport = String(session.sub_sport || '').toLowerCase()
				const sport = FIT_SPORT_MAP[subSport] || FIT_SPORT_MAP[sportRaw] || 'Workout'

				const activity = buildActivity(samples, sport, {
					distance: numOr(session.total_distance),
					moving_time: numOr(session.total_timer_time),
					elapsed_time: numOr(session.total_elapsed_time),
					calories: numOr(session.total_calories),
					average_heartrate: numOr(session.avg_heart_rate),
					max_heartrate: numOr(session.max_heart_rate),
					total_elevation_gain: numOr(session.total_ascent),
					start: session.start_time ? new Date(session.start_time) : undefined,
				})
				resolve(activity)
			} catch (e: any) {
				reject(new Error(`Could not read FIT data: ${e?.message || e}`))
			}
		})
	})
}

const numOr = (v: any): number | undefined =>
	typeof v === 'number' && isFinite(v) ? v : undefined

// ─── GPX ──────────────────────────────────────────────────────────────────────

function parseGpx(xml: string): ParsedActivity {
	const doc = parseXml(xml)
	const trkpts = Array.from(doc.getElementsByTagName('trkpt'))
	if (!trkpts.length) throw new Error('GPX file has no track points')

	const samples: Sample[] = []
	for (const pt of trkpts) {
		const timeEl = pt.getElementsByTagName('time')[0]
		if (!timeEl?.textContent) continue
		const s: Sample = {
			t: new Date(timeEl.textContent).getTime(),
			lat: parseFloat(pt.getAttribute('lat') || ''),
			lng: parseFloat(pt.getAttribute('lon') || ''),
		}
		const ele = pt.getElementsByTagName('ele')[0]
		if (ele?.textContent) s.alt = parseFloat(ele.textContent)
		// HR lives in extensions as gpxtpx:hr / ns3:hr / hr depending on exporter
		const hrEl = findByLocalName(pt, 'hr')
		if (hrEl?.textContent) s.hr = parseInt(hrEl.textContent, 10)
		if (isNaN(s.lat!) || isNaN(s.lng!)) { s.lat = undefined; s.lng = undefined }
		samples.push(s)
	}
	fillDistanceFromGps(samples)

	const typeEl = doc.getElementsByTagName('type')[0]
	const nameEl = doc.getElementsByTagName('name')[0]
	const sport = gpxTypeToSport(typeEl?.textContent || nameEl?.textContent || '')
	return buildActivity(samples, sport, {})
}

function gpxTypeToSport(t: string): string {
	const s = t.toLowerCase()
	if (s.includes('run') || s === '9') return 'Run'
	if (s.includes('rid') || s.includes('bik') || s.includes('cycl') || s === '1') return 'Ride'
	if (s.includes('walk')) return 'Walk'
	if (s.includes('hik')) return 'Hike'
	if (s.includes('swim')) return 'Swim'
	return 'Workout'
}

// ─── TCX ──────────────────────────────────────────────────────────────────────

function parseTcx(xml: string): ParsedActivity {
	const doc = parseXml(xml)
	const points = Array.from(doc.getElementsByTagName('Trackpoint'))
	if (!points.length) throw new Error('TCX file has no track points')

	const samples: Sample[] = []
	for (const pt of points) {
		const timeEl = pt.getElementsByTagName('Time')[0]
		if (!timeEl?.textContent) continue
		const s: Sample = { t: new Date(timeEl.textContent).getTime() }
		const lat = pt.getElementsByTagName('LatitudeDegrees')[0]
		const lng = pt.getElementsByTagName('LongitudeDegrees')[0]
		if (lat?.textContent && lng?.textContent) {
			s.lat = parseFloat(lat.textContent)
			s.lng = parseFloat(lng.textContent)
		}
		const dist = pt.getElementsByTagName('DistanceMeters')[0]
		if (dist?.textContent) s.dist = parseFloat(dist.textContent)
		const alt = pt.getElementsByTagName('AltitudeMeters')[0]
		if (alt?.textContent) s.alt = parseFloat(alt.textContent)
		const hr = pt.getElementsByTagName('HeartRateBpm')[0]?.getElementsByTagName('Value')[0]
		if (hr?.textContent) s.hr = parseInt(hr.textContent, 10)
		samples.push(s)
	}
	if (!samples.some(s => s.dist !== undefined)) fillDistanceFromGps(samples)

	const actEl = doc.getElementsByTagName('Activity')[0]
	const sportAttr = (actEl?.getAttribute('Sport') || '').toLowerCase()
	const sport = sportAttr === 'running' ? 'Run' : sportAttr === 'biking' ? 'Ride' : gpxTypeToSport(sportAttr)
	const calEls = Array.from(doc.getElementsByTagName('Calories'))
	const calories = calEls.reduce((s, el) => s + (parseFloat(el.textContent || '0') || 0), 0) || undefined
	return buildActivity(samples, sport, { calories })
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function parseXml(xml: string): Document {
	const doc = new DOMParser().parseFromString(xml, 'application/xml')
	if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid XML file')
	return doc
}

function findByLocalName(parent: Element, local: string): Element | null {
	const all = parent.getElementsByTagName('*')
	for (let i = 0; i < all.length; i++) {
		if (all[i].localName === local) return all[i]
	}
	return null
}

/** Haversine metres between two coordinates. */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000
	const dLat = (lat2 - lat1) * Math.PI / 180
	const dLng = (lng2 - lng1) * Math.PI / 180
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
	return 2 * R * Math.asin(Math.sqrt(a))
}

/** Derive cumulative distance and speed from GPS when the file has none. */
function fillDistanceFromGps(samples: Sample[]) {
	let cum = 0
	let prev: Sample | null = null
	for (const s of samples) {
		if (prev && s.lat !== undefined && s.lng !== undefined && prev.lat !== undefined && prev.lng !== undefined) {
			const d = haversine(prev.lat, prev.lng, s.lat, s.lng)
			const dt = (s.t - prev.t) / 1000
			cum += d
			if (dt > 0 && dt < 30) s.speed = d / dt
		}
		s.dist = cum
		if (s.lat !== undefined) prev = s
	}
}

/**
 * Turn raw samples into the normalised activity: moving time, splits,
 * best efforts, polyline, elevation gain and downsampled streams.
 * `known` values from the file's own summary win over derived ones.
 */
function buildActivity(samples: Sample[], sport: string, known: {
	distance?: number; moving_time?: number; elapsed_time?: number
	calories?: number; average_heartrate?: number; max_heartrate?: number
	total_elevation_gain?: number; start?: Date
}): ParsedActivity {
	if (!samples.length) throw new Error('File contains no samples')
	samples.sort((a, b) => a.t - b.t)

	const start = known.start || new Date(samples[0].t)
	const t0 = samples[0].t
	const end = samples[samples.length - 1].t

	// Moving time: accumulate sample gaps while moving; long gaps are pauses.
	let movingTime = 0
	let elevGain = 0
	const hrs: number[] = []
	for (let i = 1; i < samples.length; i++) {
		const dt = (samples[i].t - samples[i - 1].t) / 1000
		if (dt <= 0 || dt > 15) continue
		const sp = samples[i].speed
		const dDist = (samples[i].dist ?? 0) - (samples[i - 1].dist ?? 0)
		const moving = sp !== undefined ? sp > 0.3 : dDist > 0.5 || (samples[i].dist === undefined)
		if (moving) movingTime += dt
		const a1 = samples[i - 1].alt, a2 = samples[i].alt
		if (a1 !== undefined && a2 !== undefined && a2 > a1) elevGain += Math.min(a2 - a1, 15)
	}
	for (const s of samples) if (s.hr !== undefined && s.hr > 0) hrs.push(s.hr)

	const lastDist = [...samples].reverse().find(s => s.dist !== undefined)?.dist
	const distance = known.distance ?? lastDist ?? 0
	const moving_time = Math.round(known.moving_time ?? movingTime)
	const elapsed_time = Math.round(known.elapsed_time ?? (end - t0) / 1000)

	// Local wall-time ISO (Strava's start_date_local convention)
	const localIso = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
		.toISOString().replace('Z', '')

	const coords: [number, number][] = samples
		.filter(s => s.lat !== undefined && s.lng !== undefined)
		.map(s => [s.lat!, s.lng!])

	return {
		name: `${sportLabel(sport)} — ${start.toLocaleDateString()}`,
		sport_type: sport,
		start_date: start.toISOString(),
		start_date_local: localIso,
		distance,
		moving_time: Math.max(moving_time, 1),
		elapsed_time: Math.max(elapsed_time, 1),
		average_speed: distance > 0 && moving_time > 0 ? distance / moving_time : undefined,
		average_heartrate: known.average_heartrate ?? (hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : undefined),
		max_heartrate: known.max_heartrate ?? (hrs.length ? Math.max(...hrs) : undefined),
		calories: known.calories,
		total_elevation_gain: known.total_elevation_gain ?? (elevGain > 0 ? Math.round(elevGain) : undefined),
		map: coords.length >= 2 ? { polyline: encode(simplifyCoords(coords, 1200)) } : undefined,
		splits_metric: buildSplits(samples),
		streams: buildStreams(samples, t0),
		best_efforts: sport === 'Run' ? buildBestEfforts(samples) : undefined,
	}
}

function sportLabel(sport: string): string {
	const map: Record<string, string> = { Run: 'Run', Ride: 'Ride', Walk: 'Walk', Hike: 'Hike', Swim: 'Swim', WeightTraining: 'Strength', Workout: 'Workout' }
	return map[sport] || sport
}

/** Cap polyline size by keeping every Nth point. */
function simplifyCoords(coords: [number, number][], max: number): [number, number][] {
	if (coords.length <= max) return coords
	const step = Math.ceil(coords.length / max)
	const out = coords.filter((_, i) => i % step === 0)
	if (out[out.length - 1] !== coords[coords.length - 1]) out.push(coords[coords.length - 1])
	return out
}

/** Per-kilometre splits in Strava's splits_metric shape. */
function buildSplits(samples: Sample[]): any[] {
	const withDist = samples.filter(s => s.dist !== undefined)
	if (withDist.length < 2 || (withDist[withDist.length - 1].dist! < 400)) return []

	const splits: any[] = []
	let splitStartIdx = 0
	let splitNum = 1
	for (let i = 1; i < withDist.length; i++) {
		const target = splitNum * 1000
		const isLast = i === withDist.length - 1
		if (withDist[i].dist! >= target || isLast) {
			const s0 = withDist[splitStartIdx], s1 = withDist[i]
			const dist = s1.dist! - s0.dist!
			const time = (s1.t - s0.t) / 1000
			if (dist < 100 || time <= 0) break
			const segment = withDist.slice(splitStartIdx, i + 1)
			const segHrs = segment.filter(s => s.hr).map(s => s.hr!)
			const alt0 = s0.alt, alt1 = s1.alt
			splits.push({
				split: splitNum,
				distance: Math.round(dist),
				moving_time: Math.round(time),
				elapsed_time: Math.round(time),
				average_speed: dist / time,
				elevation_difference: alt0 !== undefined && alt1 !== undefined ? Math.round((alt1 - alt0) * 10) / 10 : 0,
				average_heartrate: segHrs.length ? Math.round(segHrs.reduce((a, b) => a + b, 0) / segHrs.length) : undefined,
				pace_zone: 0,
			})
			splitStartIdx = i
			splitNum++
			if (isLast) break
		}
	}
	return splits
}

/** Downsampled streams for charts + accurate time-in-zone. */
function buildStreams(samples: Sample[], t0: number): ActivityStreams {
	const step = Math.max(1, Math.ceil(samples.length / MAX_STREAM_POINTS))
	const picked = samples.filter((_, i) => i % step === 0)
	const hasHr = picked.some(s => s.hr !== undefined)
	const hasVel = picked.some(s => s.speed !== undefined)
	const hasAlt = picked.some(s => s.alt !== undefined)
	const hasDist = picked.some(s => s.dist !== undefined)
	const round = (v: number | undefined, f: number) => v === undefined ? null : Math.round(v * f) / f
	return {
		time: picked.map(s => Math.round((s.t - t0) / 1000)),
		...(hasHr ? { heartrate: picked.map(s => s.hr ?? null) } : {}),
		...(hasVel ? { velocity: picked.map(s => round(s.speed, 100)) } : {}),
		...(hasAlt ? { altitude: picked.map(s => round(s.alt, 10)) } : {}),
		...(hasDist ? { distance: picked.map(s => round(s.dist, 1)) } : {}),
	}
}

const EFFORT_TARGETS: { name: string; distance: number }[] = [
	{ name: '400 m', distance: 400 },
	{ name: '1 km', distance: 1000 },
	{ name: '1 mile', distance: 1609 },
	{ name: '5 km', distance: 5000 },
	{ name: '10 km', distance: 10000 },
	{ name: 'Half marathon', distance: 21097 },
	{ name: 'Marathon', distance: 42195 },
]

/** Fastest continuous stretch for each classic distance (two-pointer sweep). */
function buildBestEfforts(samples: Sample[]): BestEffort[] {
	const pts = samples.filter(s => s.dist !== undefined)
	if (pts.length < 10) return []
	const total = pts[pts.length - 1].dist!
	const out: BestEffort[] = []
	for (const target of EFFORT_TARGETS) {
		if (total < target.distance) continue
		let best = Infinity
		let j = 0
		for (let i = 0; i < pts.length; i++) {
			while (j < pts.length && pts[j].dist! - pts[i].dist! < target.distance) j++
			if (j >= pts.length) break
			const time = (pts[j].t - pts[i].t) / 1000
			// Scale down to the exact target distance (segment slightly overshoots)
			const seg = pts[j].dist! - pts[i].dist!
			const adjusted = time * (target.distance / seg)
			if (adjusted < best) best = adjusted
		}
		if (isFinite(best) && best > 0) {
			out.push({ name: target.name, distance: target.distance, elapsed_time: Math.round(best) })
		}
	}
	return out
}
