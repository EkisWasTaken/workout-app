import { supabase } from './supabase'
import type { Workout, DailyWeight, WorkoutTemplate, WorkoutTemplateExercise, Exercise, RaceGoal, AddRaceGoalPayload, DistanceGoal, Profile } from './types'

/** Thrown when supabase_goals.sql hasn't been run yet. */
export const MISSING_GOALS_TABLES = 'MISSING_GOALS_TABLES'
/** Thrown when supabase_goals_v2.sql hasn't been run yet. */
export const MISSING_GOALS_COLUMNS = 'MISSING_GOALS_COLUMNS'

/**
 * A table that doesn't exist. PostgREST answers PGRST205 ("not found in the
 * schema cache") rather than passing through Postgres's own 42P01, so match both.
 */
const isMissingTable = (error: { code?: string } | null) =>
  error?.code === 'PGRST205' || error?.code === '42P01'

/** 42703 = undefined_column: the v1 tables exist but v2 hasn't been applied. */
const isMissingColumn = (error: { code?: string } | null) => error?.code === '42703'

/**
 * Flipped to false the first time a v2 column comes back missing, so reads fall
 * back and v2-only writes fail loudly instead of silently dropping data.
 */
export const schema = { v2: true }

export const db = {
  // PROFILE (single row, id = 1)
  getProfile: async (): Promise<Profile | null> => {
    const full = await supabase
      .from('profile')
      .select('user_name, goal_weight, resting_hr, max_hr, vdot_override')
      .eq('id', 1)
      .maybeSingle()

    if (!full.error) return full.data as Profile | null
    if (isMissingTable(full.error)) throw new Error(MISSING_GOALS_TABLES)
    if (!isMissingColumn(full.error)) throw full.error

    // v2 not applied yet: read what exists so the rest of Profile still works.
    schema.v2 = false
    const base = await supabase
      .from('profile')
      .select('user_name, goal_weight, resting_hr, max_hr')
      .eq('id', 1)
      .maybeSingle()
    if (base.error) throw base.error
    return base.data ? ({ ...base.data, vdot_override: null } as Profile) : null
  },

  saveProfile: async (profile: Partial<Profile>): Promise<void> => {
    const row: Record<string, unknown> = { id: 1, ...profile, updated_at: new Date().toISOString() }
    if (!schema.v2) delete row.vdot_override

    const { error } = await supabase.from('profile').upsert([row])
    if (error) {
      if (isMissingTable(error)) throw new Error(MISSING_GOALS_TABLES)
      if (isMissingColumn(error)) throw new Error(MISSING_GOALS_COLUMNS)
      throw error
    }
  },

  // DISTANCE GOALS (5k / 10k / half / marathon)
  getDistanceGoals: async (): Promise<DistanceGoal[]> => {
    const full = await supabase
      .from('distance_goals')
      .select('distance_m, goal_time_secs, target_date')
      .order('distance_m', { ascending: true })

    if (!full.error) return full.data as DistanceGoal[]
    if (isMissingTable(full.error)) throw new Error(MISSING_GOALS_TABLES)
    if (!isMissingColumn(full.error)) throw full.error

    schema.v2 = false
    const base = await supabase
      .from('distance_goals')
      .select('distance_m, goal_time_secs')
      .order('distance_m', { ascending: true })
    if (base.error) throw base.error
    return (base.data ?? []).map(g => ({ ...g, target_date: null })) as DistanceGoal[]
  },

  setDistanceGoal: async (goal: DistanceGoal): Promise<void> => {
    // Silently dropping the date would look like a successful save.
    if (!schema.v2 && goal.target_date) throw new Error(MISSING_GOALS_COLUMNS)

    const row: Record<string, unknown> = {
      distance_m: goal.distance_m,
      goal_time_secs: goal.goal_time_secs,
      updated_at: new Date().toISOString(),
    }
    if (schema.v2) row.target_date = goal.target_date ?? null

    const { error } = await supabase.from('distance_goals').upsert([row])
    if (error) {
      if (isMissingTable(error)) throw new Error(MISSING_GOALS_TABLES)
      if (isMissingColumn(error)) throw new Error(MISSING_GOALS_COLUMNS)
      throw error
    }
  },

  deleteDistanceGoal: async (distance_m: number): Promise<void> => {
    const { error } = await supabase
      .from('distance_goals')
      .delete()
      .eq('distance_m', distance_m)
    if (error) throw error
  },

  // RACE GOALS
  getRaceGoals: async (): Promise<RaceGoal[]> => {
    const { data, error } = await supabase
      .from('race_goals')
      .select('*')
      .order('date', { ascending: true })
    if (error) throw error
    return data as RaceGoal[]
  },

  updateRaceGoal: async (goal: RaceGoal): Promise<void> => {
    const { id, ...updates } = goal
    // Dropping the result silently would look like it saved.
    if (!schema.v2 && updates.result_time_secs != null) throw new Error(MISSING_GOALS_COLUMNS)
    if (!schema.v2) delete (updates as Record<string, unknown>).result_time_secs

    const { error } = await supabase
      .from('race_goals')
      .update(updates)
      .eq('id', id)
    if (error) {
      if (isMissingColumn(error)) throw new Error(MISSING_GOALS_COLUMNS)
      throw error
    }
  },

  addRaceGoal: async (raceGoal: AddRaceGoalPayload): Promise<number> => {
    const { data, error } = await supabase
      .from('race_goals')
      .insert([raceGoal])
      .select()
    if (error) throw error
    return data[0].id
  },

  deleteRaceGoal: async (id: number): Promise<number> => {
    const { error } = await supabase
      .from('race_goals')
      .delete()
      .eq('id', id)
    if (error) throw error
    return 1
  },

  // WORKOUTS
  getWorkouts: async (): Promise<Workout[]> => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('isDeleted', 0)
    if (error) throw error
    return data as Workout[]
  },

  getCompletedWorkouts: async (limit?: number, offset?: number): Promise<Workout[]> => {
    let query = supabase
      .from('workouts')
      .select('*')
      .eq('isCompleted', 1)
      .eq('isDeleted', 0)
      .order('date', { ascending: false })

    if (limit !== undefined) {
      const from = offset || 0
      const to = from + limit - 1
      query = query.range(from, to)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Workout[]
  },

  addWorkout: async (workout: Omit<Workout, 'id'>): Promise<number> => {
    let attempts = 0
    while (attempts < 50) {
      const { data, error } = await supabase
        .from('workouts')
        .insert([workout])
        .select()

      if (!error) return data[0].id

      if (error.code === '23505' && (error.message.includes('id') || error.message.includes('pkey') || (error.details && error.details.includes('id')))) {
        attempts++
        continue
      }
      throw error
    }
    throw new Error('MAX_RETRY_EXCEEDED_SYNC_DB_SEQUENCE')
  },

  updateWorkout: async (workout: Workout): Promise<number> => {
    const { error } = await supabase
      .from('workouts')
      .update(workout)
      .eq('id', workout.id)
    if (error) throw error
    return 1
  },

  deleteWorkout: async (id: number): Promise<number> => {
    const { error } = await supabase
      .from('workouts')
      .update({ isDeleted: 1 })
      .eq('id', id)
    if (error) throw error
    return 1
  },

  completeWorkout: async (data: any): Promise<number> => {
    const { id, ...updates } = data
    const { error } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    return 1
  },

  getWorkoutById: async (id: number): Promise<Workout | null> => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as Workout | null
  },

  // WEIGHTS
  getDailyWeights: async (): Promise<DailyWeight[]> => {
    const { data, error } = await supabase
      .from('daily_weights')
      .select('*')
      .order('date', { ascending: true })
    if (error) throw error
    return data as DailyWeight[]
  },

  addDailyWeight: async (dailyWeight: Omit<DailyWeight, 'id'>): Promise<number> => {
    let attempts = 0
    while (attempts < 50) {
      const { data, error } = await supabase
        .from('daily_weights')
        .upsert([dailyWeight], { onConflict: 'date' })
        .select()

      if (!error) return data[0].id

      if (error.code === '23505' && (error.message.includes('id') || error.message.includes('pkey') || (error.details && error.details.includes('id')))) {
        attempts++
        continue
      }
      throw error
    }
    throw new Error('MAX_RETRY_EXCEEDED_SYNC_DB_SEQUENCE')
  },

  // COLORS
  getWorkoutTypeColors: async () => {
    const { data, error } = await supabase
      .from('workout_type_colors')
      .select('type, color')
    if (error) throw error
    return data
  },

  setWorkoutTypeColor: async (data: { type: string; color: string }) => {
    const { error } = await supabase
      .from('workout_type_colors')
      .upsert([data])
    if (error) throw error
    return 1
  },

  // TEMPLATES
  getWorkoutTemplates: async (): Promise<WorkoutTemplate[]> => {
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
    if (error) throw error
    return data as WorkoutTemplate[]
  },

  addWorkoutTemplate: async (template: { name: string; exercises: any[] }): Promise<number> => {
    let attempts = 0
    let templateId: number | null = null

    while (attempts < 50) {
      const { data: tData, error: tError } = await supabase
        .from('workout_templates')
        .insert([{ name: template.name }])
        .select()

      if (!tError) {
        templateId = tData[0].id
        break
      }

      if (tError.code === '23505' && (tError.message.includes('id') || tError.message.includes('pkey') || (tError.details && tError.details.includes('id')))) {
        attempts++
        continue
      }
      throw tError
    }

    if (!templateId) throw new Error('MAX_RETRY_EXCEEDED_SYNC_DB_SEQUENCE')

    const exercisesToInsert = template.exercises.map(ex => ({
      ...ex,
      template_id: templateId
    }))

    const { error: eError } = await supabase
      .from('workout_template_exercises')
      .insert(exercisesToInsert)
    if (eError) throw eError
    return templateId
  },

  getWorkoutTemplateExercises: async (templateId: number): Promise<WorkoutTemplateExercise[]> => {
    const { data, error } = await supabase
      .from('workout_template_exercises')
      .select('*')
      .eq('template_id', templateId)
    if (error) throw error
    return data as WorkoutTemplateExercise[]
  },

  deleteWorkoutTemplate: async (templateId: number): Promise<boolean> => {
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId)
    if (error) throw error
    return true
  },

  // EXERCISES
  getExercises: async (): Promise<Exercise[]> => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
    if (error) throw error
    return data as Exercise[]
  },

  // IMPORTED ACTIVITIES (FIT/GPX/TCX files)
  getImportedActivities: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('imported_activities')
      .select('id, data')
      .order('start_date', { ascending: false })
    if (error) throw error
    return (data || []).map(row => ({ ...row.data, id: row.id, source: 'import' }))
  },

  getImportedActivityById: async (id: number): Promise<any | null> => {
    const { data, error } = await supabase
      .from('imported_activities')
      .select('id, data')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? { ...data.data, id: data.id, source: 'import' } : null
  },

  addImportedActivity: async (activity: any): Promise<{ id: number; duplicate: boolean }> => {
    const row = {
      start_date: activity.start_date,
      name: activity.name,
      sport: activity.sport_type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      data: activity,
    }
    const { data, error } = await supabase
      .from('imported_activities')
      .insert([row])
      .select('id')
    if (error) {
      // 23505 = unique violation on (start_date, distance): already imported
      if (error.code === '23505') return { id: 0, duplicate: true }
      if (isMissingTable(error)) {
        throw new Error('MISSING_TABLE: run supabase_imported_activities.sql in the Supabase SQL editor first.')
      }
      throw error
    }
    return { id: data[0].id, duplicate: false }
  },

  deleteImportedActivity: async (id: number): Promise<number> => {
    const { error } = await supabase
      .from('imported_activities')
      .delete()
      .eq('id', id)
    if (error) throw error
    return 1
  }
}
