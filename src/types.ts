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

export interface StravaActivity {
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

export interface CompleteWorkoutFormValues {
    actualDuration: number | undefined;
    rpe: number;
    notes: string;
    totalWeightLifted: number;
    stravaActivityId?: number; // Changed from number | null to number | undefined
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

export interface RaceGoal {
	id: number;
	name: string;
	date: string;
}

export type AddRaceGoalPayload = Omit<RaceGoal, 'id'>;
