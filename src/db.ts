import { supabase } from './supabase'
import type { Workout, DailyWeight, WorkoutTemplate, WorkoutTemplateExercise, Exercise, RaceGoal, AddRaceGoalPayload } from './types'

// Helper to check if we are in Electron and the DB bridge is available
const isElectron = () => {
  return typeof window !== 'undefined' && !!(window as any).ipcRenderer && !!(window as any).db
}

export const db = {
  // RACE GOALS
  getRaceGoals: async (): Promise<RaceGoal[]> => {
    if (isElectron()) return (window as any).db.getRaceGoals()
    
    const { data, error } = await supabase
      .from('race_goals')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) throw error
    return data as RaceGoal[]
  },

  addRaceGoal: async (raceGoal: AddRaceGoalPayload): Promise<number> => {
    if (isElectron()) return (window as any).db.addRaceGoal(raceGoal)
    
    const { data, error } = await supabase
      .from('race_goals')
      .insert([raceGoal])
      .select()
    
    if (error) throw error
    return data[0].id
  },

  deleteRaceGoal: async (id: number): Promise<number> => {
    if (isElectron()) return (window as any).db.deleteRaceGoal(id)
    
    const { error } = await supabase
      .from('race_goals')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return 1
  },

  // WORKOUTS
  getWorkouts: async (): Promise<Workout[]> => {
    if (isElectron()) return (window as any).db.getWorkouts()
    
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('isDeleted', 0)
    
    if (error) throw error
    return data as Workout[]
  },

  getCompletedWorkouts: async (limit?: number, offset?: number): Promise<Workout[]> => {
    if (isElectron()) return (window as any).db.getCompletedWorkouts(limit, offset)
    
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
    if (isElectron()) return (window as any).db.addWorkout(workout)
    
    let attempts = 0;
    while (attempts < 50) {
      const { data, error } = await supabase
        .from('workouts')
        .insert([workout])
        .select()
      
      if (!error) return data[0].id
      
      // Error 23505 is duplicate key. If it's on 'id', the sequence is out of sync.
      if (error.code === '23505' && (error.message.includes('id') || error.message.includes('pkey') || (error.details && error.details.includes('id')))) {
        attempts++;
        continue;
      }
      throw error
    }
    throw new Error('MAX_RETRY_EXCEEDED_SYNC_DB_SEQUENCE')
  },

  updateWorkout: async (workout: Workout): Promise<number> => {
    if (isElectron()) return (window as any).db.updateWorkout(workout)
    
    const { error } = await supabase
      .from('workouts')
      .update(workout)
      .eq('id', workout.id)
    
    if (error) throw error
    return 1
  },

  deleteWorkout: async (id: number): Promise<number> => {
    if (isElectron()) return (window as any).db.deleteWorkout(id)
    
    const { error } = await supabase
      .from('workouts')
      .update({ isDeleted: 1 })
      .eq('id', id)
    
    if (error) throw error
    return 1
  },

  completeWorkout: async (data: any): Promise<number> => {
    if (isElectron()) return (window as any).db.completeWorkout(data)
    
    const { id, ...updates } = data
    const { error } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', id)
    
    if (error) throw error
    return 1
  },

  getWorkoutById: async (id: number): Promise<Workout | null> => {
    if (isElectron()) {
        const result = await (window as any).db.getWorkoutById(id);
        return result ?? null;
    }
    
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
    if (isElectron()) return (window as any).db.getDailyWeights()
    
    const { data, error } = await supabase
      .from('daily_weights')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) throw error
    return data as DailyWeight[]
  },

  addDailyWeight: async (dailyWeight: Omit<DailyWeight, 'id'>): Promise<number> => {
    if (isElectron()) return (window as any).db.addDailyWeight(dailyWeight)
    
    let attempts = 0;
    while (attempts < 50) {
      const { data, error } = await supabase
        .from('daily_weights')
        .upsert([dailyWeight], { onConflict: 'date' })
        .select()
      
      if (!error) return data[0].id
      
      if (error.code === '23505' && (error.message.includes('id') || error.message.includes('pkey') || (error.details && error.details.includes('id')))) {
        attempts++;
        continue;
      }
      throw error
    }
    throw new Error('MAX_RETRY_EXCEEDED_SYNC_DB_SEQUENCE')
  },

  // COLORS
  getWorkoutTypeColors: async () => {
    if (isElectron()) return (window as any).db.getWorkoutTypeColors()
    
    const { data, error } = await supabase
      .from('workout_type_colors')
      .select('type, color')
    
    if (error) throw error
    return data
  },

  setWorkoutTypeColor: async (data: { type: string; color: string }) => {
    if (isElectron()) return (window as any).db.setWorkoutTypeColor(data)
    
    const { error } = await supabase
      .from('workout_type_colors')
      .upsert([data])
    
    if (error) throw error
    return 1
  },

  // TEMPLATES
  getWorkoutTemplates: async (): Promise<WorkoutTemplate[]> => {
    if (isElectron()) return (window as any).db.getWorkoutTemplates()
    
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
    
    if (error) throw error
    return data as WorkoutTemplate[]
  },

  addWorkoutTemplate: async (template: { name: string; exercises: any[] }): Promise<number> => {
    if (isElectron()) return (window as any).db.addWorkoutTemplate(template)
    
    let attempts = 0;
    let templateId: number | null = null;

    while (attempts < 50) {
      const { data: tData, error: tError } = await supabase
        .from('workout_templates')
        .insert([{ name: template.name }])
        .select()
      
      if (!tError) {
        templateId = tData[0].id;
        break;
      }
      
      if (tError.code === '23505' && (tError.message.includes('id') || tError.message.includes('pkey') || (tError.details && tError.details.includes('id')))) {
        attempts++;
        continue;
      }
      throw tError;
    }

    if (!templateId) throw new Error('MAX_RETRY_EXCEEDED_SYNC_DB_SEQUENCE');
    
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
    if (isElectron()) return (window as any).db.getWorkoutTemplateExercises(templateId)
    
    const { data, error } = await supabase
      .from('workout_template_exercises')
      .select('*')
      .eq('template_id', templateId)
    
    if (error) throw error
    return data as WorkoutTemplateExercise[]
  },

  deleteWorkoutTemplate: async (templateId: number): Promise<boolean> => {
    if (isElectron()) return (window as any).db.deleteWorkoutTemplate(templateId)
    
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId)
    
    if (error) throw error
    return true
  },

  // EXERCISES
  getExercises: async (): Promise<Exercise[]> => {
    if (isElectron()) return (window as any).db.getExercises()
    
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
    
    if (error) throw error
    return data as Exercise[]
  }
}
