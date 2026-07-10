export interface Workout {
	id: number;
	date: string;
	name: string;
	duration?: number;
	caloriesBurned?: number;
	type?: string;
	targetPace?: string;
	gymType?: string;
	isCompleted?: number;
	stravaActivityId?: number; // Changed from string to number
	actualDuration?: number;
	rpe?: number;
	notes?: string;
	totalWeightLifted?: number;
	distance?: number;
}

/** Normalised activity shape (originally modelled on the Strava API response). */
export interface Activity {
	id: number;
	name: string;
	distance: number;
	moving_time: number;
	type: string;
	sport_type?: string;
	start_date?: string; // Added for activity list data
	start_date_local: string;
	map?: {
		polyline?: string;
		summary_polyline?: string;
	};
	calories?: number;
	average_heartrate?: number;
	total_elevation_gain?: number;
	splits_metric?: Array<{
		distance: number;
		elapsed_time: number;
		elevation_difference: number;
		pace_zone: number;
		moving_time: number;
		split: number;
		average_speed: number;
		average_heartrate?: number;
		achievements?: any[];
		key_feature?: boolean;
	}>;
}

/** Downsampled per-second sensor data kept from an imported FIT/GPX file. */
export interface ActivityStreams {
	time: number[];        // seconds since start
	heartrate?: (number | null)[];
	velocity?: (number | null)[]; // m/s
	altitude?: (number | null)[]; // m
	distance?: (number | null)[]; // cumulative metres
	cadence?: (number | null)[];  // spm (runs) or rpm (rides)
}

export interface BestEffort {
	name: string;          // e.g. "1 km", "5 km"
	distance: number;      // metres
	elapsed_time: number;  // seconds
}

/**
 * An activity imported from a FIT/GPX file, plus raw streams and best
 * efforts extracted during parsing.
 */
export interface ImportedActivity extends Activity {
	source: 'import';
	average_speed?: number;      // m/s
	max_heartrate?: number;
	average_cadence?: number;    // spm (runs) or rpm (rides)
	elapsed_time?: number;
	streams?: ActivityStreams;
	best_efforts?: BestEffort[];
}

export interface CompleteWorkoutFormValues {
    notes: string;
    totalWeightLifted: number;
    stravaActivityId?: number;
    distance?: number;
}

export interface DateDataPoint {
  timestamp: number;
  value: number;
}

export type AddWorkoutPayload = Omit<Workout, "id">;
export type AddNutritionPayload = Omit<Nutrition, 'id'>;

export interface Nutrition {
	id: number;
	date: string;
	name: string;
	energyTarget_kcal?: number;
	proteinTarget_g?: number;
	carbTarget_g?: number;
	fatTarget_g?: number;
	mealsPerDay?: number;
	preWorkoutCarbs_g?: number;
	postWorkoutProtein_g?: number;
	hydration_ml?: number;
	fiber_g?: number;
	bodyWeightTarget_kg?: number;
	notes?: string;
}

export interface DailyWeight {
	id: number;
	date: string;
	weight: number;
}

export type AddDailyWeightPayload = Omit<DailyWeight, 'id'>;

export interface WorkoutTemplate {
	id: number;
	name: string;
}

export interface WorkoutTemplateExercise {
	id: number;
	template_id: number;
	exercise_name: string;
	sets?: number;
	reps?: string;
	notes?: string;
}

export interface Exercise {
  id: number;
  name: string;
  body_part: string;
}

export type RacePriority = 'A' | 'B' | 'C';

export interface RaceGoal {
	id: number;
	name: string;
	date: string;
	distance_km?: number | null;
	goal_time_secs?: number | null;
	/** What you actually ran. The most trustworthy input to current VDOT. */
	result_time_secs?: number | null;
	priority?: RacePriority;
}

export type AddRaceGoalPayload = Omit<RaceGoal, 'id'>;

/**
 * A standing target time for one canonical distance.
 * `target_date` null means "someday": tracked as a gap, never drives paces.
 */
export interface DistanceGoal {
	distance_m: number;
	goal_time_secs: number;
	target_date?: string | null;
}

/** Single-row settings, previously scattered across localStorage. */
export interface Profile {
	user_name: string | null;
	goal_weight: number | null;
	resting_hr: number | null;
	max_hr: number | null;
	/** Manual current VDOT; overrides everything derived from activities. */
	vdot_override: number | null;
}

/**
 * A dated thing you are training for — the unification of a race goal and a
 * standing distance goal. `date` null means aspirational.
 */
export interface Target {
	key: string;
	name: string;
	distanceM: number;
	goalTimeSecs: number;
	date: string | null;
	neededVdot: number;
	kind: 'race' | 'distance';
}
