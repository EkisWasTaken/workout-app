/**
 * Import a .fit/.gpx/.tcx recording and derive the workout fields that linking
 * it implies. Shared by the Schedule completion dialog and the Home "today"
 * cards so binding a file behaves identically wherever it's offered.
 */
import { parseActivityFile } from '@/import/parseActivityFile'
import { db } from '@/db'

export interface ImportedFit {
	/** Row id in imported_activities to link the workout to (0 if a duplicate
	 *  existed but couldn't be located). */
	activityId: number
	/** Parsed activity: distance in metres, moving_time in seconds, start_date. */
	activity: any
	/** True when this recording was already imported earlier. */
	duplicate: boolean
}

/** Parse a recording file, store it (or find the copy already imported), and
 *  return the imported-activity id a workout should link to. */
export async function importFitFile(file: File): Promise<ImportedFit> {
	const activity = await parseActivityFile(file)
	const res = await db.addImportedActivity(activity)
	if (!res.duplicate) return { activityId: res.id, activity, duplicate: false }

	// Already imported: locate the existing copy so we can still link to it.
	const existing = await db.getImportedActivities()
	const t = new Date(activity.start_date).getTime()
	const match = existing.find((a: any) => {
		const ta = new Date(a.start_date || a.start_date_local).getTime()
		return Math.abs(ta - t) < 120000 && Math.abs((a.distance || 0) - activity.distance) < 200
	})
	return { activityId: match?.id ?? 0, activity, duplicate: true }
}

/** The workout-field updates a linked recording implies: its id, plus the actual
 *  distance (km) and moving time (min) pulled straight from the file. */
export function fitUpdates(imported: ImportedFit): {
	stravaActivityId?: number
	distance?: number
	actualDuration?: number
} {
	const { activityId, activity } = imported
	const updates: { stravaActivityId?: number; distance?: number; actualDuration?: number } = {}
	if (activityId) updates.stravaActivityId = activityId
	if (activity.distance) updates.distance = Math.round((activity.distance / 1000) * 100) / 100
	if (activity.moving_time) updates.actualDuration = Math.round(activity.moving_time / 60)
	return updates
}
