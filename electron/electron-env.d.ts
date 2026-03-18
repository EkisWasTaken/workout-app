/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
	interface ProcessEnv {
		APP_ROOT: string;
		VITE_PUBLIC: string;
	}
}

interface Window {
	ipcRenderer: import("electron").IpcRenderer;
	db: {
		getWorkouts: () => Promise<import("../src/types").Workout[]>;
		getCompletedWorkouts: (limit?: number, offset?: number) => Promise<import("../src/types").Workout[]>;
		addWorkout: (workout: import("../src/types").AddWorkoutPayload) => Promise<number>;
		updateWorkout: (workout: import("../src/types").Workout) => Promise<number>;
		deleteWorkout: (id: number) => Promise<number>;
		deleteWorkouts: (ids: number[]) => Promise<number>;
		completeWorkout: (data: {
			id: number;
			isCompleted: number;
			actualDuration?: number;
			rpe?: number;
			notes?: string;
			totalWeightLifted?: number;
			stravaActivityId?: string;
			distance?: number;
		}) => Promise<number>;
		getWorkoutById: (id: number) => Promise<import("../src/types").Workout | undefined>;
		getWorkoutTypeColors: () => Promise<{ type: string; color: string }[]>;
		setWorkoutTypeColor: (data: { type: string; color: string }) => Promise<number>;
		getNutritions: () => Promise<import("../src/types").Nutrition[]>;
		addNutrition: (nutrition: import("../src/types").Nutrition) => Promise<number>;
		addDailyWeight: (dailyWeight: { date: string; weight: number }) => Promise<number>;
		getDailyWeights: () => Promise<import("../src/types").DailyWeight[]>;
		getWorkoutTemplates: () => Promise<any[]>;
		addWorkoutTemplate: (template: { name: string; exercises: any[] }) => Promise<number>;
		getWorkoutTemplateExercises: (templateId: number) => Promise<any[]>;
		deleteWorkoutTemplate: (templateId: number) => Promise<boolean>;
		getExercises: () => Promise<any[]>;
		getRaceGoals: () => Promise<import("../src/types").RaceGoal[]>;
		addRaceGoal: (raceGoal: import("../src/types").AddRaceGoalPayload) => Promise<number>;
		deleteRaceGoal: (id: number) => Promise<number>;
	};
	fileApi: {
		openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
		readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
	};
	stravaApi: {
		getAuthUrl: () => Promise<string>;
		exchangeCodeForToken: (code: string) => Promise<string | null>;
		getActivities: (page?: number, per_page?: number) => Promise<import("../src/types").StravaActivity[] | { error: string; details?: any }>;
		isStravaConnected: () => Promise<boolean>;
		linkStravaActivity: (workoutId: number, stravaActivityId: string) => Promise<number | { error: string; message: string }>;
		getStravaActivityById: (activityId: string) => Promise<import("../src/types").StravaActivity | { error: string; details?: any }>;
	}
}
