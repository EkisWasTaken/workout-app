/**
 * Goals and profile settings.
 *
 * Supabase is the source of truth, but `analysis.ts` reads maxHR / restingHR
 * synchronously from localStorage during render. So every write mirrors to the
 * same localStorage keys the old code used: the cache stays authoritative for
 * sync reads and survives being offline, while the DB survives a cleared
 * browser and syncs across machines.
 *
 * Call `hydrateSettings()` once at boot.
 */
import { reactive, computed } from 'vue'
import { db, MISSING_GOALS_TABLES } from './db'
import { DISTANCES, vdotFromRace, type DistanceKey } from './utils/vdot'
import type { RaceGoal } from './types'

export interface Settings {
	userName: string
	goalWeight: number | null
	restingHR: number
	maxHR: number | null
}

const DEFAULTS: Settings = { userName: '', goalWeight: null, restingHR: 60, maxHR: null }

/** localStorage keys, unchanged from the pre-database version. */
const LS = { userName: 'userName', goalWeight: 'goalWeight', restingHR: 'restingHR', maxHR: 'maxHR' } as const

function readCache(): Settings {
	const num = (k: string) => {
		const v = localStorage.getItem(k)
		if (v === null || v === '') return null
		const n = parseFloat(v)
		return Number.isFinite(n) ? n : null
	}
	return {
		userName: localStorage.getItem(LS.userName) || '',
		goalWeight: num(LS.goalWeight),
		restingHR: num(LS.restingHR) ?? DEFAULTS.restingHR,
		maxHR: num(LS.maxHR),
	}
}

function writeCache(s: Settings) {
	localStorage.setItem(LS.userName, s.userName)
	const put = (k: string, v: number | null) =>
		v === null ? localStorage.removeItem(k) : localStorage.setItem(k, String(v))
	put(LS.goalWeight, s.goalWeight)
	put(LS.restingHR, s.restingHR)
	put(LS.maxHR, s.maxHR)
}

export const settings = reactive<Settings>(readCache())

/** distance_m -> goal time in seconds. */
export const distanceGoals = reactive<Record<number, number>>({})

export const raceGoals = reactive<{ list: RaceGoal[] }>({ list: [] })

/** True when supabase_goals.sql hasn't been run yet — surfaced in Profile. */
export const schemaMissing = reactive({ value: false })

// ─── hydration ────────────────────────────────────────────────────────────────

let hydrated = false

export async function hydrateSettings(): Promise<void> {
	if (hydrated) return
	hydrated = true

	// race_goals predates supabase_goals.sql, so load it on its own — the
	// schedule still needs the next race even if the new tables are missing.
	try {
		raceGoals.list = await db.getRaceGoals()
	} catch (e) {
		console.error('[settings] could not load race goals', e)
	}

	try {
		const [profile, goals] = await Promise.all([db.getProfile(), db.getDistanceGoals()])

		// Empty profile row + values sitting in localStorage means this is the
		// first run after the migration: push the cache up rather than clobber it.
		const dbEmpty = !profile || (profile.user_name === null && profile.goal_weight === null &&
			profile.resting_hr === null && profile.max_hr === null)
		if (dbEmpty && (settings.userName || settings.goalWeight !== null || settings.maxHR !== null)) {
			await saveSettings(settings)
		} else if (profile) {
			settings.userName = profile.user_name ?? ''
			settings.goalWeight = profile.goal_weight
			settings.restingHR = profile.resting_hr ?? DEFAULTS.restingHR
			settings.maxHR = profile.max_hr
			writeCache(settings)
		}

		for (const k of Object.keys(distanceGoals)) delete distanceGoals[Number(k)]
		for (const g of goals) distanceGoals[g.distance_m] = g.goal_time_secs

		// One-time lift of the old single-goal localStorage pair into a real
		// distance goal, if it maps onto a canonical distance.
		await migrateLegacyRaceGoal()
	} catch (e: any) {
		if (e?.message === MISSING_GOALS_TABLES) {
			schemaMissing.value = true
			console.warn('[settings] goals tables missing — run supabase_goals.sql')
			return
		}
		console.error('[settings] hydrate failed, using local cache', e)
	}
}

/** Old scheme: a single `goalRaceKm` + `goalRaceTime` pair in localStorage. */
async function migrateLegacyRaceGoal() {
	const km = parseFloat(localStorage.getItem('goalRaceKm') || '')
	const timeStr = localStorage.getItem('goalRaceTime')
	if (!(km > 0) || !timeStr) return

	const { parseTime } = await import('./utils/vdot')
	const secs = parseTime(timeStr)
	if (secs === null) return

	// Snap to a canonical distance only if it's within 2% — otherwise this was
	// a bespoke distance (like the 30k) and belongs on the race, not here.
	const m = km * 1000
	const match = (Object.values(DISTANCES) as number[]).find(d => Math.abs(d - m) / d < 0.02)

	if (match && distanceGoals[match] === undefined) {
		try {
			await db.setDistanceGoal(match, secs)
			distanceGoals[match] = secs
		} catch (e) {
			// Leave the legacy keys in place so the goal isn't lost; retry next boot.
			console.error('[settings] legacy goal migration failed, keeping local copy', e)
			return
		}
	}
	localStorage.removeItem('goalRaceKm')
	localStorage.removeItem('goalRaceTime')
}

// ─── mutations ────────────────────────────────────────────────────────────────

export async function saveSettings(next: Partial<Settings>): Promise<void> {
	Object.assign(settings, next)
	writeCache(settings)
	await db.saveProfile({
		user_name: settings.userName || null,
		goal_weight: settings.goalWeight,
		resting_hr: settings.restingHR,
		max_hr: settings.maxHR,
	})
}

// Distance goals have no local fallback, so the DB write has to land before the
// reactive store changes — otherwise a failed save still lights up the pace table.
export async function setDistanceGoal(distance_m: number, secs: number): Promise<void> {
	await db.setDistanceGoal(distance_m, secs)
	distanceGoals[distance_m] = secs
}

export async function clearDistanceGoal(distance_m: number): Promise<void> {
	await db.deleteDistanceGoal(distance_m)
	delete distanceGoals[distance_m]
}

export async function refreshRaceGoals(): Promise<void> {
	raceGoals.list = await db.getRaceGoals()
}

// ─── derived ──────────────────────────────────────────────────────────────────

/** VDOT implied by each distance goal that's set. */
export const goalVdots = computed(() => {
	const out: Partial<Record<DistanceKey, number>> = {}
	for (const [key, m] of Object.entries(DISTANCES) as [DistanceKey, number][]) {
		const secs = distanceGoals[m]
		if (secs) {
			const v = vdotFromRace(m, secs)
			if (v !== null) out[key] = v
		}
	}
	return out
})

/** The next upcoming race, soonest first, A races winning ties. */
export const nextRace = computed<RaceGoal | null>(() => {
	const today = new Date().toISOString().slice(0, 10)
	const upcoming = raceGoals.list
		.filter(g => g.date >= today)
		.sort((a, b) => a.date.localeCompare(b.date) ||
			(a.priority ?? 'A').localeCompare(b.priority ?? 'A'))
	return upcoming[0] ?? null
})

/**
 * The VDOT the schedule's paces are derived from.
 *
 * Prefers the next race's own goal time (it's the thing being trained for);
 * falls back to the most demanding standing distance goal. Null when no goal
 * is set anywhere — callers then simply show no derived pace.
 */
export const goalVdot = computed<number | null>(() => {
	const race = nextRace.value
	if (race?.goal_time_secs && race.distance_km) {
		const v = vdotFromRace(race.distance_km * 1000, race.goal_time_secs)
		if (v !== null) return v
	}
	const vs = Object.values(goalVdots.value)
	return vs.length ? Math.max(...vs) : null
})

/**
 * Distance goals whose implied VDOT is far from `goalVdot` — i.e. mutually
 * inconsistent targets. Surfaced in Profile so they can be reconciled.
 */
export const inconsistentGoals = computed(() => {
	const base = goalVdot.value
	if (base === null) return [] as { key: DistanceKey; vdot: number; delta: number }[]
	return (Object.entries(goalVdots.value) as [DistanceKey, number][])
		.map(([key, vdot]) => ({ key, vdot, delta: Math.round((vdot - base) * 10) / 10 }))
		.filter(g => Math.abs(g.delta) >= 1.5)
})
