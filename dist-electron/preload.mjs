"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("db", {
  getWorkouts: () => electron.ipcRenderer.invoke("get-workouts"),
  getCompletedWorkouts: (limit, offset) => electron.ipcRenderer.invoke("get-completed-workouts", limit, offset),
  addWorkout: (workout) => electron.ipcRenderer.invoke("add-workout", workout),
  updateWorkout: (workout) => electron.ipcRenderer.invoke("update-workout", workout),
  deleteWorkout: (id) => electron.ipcRenderer.invoke("delete-workout", id),
  deleteWorkouts: (ids) => electron.ipcRenderer.invoke("delete-workouts", ids),
  completeWorkout: (data) => electron.ipcRenderer.invoke("complete-workout", data),
  getWorkoutById: (id) => electron.ipcRenderer.invoke("get-workout-by-id", id),
  getWorkoutTypeColors: () => electron.ipcRenderer.invoke("get-workout-type-colors"),
  setWorkoutTypeColor: (data) => electron.ipcRenderer.invoke("set-workout-type-color", data),
  getNutritions: () => electron.ipcRenderer.invoke("get-nutritions"),
  addNutrition: (nutrition) => electron.ipcRenderer.invoke("add-nutrition", nutrition),
  addDailyWeight: (dailyWeight) => electron.ipcRenderer.invoke("add-daily-weight", dailyWeight),
  getDailyWeights: () => electron.ipcRenderer.invoke("get-daily-weights"),
  getWorkoutTemplates: () => electron.ipcRenderer.invoke("get-workout-templates"),
  addWorkoutTemplate: (template) => electron.ipcRenderer.invoke("add-workout-template", template),
  getWorkoutTemplateExercises: (templateId) => electron.ipcRenderer.invoke("get-workout-template-exercises", templateId),
  deleteWorkoutTemplate: (templateId) => electron.ipcRenderer.invoke("delete-workout-template", templateId),
  getExercises: () => electron.ipcRenderer.invoke("get-exercises"),
  getRaceGoals: () => electron.ipcRenderer.invoke("get-race-goals"),
  addRaceGoal: (raceGoal) => electron.ipcRenderer.invoke("add-race-goal", raceGoal),
  deleteRaceGoal: (id) => electron.ipcRenderer.invoke("delete-race-goal", id)
});
electron.contextBridge.exposeInMainWorld("fileApi", {
  openFileDialog: () => electron.ipcRenderer.invoke("open-file-dialog"),
  readFile: (filePath) => electron.ipcRenderer.invoke("read-file", filePath)
});
electron.contextBridge.exposeInMainWorld("stravaApi", {
  getAuthUrl: () => electron.ipcRenderer.invoke("get-strava-auth-url"),
  exchangeCodeForToken: (code) => electron.ipcRenderer.invoke("strava-exchange-code", code),
  getActivities: (page, per_page) => electron.ipcRenderer.invoke("strava-get-activities", page, per_page),
  isStravaConnected: () => electron.ipcRenderer.invoke("strava-is-connected"),
  linkStravaActivity: (workoutId, stravaActivityId) => electron.ipcRenderer.invoke("link-strava-activity", { workoutId, stravaActivityId }),
  getStravaActivityById: (activityId) => electron.ipcRenderer.invoke("get-strava-activity-by-id", activityId)
});
