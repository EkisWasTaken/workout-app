/**
 * Grouping recorded activities by *where* they happened.
 *
 * The all-routes map used to fit the whole collection at once. That works while
 * you train in one town; once there are runs in another country the map zooms
 * out to hold both, and the loop you do four times a week becomes a smudge two
 * pixels wide. So routes are clustered into places first, the map opens on the
 * place you run in most, and the rest become a filter.
 *
 * Clustering is on the start point, single-link with a radius, which is the
 * right model for this: runs from the same front door are metres apart, runs on
 * a holiday are hundreds of kilometres away, and there is nothing in between to
 * get wrong. Naming is a separate, best-effort step — see `namePlaces`.
 */

export interface PlaceMember {
	activity: any
	lat: number
	lng: number
}

export interface RunPlace {
	/** Stable id, from the rounded centre — survives reloads, so caches hit. */
	key: string
	/** City/area name once resolved, else a coordinate description. */
	label: string
	/** Country name once resolved. */
	country: string | null
	lat: number
	lng: number
	activities: any[]
	/** Total distance of the activities here, metres. */
	totalDistance: number
	/** Most recent start date seen here, ISO. */
	lastDate: string
}

/**
 * Runs from one home base scatter by a few hundred metres; the next town is
 * tens of kilometres off. 30 km keeps a city and its surrounding trails
 * together without ever merging two cities you'd think of separately.
 */
export const CLUSTER_RADIUS_KM = 30

const R_EARTH_KM = 6371

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
	const dLat = ((bLat - aLat) * Math.PI) / 180
	const dLng = ((bLng - aLng) * Math.PI) / 180
	const la = (aLat * Math.PI) / 180
	const lb = (bLat * Math.PI) / 180
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2
	return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h))
}

/** First point of an activity's polyline, decoded by the caller's decoder. */
export interface StartPoint { activity: any; lat: number; lng: number }

/**
 * Cluster start points into places, largest first.
 *
 * Single-link agglomeration: a point joins the first existing cluster within
 * the radius of its *centre*, and the centre is then re-averaged. Ordering by
 * date first (newest last, so the loop runs oldest → newest) keeps the result
 * stable between loads.
 */
export function clusterStartPoints(points: StartPoint[], radiusKm = CLUSTER_RADIUS_KM): RunPlace[] {
	const clusters: { lat: number; lng: number; members: StartPoint[] }[] = []

	for (const p of points) {
		if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
		let best: (typeof clusters)[number] | null = null
		let bestDist = Infinity
		for (const c of clusters) {
			const d = haversineKm(c.lat, c.lng, p.lat, p.lng)
			if (d <= radiusKm && d < bestDist) { best = c; bestDist = d }
		}
		if (best) {
			best.members.push(p)
			const n = best.members.length
			best.lat += (p.lat - best.lat) / n
			best.lng += (p.lng - best.lng) / n
		} else {
			clusters.push({ lat: p.lat, lng: p.lng, members: [p] })
		}
	}

	return clusters
		.map<RunPlace>(c => {
			const activities = c.members.map(m => m.activity)
			const dates = activities
				.map(a => String(a?.start_date_local || a?.start_date || ''))
				.filter(Boolean)
				.sort()
			return {
				key: placeKey(c.lat, c.lng),
				label: coordLabel(c.lat, c.lng),
				country: null,
				lat: c.lat,
				lng: c.lng,
				activities,
				totalDistance: activities.reduce((s, a) => s + (Number(a?.distance) || 0), 0),
				lastDate: dates[dates.length - 1] || '',
			}
		})
		.sort((a, b) =>
			b.activities.length - a.activities.length ||
			b.totalDistance - a.totalDistance ||
			b.lastDate.localeCompare(a.lastDate))
}

/** Rounded to ~1 km, which is far finer than the cluster radius — ids stay unique. */
export function placeKey(lat: number, lng: number): string {
	return `${lat.toFixed(2)},${lng.toFixed(2)}`
}

/** What a place is called before (or instead of) a lookup: "59.33°N, 18.07°E". */
export function coordLabel(lat: number, lng: number): string {
	const ns = lat >= 0 ? 'N' : 'S'
	const ew = lng >= 0 ? 'E' : 'W'
	return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lng).toFixed(2)}°${ew}`
}

// ─── Naming ───────────────────────────────────────────────────────────────────

/**
 * Place names come from OpenStreetMap's Nominatim, the same project as the map
 * tiles. There is no key and no account, which is why it's used here, but its
 * usage policy asks for low volume — so:
 *
 *   · one request per *cluster*, not per activity (a few, not a few hundred)
 *   · answers cached in localStorage under the rounded centre, so a place is
 *     looked up once ever and the map opens instantly afterwards
 *   · requests spaced a second apart, and the whole thing best-effort: if it
 *     fails, is blocked, or the app is offline, places keep their coordinate
 *     labels and everything else still works
 */
const CACHE_KEY = 'runPlaceNames.v1'
const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse'

interface CachedName { label: string; country: string | null }

function readCache(): Record<string, CachedName> {
	try {
		const raw = localStorage.getItem(CACHE_KEY)
		return raw ? JSON.parse(raw) : {}
	} catch {
		return {}
	}
}

function writeCache(cache: Record<string, CachedName>) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
	} catch {
		// Private mode, or the quota is full. Names just won't persist.
	}
}

/**
 * Forget every cached place name. The cache is keyed by where someone runs, so
 * it's dropped on sign-out rather than handed to the next account on this browser.
 */
export function clearPlaceNameCache(): void {
	try {
		localStorage.removeItem(CACHE_KEY)
	} catch {
		// Storage unavailable: nothing was cached either.
	}
}

/** Pull the most recognisable name out of a Nominatim address block. */
export function labelFromAddress(address: Record<string, string> | undefined): string | null {
	if (!address) return null
	const city = address.city || address.town || address.village || address.municipality
		|| address.city_district || address.suburb || address.county
	return city || address.state || address.country || null
}

/**
 * Fill in `label` and `country` on each place, from cache where possible and
 * from Nominatim for the rest. Mutates the places (they're plain objects the
 * caller owns) and resolves once every lookup has settled.
 */
export async function namePlaces(places: RunPlace[], signal?: AbortSignal): Promise<void> {
	const cache = readCache()
	let dirty = false

	const unresolved: RunPlace[] = []
	for (const p of places) {
		const hit = cache[p.key]
		if (hit) {
			p.label = hit.label
			p.country = hit.country
		} else {
			unresolved.push(p)
		}
	}

	for (const p of unresolved) {
		if (signal?.aborted) break
		const named = await lookup(p.lat, p.lng, signal)
		if (named) {
			p.label = named.label
			p.country = named.country
			cache[p.key] = named
			dirty = true
		}
		// Nominatim asks for at most one request a second.
		if (p !== unresolved[unresolved.length - 1]) await delay(1100, signal)
	}

	if (dirty) writeCache(cache)
}

async function lookup(lat: number, lng: number, signal?: AbortSignal): Promise<CachedName | null> {
	// zoom=10 is city/municipality level — the granularity the filter wants.
	const url = `${NOMINATIM}?format=jsonv2&zoom=10&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`
	try {
		const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
		if (!res.ok) return null
		const json = await res.json()
		const label = labelFromAddress(json?.address) || (json?.name ?? null)
		if (!label) return null
		return { label, country: json?.address?.country ?? null }
	} catch {
		return null
	}
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise(resolve => {
		const id = setTimeout(resolve, ms)
		signal?.addEventListener('abort', () => { clearTimeout(id); resolve() }, { once: true })
	})
}

// ─── Grouping for the filter UI ───────────────────────────────────────────────

export interface CountryGroup {
	country: string
	places: RunPlace[]
	count: number
}

/** Places grouped by country, busiest country first. Unnamed countries land last. */
export function byCountry(places: RunPlace[]): CountryGroup[] {
	const groups = new Map<string, RunPlace[]>()
	for (const p of places) {
		const key = p.country ?? ''
		const list = groups.get(key)
		if (list) list.push(p)
		else groups.set(key, [p])
	}
	return [...groups.entries()]
		.map(([country, list]) => ({
			country,
			places: list,
			count: list.reduce((s, p) => s + p.activities.length, 0),
		}))
		.sort((a, b) => (a.country === '' ? 1 : b.country === '' ? -1 : 0) || b.count - a.count)
}
