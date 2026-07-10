/**
 * Sport classification for recorded activities.
 *
 * Read from the FIT file's own sport field, never guessed from the activity's
 * name — "Vätternrundan" is a bike ride whose name contains "run", and "Långlöp"
 * is a run that contains neither.
 */

export type ActivitySport = 'run' | 'ride' | 'walk' | 'hike' | 'swim' | 'other'

/** The parser emits Strava-style labels: Run / Ride / Walk / Hike / Swim / Workout. */
export function activitySport(activity: any): ActivitySport {
	const s = String(activity?.sport_type || activity?.type || '').toLowerCase()
	if (s === 'run') return 'run'
	if (s === 'ride') return 'ride'
	if (s === 'walk') return 'walk'
	if (s === 'hike') return 'hike'
	if (s === 'swim') return 'swim'
	return 'other'
}

/** Sports where total distance is a meaningful measure. */
export const DISTANCE_SPORTS: ActivitySport[] = ['run', 'ride']
