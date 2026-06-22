<template>
	<div class="profile-view-wrapper">
		<div class="profile-content">
			<h1 class="page-title">Profile &amp; settings</h1>

			<n-space vertical size="large" style="width: 100%">
				<!-- Settings Card -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Preferences</span></template>
					<n-space vertical>
						<n-form-item label="Your name">
							<n-input v-model:value="userName" placeholder="Enter your name" />
						</n-form-item>
						<n-form-item label="Goal body weight (kg)">
							<n-input v-model:value="goalWeight" type="text" placeholder="e.g. 75.5" />
						</n-form-item>
						<n-button @click="saveProfile" type="primary">Save profile</n-button>
					</n-space>
				</n-card>

				<!-- Integrations Card -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Integrations</span></template>
					<n-spin :show="connectingToStrava">
						<n-space vertical>
							<div class="uplink-item">
								<div class="uplink-header">
									<div class="uplink-info">
										<n-icon color="#fc5100" :component="Strava" /> Strava
									</div>
									<n-tag :type="isStravaConnected ? 'success' : 'error'" round>
										{{ isStravaConnected ? "Connected" : "Not connected" }}
									</n-tag>
								</div>

								<div class="strava-button-line-tag-group">
									<n-button
										@click="handleConnectToStrava"
										:type="isStravaConnected ? 'default' : 'primary'"
									>
										<template #icon>
											<n-icon color="#fc5100" :component="Strava" />
										</template>
										{{ isStravaConnected ? "Reconnect" : "Connect Strava" }}
									</n-button>
									<div class="status-text" :class="{ 'text-success': isStravaConnected }">
										{{ isStravaConnected ? "Sync ready" : "Awaiting authorization" }}
									</div>
								</div>
							</div>
						</n-space>
					</n-spin>
				</n-card>

				<!-- Visual Config Card -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Sport colors</span></template>
					<n-space vertical v-if="Object.keys(workoutTypeColors).length > 0">
						<n-grid :cols="2" :x-gap="20" :y-gap="12">
							<n-gi v-for="type in workoutTypes" :key="type">
								<div class="color-picker-item">
									<span class="color-label">{{ type }}</span>
									<n-color-picker
										v-model:value="workoutTypeColors[type]"
										:modes="['hex']"
										:show-alpha="false"
									/>
								</div>
							</n-gi>
						</n-grid>
						<n-button @click="saveWorkoutTypeColors" type="primary">Save colors</n-button>
					</n-space>
					<div v-else class="ascii-spinner">Loading</div>
				</n-card>

				<!-- Race Goals Card -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Race goals</span></template>
					<n-space vertical>
						<n-form :model="newRaceGoal" inline @submit.prevent="addRaceGoal">
							<n-form-item label="Event name">
								<n-input v-model:value="newRaceGoal.name" placeholder="e.g. Oslo Marathon" />
							</n-form-item>
							<n-form-item label="Date">
								<input v-model="newRaceGoal.date" type="date" class="date-input" />
							</n-form-item>
							<n-form-item>
								<n-button @click="addRaceGoal" type="primary" :disabled="!newRaceGoal.name || !newRaceGoal.date">
									Add goal
								</n-button>
							</n-form-item>
						</n-form>

						<div v-if="raceGoals.length > 0" class="race-goals-list">
							<div v-for="goal in raceGoals" :key="goal.id" class="race-goal-item">
								<div class="race-goal-info">
									<n-icon :component="FlagOutline" /> {{ goal.name }} <span class="goal-date">{{ goal.date }}</span>
								</div>
								<n-button @click="deleteRaceGoal(goal.id)" size="small" type="error" ghost>
									Delete
								</n-button>
							</div>
						</div>
						<div v-else class="status-text">No race goals yet.</div>
					</n-space>
				</n-card>

				<!-- Migration Card (Only visible in Electron) -->
				<n-card v-if="isElectronApp" bordered class="settings-card">
					<template #header><span class="card-title">Cloud sync</span></template>
					<n-space vertical>
						<n-text depth="3" class="migration-note">
							Detected local data. Push your local workouts, weights, and settings to your Supabase cloud instance.
						</n-text>
						<n-button
							@click="migrateDataToCloud"
							:loading="migrating"
							type="warning"
							ghost
						>
							Migrate data to cloud
						</n-button>
						<div v-if="migrationStatus" class="migration-log">
							{{ migrationStatus }}
						</div>
					</n-space>
				</n-card>
			</n-space>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
	NCard,
	NSpace,
	NInput,
	NButton,
	NFormItem,
	NTag,
	useMessage,
	NSpin,
	NIcon,
	NColorPicker,
	NGrid,
	NGi,
	NText,
	NForm,
} from "naive-ui";
import { Strava } from "@vicons/fa";
import { FlagOutline } from "@vicons/ionicons5";
import { db } from "@/db";
import { supabase } from "@/supabase";
import { stravaApi } from "@/stravaBridge";
import type { RaceGoal, AddRaceGoalPayload } from "@/types";

const message = useMessage();
const userName = ref("");
const goalWeight = ref<string>("");
const isStravaConnected = ref(false);
const connectingToStrava = ref(false);

const raceGoals = ref<RaceGoal[]>([]);
const newRaceGoal = ref<AddRaceGoalPayload>({
	name: "",
	date: "",
});

const fetchRaceGoals = async () => {
	try {
		raceGoals.value = await db.getRaceGoals();
	} catch (error) {
		console.error("Failed to fetch race goals:", error);
	}
};

const addRaceGoal = async () => {
	if (!newRaceGoal.value.name || !newRaceGoal.value.date) return;
	try {
		await db.addRaceGoal(newRaceGoal.value);
		newRaceGoal.value = { name: "", date: "" };
		await fetchRaceGoals();
		window.dispatchEvent(new CustomEvent("race-goals-updated"));
		message.success("RACE_GOAL_COMMITTED");
	} catch (error) {
		message.error("WRITE_ERROR");
	}
};

const deleteRaceGoal = async (id: number) => {
	try {
		await db.deleteRaceGoal(id);
		await fetchRaceGoals();
		window.dispatchEvent(new CustomEvent("race-goals-updated"));
		message.success("GOAL_PURGED");
	} catch (error) {
		message.error("DELETE_ERROR");
	}
};

const isElectronApp = computed(() => !!(window && window.db));
const migrating = ref(false);
const migrationStatus = ref("");

const migrateDataToCloud = async () => {
	if (!window.db) return;
	
	migrating.value = true;
	migrationStatus.value = "INITIALIZING_MIGRATION...";
	
	try {
		// 1. Migrate Workouts
		migrationStatus.value = "EXTRACTING_LOCAL_WORKOUTS...";
		const localWorkouts = await window.db.getWorkouts();
		if (localWorkouts.length > 0) {
			migrationStatus.value = `PUSHING ${localWorkouts.length} WORKOUTS TO CLOUD...`;
			// Omit ID to let Supabase generate its own sequences
			const workoutsToSync = localWorkouts.map(({ id, ...rest }: any) => rest);
			const { error: wErr } = await supabase.from('workouts').upsert(workoutsToSync);
			if (wErr) throw wErr;
		}

		// 2. Migrate Weights
		migrationStatus.value = "EXTRACTING_LOCAL_BIOMETRICS...";
		const localWeights = await window.db.getDailyWeights();
		if (localWeights.length > 0) {
			migrationStatus.value = `PUSHING ${localWeights.length} WEIGHT RECORDS TO CLOUD...`;
			// Omit ID and use 'date' as conflict target for daily weights
			const weightsToSync = localWeights.map(({ id, ...rest }: any) => rest);
			const { error: tErr } = await supabase.from('daily_weights').upsert(weightsToSync, { onConflict: 'date' });
			if (tErr) throw tErr;
		}

		// 3. Migrate Colors
		migrationStatus.value = "SYNCING_INTERFACE_SCHEMAS...";
		const localColors = await window.db.getWorkoutTypeColors();
		if (localColors.length > 0) {
			// Colors table uses 'type' as PK usually, but upsert handles it
			const { error: cErr } = await supabase.from('workout_type_colors').upsert(localColors);
			if (cErr) throw cErr;
		}

		// 4. Migrate Race Goals
		migrationStatus.value = "SYNCING_RACE_STRATEGY...";
		const localRaceGoals = await window.db.getRaceGoals();
		if (localRaceGoals.length > 0) {
			migrationStatus.value = `PUSHING ${localRaceGoals.length} RACE GOALS TO CLOUD...`;
			const raceGoalsToSync = localRaceGoals.map(({ id, ...rest }: any) => rest);
			const { error: rErr } = await supabase.from('race_goals').upsert(raceGoalsToSync);
			if (rErr) throw rErr;
		}

		migrationStatus.value = "MIGRATION_SEQUENCE_COMPLETE";
		message.success("ALL_DATA_SYNCED_TO_CLOUD");
	} catch (error: any) {
		console.error("Migration failed:", error);
		migrationStatus.value = `CRITICAL_FAILURE: ${error.message}`;
		message.error("MIGRATION_FAILED");
	} finally {
		migrating.value = false;
	}
};

const workoutTypes = ["gym", "running", "bike", "rest", "other"];
const workoutTypeColors = ref<{ [key: string]: string }>({
	gym: "#3f88c5",
	running: "#00b33c",
	bike: "#fb8c00",
	rest: "#757575",
	other: "#FFA726"
});

const loadProfile = async () => {
	try {
		const storedName = localStorage.getItem("userName");
		if (storedName) userName.value = storedName;
		
		const storedGoal = localStorage.getItem("goalWeight");
		if (storedGoal) goalWeight.value = storedGoal;
	} catch (e) { console.error("Failed to load profile", e); }
};

const saveProfile = () => {
	try {
		localStorage.setItem("userName", userName.value);
		if (goalWeight.value !== "") {
			localStorage.setItem("goalWeight", goalWeight.value);
		}
		message.success("LOCAL_IDENTITY_COMMITTED");
	} catch (e) { message.error("WRITE_ERROR"); }
};

const checkStravaConnection = async () => {
	try {
		isStravaConnected.value = await stravaApi.isStravaConnected();
		console.log('Profile: Strava status updated ->', isStravaConnected.value);
	} catch (error) { console.error('Error checking Strava connection:', error); }
};

const handleConnectToStrava = async () => {
	connectingToStrava.value = true;
	try {
		await stravaApi.getAuthUrl();
	} catch (e) {
		message.error("API_UNAVAILABLE");
		connectingToStrava.value = false;
	}
};

const handleStravaAuthCallback = async (_event: any, url: string) => {
	console.log("Profile: Auth callback intercepted:", url);
	try {
		const urlParams = new URLSearchParams(new URL(url).search);
		const code = urlParams.get("code");
		if (code) {
			await stravaApi.exchangeCodeForToken(code);
			await checkStravaConnection(); 
			message.success("UPLINK_ESTABLISHED_SUCCESSFULLY");
		}
	} catch (error) {
		message.error("HANDSHAKE_FAILED");
		console.error("Strava Auth Error:", error);
	} finally {
		connectingToStrava.value = false; 
	}
};

const fetchWorkoutTypeColors = async () => {
	try {
		const colors = await db.getWorkoutTypeColors();
		if (colors && Array.isArray(colors)) {
			const colorsMap: { [key: string]: string } = {};
			workoutTypes.forEach((type) => {
				const found = colors.find((c: any) => c.type === type);
				colorsMap[type] = found ? found.color : workoutTypeColors.value[type]; 
			});
			workoutTypeColors.value = colorsMap;
		}
	} catch (error) { console.error("Error fetching colors:", error); }
};

const saveWorkoutTypeColors = async () => {
	try {
		for (const type of workoutTypes) {
			await db.setWorkoutTypeColor({ type, color: workoutTypeColors.value[type] });
		}
		window.dispatchEvent(new CustomEvent("colors-updated"));
		message.success("GLOBAL_THEME_UPDATED");
	} catch (error) {
		message.error("SYNC_ERROR");
		console.error("Save Error:", error);
	}
};

const handleWebStravaCallback = async () => {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get("code");
	if (code) {
		connectingToStrava.value = true;
		try {
			await stravaApi.exchangeCodeForToken(code);
			window.history.replaceState({}, document.title, window.location.pathname);
			await checkStravaConnection();
			message.success("UPLINK_ESTABLISHED_SUCCESSFULLY");
		} catch (e) {
			console.error("Web OAuth Error:", e);
			message.error("HANDSHAKE_FAILED");
		} finally {
			connectingToStrava.value = false;
		}
	}
};

onMounted(() => {
	loadProfile();
	handleWebStravaCallback(); 
	checkStravaConnection();
	fetchWorkoutTypeColors(); 
	fetchRaceGoals();
	if ((window as any).ipcRenderer) {
		(window as any).ipcRenderer.on("strava-auth-callback", handleStravaAuthCallback);
	}
});

onUnmounted(() => {
	if ((window as any).ipcRenderer) {
		(window as any).ipcRenderer.off("strava-auth-callback", handleStravaAuthCallback);
	}
});
</script>

<style scoped>
.profile-view-wrapper { width: 100%; min-height: 100%; }
.profile-content { padding: 24px 28px 40px; max-width: 760px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .profile-content { padding: 16px 16px 32px; } }

.page-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; }
.card-title { font-size: 1rem; font-weight: 600; color: var(--text-color); }

.settings-card { border-radius: var(--radius) !important; }

.uplink-item { display: flex; flex-direction: column; gap: 16px; }
.uplink-header { display: flex; justify-content: space-between; align-items: center; }
.uplink-info { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-color); }
.strava-button-line-tag-group { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.status-text { font-size: 0.8rem; color: var(--text-muted); }
.text-success { color: var(--success-color); }

.color-picker-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; border: 1px solid var(--border-color);
  background: var(--surface-2); border-radius: var(--radius-sm);
}
.color-label { font-size: 0.82rem; color: var(--text-secondary); text-transform: capitalize; }

.race-goals-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.race-goal-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: var(--surface-2);
  border: 1px solid var(--border-color); border-radius: var(--radius-sm);
}
.race-goal-info { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-color); }
.goal-date { color: var(--text-muted); font-size: 0.82rem; }

.date-input {
  background: var(--surface-2); border: 1px solid var(--border-color);
  color: var(--text-color); padding: 7px 10px; font-family: var(--font-family);
  border-radius: var(--radius-sm); outline: none;
}
.date-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-soft); }

.migration-note { font-size: 0.88rem; }
.migration-log {
  margin-top: 6px; font-family: var(--font-mono); font-size: 0.78rem;
  color: var(--text-secondary); background: var(--surface-2);
  padding: 10px 12px; border-radius: var(--radius-sm);
}
</style>
