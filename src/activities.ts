import { db } from './db'

/**
 * Activity source: FIT/GPX file imports stored in Supabase.
 * (Strava API integration was removed when the API became pay-gated.)
 */
export const activityApi = {
	/** All imported activities, newest first. */
	getAllActivities: async (): Promise<any[]> => {
		let imported: any[] = []
		try {
			imported = await db.getImportedActivities()
		} catch (e) {
			console.warn('Imported activities unavailable (table missing?):', e)
		}
		return imported.sort((a, b) =>
			new Date(b.start_date || b.start_date_local).getTime() -
			new Date(a.start_date || a.start_date_local).getTime()
		)
	},

	/**
	 * Look up one imported activity by id.
	 *
	 * Callers normalise with `toActivityId` first: a workout's stored link has
	 * been written in several shapes over the years, and a dead pre-migration
	 * Strava id simply finds nothing here, which is the correct answer.
	 */
	getActivityById: async (id: number): Promise<any | null> => {
		try {
			return await db.getImportedActivityById(id)
		} catch (e) {
			console.warn('Imported activity lookup failed:', e)
			return null
		}
	},
}
