import { db } from './db'
import { stravaApi } from './stravaBridge'

/**
 * Unified activity source: file imports (Supabase) merged with the Strava
 * API when a connection still works. Imports are the primary source now
 * that Strava's API requires a paid developer subscription — everything
 * degrades gracefully when Strava is unreachable.
 */

/** True when two activities are the same recording seen from two sources. */
function isSameActivity(a: any, b: any): boolean {
	const ta = new Date(a.start_date || a.start_date_local).getTime()
	const tb = new Date(b.start_date || b.start_date_local).getTime()
	if (isNaN(ta) || isNaN(tb) || Math.abs(ta - tb) > 120000) return false
	const da = a.distance || 0, db_ = b.distance || 0
	return Math.abs(da - db_) < Math.max(200, da * 0.05)
}

export const activityApi = {
	/** All activities, newest first. Imported files win over Strava duplicates. */
	getAllActivities: async (): Promise<any[]> => {
		let imported: any[] = []
		try {
			imported = await db.getImportedActivities()
		} catch (e) {
			console.warn('Imported activities unavailable (table missing?):', e)
		}

		let strava: any[] = []
		try {
			if (await stravaApi.isStravaConnected()) {
				const pages = await Promise.all([
					stravaApi.getActivities(1, 30),
					stravaApi.getActivities(2, 30),
					stravaApi.getActivities(3, 30),
				])
				strava = pages.flat().filter(a => a && a.id)
			}
		} catch (e) {
			console.warn('Strava unavailable, using imported activities only:', e)
		}

		const merged = [
			...imported,
			...strava.filter(s => !imported.some(i => isSameActivity(i, s))),
		]
		return merged.sort((a, b) =>
			new Date(b.start_date || b.start_date_local).getTime() -
			new Date(a.start_date || a.start_date_local).getTime()
		)
	},

	/** Look up one activity: imported table first, then the Strava API. */
	getActivityById: async (id: string | number): Promise<any | null> => {
		try {
			const imported = await db.getImportedActivityById(Number(id))
			if (imported) return imported
		} catch (e) {
			console.warn('Imported activity lookup failed:', e)
		}
		try {
			return await stravaApi.getStravaActivityById(String(id))
		} catch {
			return null
		}
	},
}
