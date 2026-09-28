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
import { db, schema, MISSING_GOALS_TABLES, MISSING_GOALS_COLUMNS } from './db'
import { signupName } from './auth'
import { DISTANCES, DISTANCE_LABELS, vdotFromRace, vdotForCourse, FLAT, type DistanceKey } from './utils/vdot'
import { ACTIVITY_FACTORS, type ActivityLevel, type Sex } from './utils/energy'
import type { Profile, RaceGoal, Target } from './types'

export interface Settings {
	userName: string
	goalWeight: number | null
	restingHR: number
	maxHR: number | null
	vdotOverride: number | null
	/**
	 * Body stats, for the energy planner. A birth year rather than an age, so a
	 * profile filled in once doesn't quietly go wrong every birthday.
	 */
	birthYear: number | null
	heightCm: number | null
	sex: Sex | null
	activityLevel: ActivityLevel | null
}

const DEFAULTS: Settings = {
	userName: '', goalWeight: null, restingHR: 60, maxHR: null, vdotOverride: null,
	birthYear: null, heightCm: null, sex: null, activityLevel: null,
}

/** localStorage keys, unchanged from the pre-database version. */
const LS = {
	userName: 'userName', goalWeight: 'goalWeight', restingHR: 'restingHR',
	maxHR: 'maxHR', vdotOverride: 'vdotOverride',
	birthYear: 'birthYear', heightCm: 'heightCm', sex: 'sex', activityLevel: 'activityLevel',
} as const

/** Only the values the equations understand survive a round trip through the cache. */
const asSex = (v: string | null): Sex | null => (v === 'male' || v === 'female' ? v : null)
const asActivity = (v: string | null): ActivityLevel | null =>
	v && v in ACTIVITY_FACTORS ? (v as ActivityLevel) : null

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
		vdotOverride: num(LS.vdotOverride),
		birthYear: num(LS.birthYear),
		heightCm: num(LS.heightCm),
		sex: asSex(localStorage.getItem(LS.sex)),
		activityLevel: asActivity(localStorage.getItem(LS.activityLevel)),
	}
}

function writeCache(s: Settings) {
	localStorage.setItem(LS.userName, s.userName)
	const put = (k: string, v: number | null) =>
		v === null ? localStorage.removeItem(k) : localStorage.setItem(k, String(v))
	const putStr = (k: string, v: string | null) =>
		v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)
	put(LS.goalWeight, s.goalWeight)
	put(LS.restingHR, s.restingHR)
	put(LS.maxHR, s.maxHR)
	put(LS.vdotOverride, s.vdotOverride)
	put(LS.birthYear, s.birthYear)
	put(LS.heightCm, s.heightCm)
	putStr(LS.sex, s.sex)
	putStr(LS.activityLevel, s.activityLevel)
}

export const settings = reactive<Settings>(readCache())

/** distance_m -> { goal time, target date (null = aspirational) }. */
export interface DistanceGoalEntry { secs: number; date: string | null }
export const distanceGoals = reactive<Record<number, DistanceGoalEntry>>({})

export const raceGoals = reactive<{ list: RaceGoal[] }>({ list: [] })

/**
 * Which migration is still outstanding, if any. Surfaced in Profile so the
 * banner can name the exact file to run.
 */
export const pendingMigration = reactive<{ script: string | null }>({ script: null })

// ─── hydration ────────────────────────────────────────────────────────────────

let hydrated = false

/**
 * Wipe every trace of the current user's settings — reactive stores and the
 * localStorage cache alike — and allow a fresh hydrate. Called on sign-in and
 * sign-out so one account's data never bleeds into another's on a shared browser.
 */
export function resetSettingsCache(): void {
	hydrated = false
	Object.assign(settings, DEFAULTS)
	for (const k of Object.values(LS)) localStorage.removeItem(k)
	// Legacy single-goal keys, migrated away but possibly still cached.
	localStorage.removeItem('goalRaceKm')
	localStorage.removeItem('goalRaceTime')
	for (const k of Object.keys(distanceGoals)) delete distanceGoals[Number(k)]
	raceGoals.list = []
	pendingMigration.script = null
}

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
		// Body stats count as cached data too. They were left out, so someone
		// whose only local values were a height and a birth year had nothing
		// pushed up and the branch below then read the empty row back over them.
		const cacheHasSomething = !!settings.userName || settings.goalWeight !== null ||
			settings.maxHR !== null || settings.heightCm !== null || settings.birthYear !== null ||
			settings.sex !== null || settings.activityLevel !== null
		if (dbEmpty && cacheHasSomething) {
			// A database still behind supabase_body_stats.sql now rejects the body
			// stats half of this write. Everything else lands, and the banner set
			// below is what tells the user why — so that refusal must not abort
			// the rest of hydration and take the explanation down with it.
			await saveSettings(settings).catch(e => {
				if (e?.message !== MISSING_GOALS_COLUMNS) throw e
			})
		} else if (profile) {
			settings.userName = profile.user_name ?? ''
			// A brand-new account has a profile row but no name yet; fall back to
			// whatever they typed at sign-up so the greeting isn't anonymous.
			if (!settings.userName) {
				const fromSignup = signupName()
				if (fromSignup) {
					settings.userName = fromSignup
					saveSettings({ userName: fromSignup }).catch(e =>
						console.warn('[settings] could not persist sign-up name', e))
				}
			}
			settings.goalWeight = profile.goal_weight
			settings.restingHR = profile.resting_hr ?? DEFAULTS.restingHR
			settings.maxHR = profile.max_hr
			settings.vdotOverride = profile.vdot_override ?? null
			adoptBodyStats(profile)
			writeCache(settings)
		}

		for (const k of Object.keys(distanceGoals)) delete distanceGoals[Number(k)]
		for (const g of goals) distanceGoals[g.distance_m] = { secs: g.goal_time_secs, date: g.target_date ?? null }

		// The db layer flips these when a column is absent. Name the earliest one.
		if (!schema.v2) {
			pendingMigration.script = 'supabase_goals_v2.sql'
			console.warn('[settings] goal dates, race results and VDOT override need supabase_goals_v2.sql')
		} else if (!schema.v3) {
			pendingMigration.script = 'supabase_goals_v3.sql'
			console.warn('[settings] course terrain needs supabase_goals_v3.sql')
		} else if (!schema.v4) {
			pendingMigration.script = 'supabase_body_stats.sql'
			console.warn('[settings] the energy planner’s body stats need supabase_body_stats.sql')
		}

		await migrateLegacyRaceGoal()
	} catch (e: any) {
		if (e?.message === MISSING_GOALS_TABLES) {
			pendingMigration.script = 'supabase_goals.sql'
			console.warn('[settings] goals tables missing — run supabase_goals.sql, then supabase_goals_v2.sql')
			return
		}
		console.error('[settings] hydrate failed, using local cache', e)
	}
}

/**
 * Merge the stored body stats into the settings, without ever losing one.
 *
 * A null in the row is not an answer, it's an absence — the account predates
 * `supabase_body_stats.sql`, or a write that would have filled it was dropped
 * by a database that was still behind. Copying those nulls over the cache is
 * how a height typed before the migration disappeared the moment it landed,
 * which is the one thing this must not do.
 *
 * So the row wins wherever it has a value, the cache survives wherever it
 * doesn't, and anything the cache knows that the row doesn't is pushed back up
 * — otherwise the stats would live on one browser forever and the next device
 * would keep asking for them.
 *
 * The cost is that clearing a stat on one device can be undone by another
 * device that still has it cached, until that one syncs. Resurrecting a value
 * someone deleted is the lesser failure: they can clear it again, whereas the
 * old behaviour silently destroyed data they had no way to get back.
 */
function adoptBodyStats(profile: Profile): void {
	// Before the migration the row can't hold these at all, so there is nothing
	// to merge and nothing worth pushing up — it would only fail.
	if (!schema.v4) return

	if (profile.birth_year !== null) settings.birthYear = profile.birth_year
	if (profile.height_cm !== null) settings.heightCm = profile.height_cm
	const dbSex = asSex(profile.sex ?? null)
	if (dbSex !== null) settings.sex = dbSex
	const dbActivity = asActivity(profile.activity_level ?? null)
	if (dbActivity !== null) settings.activityLevel = dbActivity

	const aheadOfDb =
		(settings.birthYear !== null && profile.birth_year === null) ||
		(settings.heightCm !== null && profile.height_cm === null) ||
		(settings.sex !== null && dbSex === null) ||
		(settings.activityLevel !== null && dbActivity === null)

	if (aheadOfDb) {
		saveSettings({}).catch(e =>
			console.warn('[settings] could not push cached body stats to the database', e))
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
			await db.setDistanceGoal({ distance_m: match, goal_time_secs: secs, target_date: null })
			distanceGoals[match] = { secs, date: null }
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
		vdot_override: settings.vdotOverride,
		birth_year: settings.birthYear,
		height_cm: settings.heightCm,
		sex: settings.sex,
		activity_level: settings.activityLevel,
	})
}

// ─── body stats ───────────────────────────────────────────────────────────────

/**
 * Age in whole years, from the stored birth year.
 *
 * Deliberately coarse: the BMR equation subtracts five kilocalories per year of
 * age, so knowing the birthday to the day would change the answer by less than
 * a rounding error. `todayYear` is injectable so nothing here needs a clock.
 */
export function ageFromBirthYear(birthYear: number | null, todayYear = new Date().getFullYear()): number | null {
	if (birthYear === null || !Number.isFinite(birthYear)) return null
	const age = todayYear - birthYear
	return age >= 14 && age <= 100 ? age : null
}

/**
 * Everything the energy planner needs except the current weight, or null when
 * the profile hasn't been filled in far enough to compute anything honest.
 */
export const bodyStats = computed(() => {
	const age = ageFromBirthYear(settings.birthYear)
	if (age === null || !settings.heightCm || !settings.sex) return null
	return {
		age,
		heightCm: settings.heightCm,
		sex: settings.sex,
		// Most people who train have a desk job; it's the safest thing to assume,
		// and assuming more would inflate every target they're given.
		activityLevel: settings.activityLevel ?? ('sedentary' as ActivityLevel),
	}
})

// Distance goals have no local fallback, so the DB write has to land before the
// reactive store changes — otherwise a failed save still lights up the pace table.
export async function setDistanceGoal(distance_m: number, secs: number, date: string | null): Promise<void> {
	await db.setDistanceGoal({ distance_m, goal_time_secs: secs, target_date: date })
	distanceGoals[distance_m] = { secs, date }
}

export async function clearDistanceGoal(distance_m: number): Promise<void> {
	await db.deleteDistanceGoal(distance_m)
	delete distanceGoals[distance_m]
}

export async function refreshRaceGoals(): Promise<void> {
	raceGoals.list = await db.getRaceGoals()
}

// ─── targets ──────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * Every thing you're training for, races and standing distance goals alike.
 * A race is just a target that happens to have a name and a fixed date.
 */
export const targets = computed<Target[]>(() => {
	const out: Target[] = []

	// Standing distance goals are flat-road times by definition.
	for (const [key, m] of Object.entries(DISTANCES) as [DistanceKey, number][]) {
		const g = distanceGoals[m]
		if (!g) continue
		const v = vdotFromRace(m, g.secs)
		if (v === null) continue
		out.push({ key: `d:${key}`, name: DISTANCE_LABELS[key], distanceM: m, goalTimeSecs: g.secs, date: g.date, neededVdot: v, terrainFactor: FLAT, kind: 'distance' })
	}

	// A race has a course. 2:30 over a hilly 30k demands more than 2:30 on tarmac.
	for (const r of raceGoals.list) {
		if (!r.distance_km || !r.goal_time_secs) continue
		const m = r.distance_km * 1000
		const terrain = r.terrain_factor ?? FLAT
		const v = vdotForCourse(m, r.goal_time_secs, terrain)
		if (v === null) continue
		out.push({ key: `r:${r.id}`, name: r.name, distanceM: m, goalTimeSecs: r.goal_time_secs, date: r.date, neededVdot: v, terrainFactor: terrain, kind: 'race' })
	}

	return out
})

/** Dated targets still ahead of us, soonest first. */
export const upcomingTargets = computed(() => {
	const today = todayISO()
	return targets.value
		.filter((t): t is Target & { date: string } => t.date !== null && t.date >= today)
		.sort((a, b) => a.date.localeCompare(b.date))
})

/** Undated targets: tracked as a gap, never allowed to drive paces. */
export const aspirationalTargets = computed(() => targets.value.filter(t => t.date === null))

/**
 * Upcoming races with no goal time. These aren't targets, so the race-pace
 * sessions in their block silently resolve to whatever goal comes next instead —
 * which is how a 30k race ended up paced off a half-marathon goal.
 */
export const racesMissingGoalTime = computed(() => {
	const today = todayISO()
	return raceGoals.list.filter(r => r.date >= today && !(r.distance_km && r.goal_time_secs))
})

/**
 * The thing you are training for right now: the soonest dated target.
 *
 * There is no "pick the fastest" fallback any more. A goal with no date can't
 * be next, so it doesn't get a vote.
 */
export const activeTarget = computed<Target | null>(() => upcomingTargets.value[0] ?? null)

/**
 * The goal a session on `date` is training for: the soonest dated target on or
 * after it. A race-pace session in September must rehearse September's race, not
 * whichever goal happens to be nearest *today*.
 */
export function targetForDate(date: string): Target | null {
	return targets.value
		.filter((t): t is Target & { date: string } => t.date !== null && t.date >= date)
		.sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
}

/** The next race on the calendar, whether or not it has a goal time. */
export const nextRace = computed<RaceGoal | null>(() => {
	const today = todayISO()
	return raceGoals.list
		.filter(g => g.date >= today)
		.sort((a, b) => a.date.localeCompare(b.date) || (a.priority ?? 'A').localeCompare(b.priority ?? 'A'))[0] ?? null
})
