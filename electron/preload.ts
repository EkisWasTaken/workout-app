import { ipcRenderer, contextBridge } from 'electron'
import type { Nutrition, DailyWeight, Workout } from '../src/types';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('db', {
  getWorkouts: () => ipcRenderer.invoke('get-workouts'),
  getCompletedWorkouts: (limit?: number, offset?: number) => ipcRenderer.invoke('get-completed-workouts', limit, offset),
  addWorkout: (workout: { name: string; date: string; type?: string; targetPace?: string; gymType?: string; isCompleted?: number; }) => ipcRenderer.invoke('add-workout', workout),
  updateWorkout: (workout: Workout) => ipcRenderer.invoke('update-workout', workout),
  deleteWorkout: (id: number) => ipcRenderer.invoke('delete-workout', id),
  deleteWorkouts: (ids: number[]) => ipcRenderer.invoke('delete-workouts', ids),
  completeWorkout: (data: {
    id: number;
    isCompleted: number;
    actualDuration?: number;
    rpe?: number;
    notes?: string;
    totalWeightLifted?: number;
    stravaActivityId?: string;
    distance?: number; // Added distance to preload interface
  }) => ipcRenderer.invoke('complete-workout', data),
  getWorkoutById: (id: number) => ipcRenderer.invoke('get-workout-by-id', id),
  getWorkoutTypeColors: () => ipcRenderer.invoke('get-workout-type-colors'),
  setWorkoutTypeColor: (data: { type: string; color: string }) => ipcRenderer.invoke('set-workout-type-color', data),
  getNutritions: () => ipcRenderer.invoke('get-nutritions'),
  addNutrition: (nutrition: Nutrition) => ipcRenderer.invoke('add-nutrition', nutrition),
  addDailyWeight: (dailyWeight: DailyWeight) => ipcRenderer.invoke('add-daily-weight', dailyWeight),
  getDailyWeights: () => ipcRenderer.invoke('get-daily-weights'),
  getWorkoutTemplates: () => ipcRenderer.invoke('get-workout-templates'),
  addWorkoutTemplate: (template: { name: string; exercises: any[] }) => ipcRenderer.invoke('add-workout-template', template),
  getWorkoutTemplateExercises: (templateId: number) => ipcRenderer.invoke('get-workout-template-exercises', templateId),
  deleteWorkoutTemplate: (templateId: number) => ipcRenderer.invoke('delete-workout-template', templateId),
  getExercises: () => ipcRenderer.invoke('get-exercises'),
})

contextBridge.exposeInMainWorld('fileApi', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
})

contextBridge.exposeInMainWorld('stravaApi', {
  getAuthUrl: () => ipcRenderer.invoke('get-strava-auth-url'),
  exchangeCodeForToken: (code: string) => ipcRenderer.invoke('strava-exchange-code', code),
  getActivities: (page?: number, per_page?: number) => ipcRenderer.invoke('strava-get-activities', page, per_page),
  isStravaConnected: () => ipcRenderer.invoke('strava-is-connected'),
  linkStravaActivity: (workoutId: number, stravaActivityId: string) => ipcRenderer.invoke('link-strava-activity', { workoutId, stravaActivityId }),
  getStravaActivityById: (activityId: string) => ipcRenderer.invoke('get-strava-activity-by-id', activityId),
})
