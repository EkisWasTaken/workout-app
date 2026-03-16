import { supabase } from './supabase'
import type { Workout, DailyWeight, Nutrition, WorkoutTemplate, WorkoutTemplateExercise, Exercise } from './types'

// Helper to check if we are in Electron and the DB bridge is available
const isElectron = () => {
  return window && window.ipcRenderer && window.db
}

export const db = {
  // WORKOUTS
  getWorkouts: async (): Promise<Workout[]> => {
    if (isElectron()) return window.db.getWorkouts()
    
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('isDeleted', 0)
    
    if (error) throw error
    return data as Workout[]
  },

  getCompletedWorkouts: async (limit?: number, offset?: number): Promise<Workout[]> => {
    if (isElectron()) return window.db.getCompletedWorkouts(limit, offset)
    
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
    if (isElectron()) return window.db.addWorkout(workout)
    
    const { data, error } = await supabase
      .from('workouts')
      .insert([workout])
      .select()
    
    if (error) throw error
    return data[0].id
  },

  updateWorkout: async (workout: Workout): Promise<number> => {
    if (isElectron()) return window.db.updateWorkout(workout)
    
    const { error } = await supabase
      .from('workouts')
      .update(workout)
      .eq('id', workout.id)
    
    if (error) throw error
    return 1
  },

  deleteWorkout: async (id: number): Promise<number> => {
    if (isElectron()) return window.db.deleteWorkout(id)
    
    const { error } = await supabase
      .from('workouts')
      .update({ isDeleted: 1 })
      .eq('id', id)
    
    if (error) throw error
    return 1
  },

  completeWorkout: async (data: any): Promise<number> => {
    if (isElectron()) return window.db.completeWorkout(data)
    
    const { id, ...updates } = data
    const { error } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', id)
    
    if (error) throw error
    return 1
  },

  getWorkoutById: async (id: number): Promise<Workout> => {
    if (isElectron()) return window.db.getWorkoutById(id)
    
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Workout
  },

  // WEIGHTS
  getDailyWeights: async (): Promise<DailyWeight[]> => {
    if (isElectron()) return window.db.getDailyWeights()
    
    const { data, error } = await supabase
      .from('daily_weights')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) throw error
    return data as DailyWeight[]
  },

  addDailyWeight: async (dailyWeight: Omit<DailyWeight, 'id'>): Promise<number> => {
    if (isElectron()) return window.db.addDailyWeight(dailyWeight)
    
    const { data, error } = await supabase
      .from('daily_weights')
      .upsert([dailyWeight], { onConflict: 'date' })
      .select()
    
    if (error) throw error
    return data[0].id
  },

  // COLORS
  getWorkoutTypeColors: async () => {
    if (isElectron()) return window.db.getWorkoutTypeColors()
    
    const { data, error } = await supabase
      .from('workout_type_colors')
      .select('type, color')
    
    if (error) throw error
    return data
  },

  setWorkoutTypeColor: async (data: { type: string; color: string }) => {
    if (isElectron()) return window.db.setWorkoutTypeColor(data)
    
    const { error } = await supabase
      .from('workout_type_colors')
      .upsert([data])
    
    if (error) throw error
    return 1
  },

  // TEMPLATES
  getWorkoutTemplates: async (): Promise<WorkoutTemplate[]> => {
    if (isElectron()) return window.db.getWorkoutTemplates()
    
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
    
    if (error) throw error
    return data as WorkoutTemplate[]
  },

  addWorkoutTemplate: async (template: { name: string; exercises: any[] }): Promise<number> => {
    if (isElectron()) return window.db.addWorkoutTemplate(template)
    
    // In Supabase we need to do this in two steps or use a RPC
    const { data: tData, error: tError } = await supabase
      .from('workout_templates')
      .insert([{ name: template.name }])
      .select()
    
    if (tError) throw tError
    const templateId = tData[0].id
    
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
    if (isElectron()) return window.db.getWorkoutTemplateExercises(templateId)
    
    const { data, error } = await supabase
      .from('workout_template_exercises')
      .select('*')
      .eq('template_id', templateId)
    
    if (error) throw error
    return data as WorkoutTemplateExercise[]
  },

  deleteWorkoutTemplate: async (templateId: number): Promise<boolean> => {
    if (isElectron()) return window.db.deleteWorkoutTemplate(templateId)
    
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId)
    
    if (error) throw error
    return true
  },

  // EXERCISES
  getExercises: async (): Promise<Exercise[]> => {
    if (isElectron()) return window.db.getExercises()
    
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
    
    if (error) throw error
    return data as Exercise[]
  }
}
