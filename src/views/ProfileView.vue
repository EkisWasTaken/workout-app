<template>
	<div class="profile-view-wrapper">
		<div class="profile-content">
			<typewriter-header text="SYSTEM_USER_PROFILE" tag="h1" />
			
			<n-space vertical size="large" style="width: 100%">
				<!-- Settings Card -->
				<n-card bordered class="terminal-card">
					<template #header>
						<typewriter-header text="_PREFERENCES" tag="span" :delay="300" :speed="30" />
					</template>
					<n-space vertical>
						<n-form-item label="USER_IDENTIFIER">
							<n-input v-model:value="userName" placeholder="ENTER_ID" class="terminal-input" />
						</n-form-item>
						<n-form-item label="GOAL_BODY_MASS_KG">
							<n-input v-model:value="goalWeight" type="text" placeholder="ENTER_GOAL_VALUE (e.g. 75.5)" class="terminal-input" />
						</n-form-item>
						<n-button @click="saveProfile" class="terminal-button">
							<span class="btn-icon">[S]</span> COMMIT_PROFILE_DATA
						</n-button>
					</n-space>
				</n-card>

				<!-- Integrations Card -->
				<n-card bordered class="terminal-card">
					<template #header>
						<typewriter-header text="_EXTERNAL_UPLINKS" tag="span" :delay="600" :speed="30" />
					</template>
					<n-spin :show="connectingToStrava">
						<n-space vertical>
							<div class="uplink-item">
								<div class="uplink-header">
									<div class="uplink-info">
										<span class="prompt">></span> STRAVA_V3_API_UPLINK
									</div>
									<n-tag :type="isStravaConnected ? 'success' : 'error'" class="terminal-tag">
										{{ isStravaConnected ? "LINK_ACTIVE" : "LINK_OFFLINE" }}
									</n-tag>
								</div>
								
								<div class="strava-button-line-tag-group">
									<n-button 
										@click="handleConnectToStrava" 
										class="terminal-button"
										:type="isStravaConnected ? 'default' : 'primary'"
									>
										<template #icon>
											<n-icon color="#fc5100" :component="Strava" />
										</template>
										{{ isStravaConnected ? "RE-ESTABLISH_LINK" : "ESTABLISH_NEW_LINK" }}
									</n-button>
									<div class="horizontal-gap-line" :class="{ 'horizontal-gap-line--active': isStravaConnected }"></div>
									<div class="status-text" :class="{ 'text-success': isStravaConnected }">
										{{ isStravaConnected ? "[ONLINE_SYNC_READY]" : "[AWAITING_AUTH]" }}
									</div>
								</div>
							</div>
						</n-space>
					</n-spin>
				</n-card>

				<!-- Visual Config Card -->
				<n-card bordered class="terminal-card">
					<template #header>
						<typewriter-header text="_INTERFACE_COLORS" tag="span" :delay="900" :speed="30" />
					</template>
					<n-space vertical v-if="Object.keys(workoutTypeColors).length > 0">
						<n-grid :cols="2" :x-gap="20" :y-gap="12">
							<n-gi v-for="type in workoutTypes" :key="type">
								<div class="color-picker-item">
									<span class="color-label">{{ type.toUpperCase() }}</span>
									<n-color-picker 
										v-model:value="workoutTypeColors[type]" 
										:modes="['hex']"
										:show-alpha="false" 
										class="terminal-color-picker"
									/>
								</div>
							</n-gi>
						</n-grid>
						<n-button @click="saveWorkoutTypeColors" class="terminal-button">
							<span class="btn-icon">[U]</span> SYNC_INTERFACE_COLORS
						</n-button>
					</n-space>
					<div v-else class="ascii-spinner">INITIALIZING_DATA</div>
				</n-card>

				<!-- Migration Card (Only visible in Electron) -->
				<n-card v-if="isElectronApp" bordered class="terminal-card migration-card">
					<template #header>
						<typewriter-header text="_CLOUD_MIGRATION" tag="span" :delay="1200" :speed="30" />
					</template>
					<n-space vertical>
						<n-text depth="3" class="migration-note">
							Detected local SQLite data. Push local records to your Supabase cloud instance.
							This will merge your local workouts, weights, and settings into the cloud.
						</n-text>
						<n-button 
							@click="migrateDataToCloud" 
							:loading="migrating"
							class="terminal-button migration-btn"
							type="warning"
							ghost
						>
							<span class="btn-icon">[M]</span> START_MIGRATION_SEQUENCE
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
} from "naive-ui";
import { Strava } from "@vicons/fa";
import { db } from "@/db";
import { supabase } from "@/supabase";
import TypewriterHeader from "../components/TypewriterHeader.vue";

const message = useMessage();
const userName = ref("");
const goalWeight = ref<string>("");
const isStravaConnected = ref(false);
const connectingToStrava = ref(false);

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
			const { error: wErr } = await supabase.from('workouts').upsert(localWorkouts);
			if (wErr) throw wErr;
		}

		// 2. Migrate Weights
		migrationStatus.value = "EXTRACTING_LOCAL_BIOMETRICS...";
		const localWeights = await window.db.getDailyWeights();
		if (localWeights.length > 0) {
			migrationStatus.value = `PUSHING ${localWeights.length} WEIGHT RECORDS TO CLOUD...`;
			const { error: tErr } = await supabase.from('daily_weights').upsert(localWeights);
			if (tErr) throw tErr;
		}

		// 3. Migrate Colors
		migrationStatus.value = "SYNCING_INTERFACE_SCHEMAS...";
		const localColors = await window.db.getWorkoutTypeColors();
		if (localColors.length > 0) {
			const { error: cErr } = await supabase.from('workout_type_colors').upsert(localColors);
			if (cErr) throw cErr;
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

const workoutTypes = ["gym", "running", "rest", "other"];
const workoutTypeColors = ref<{ [key: string]: string }>({
	gym: "#3f88c5",
	running: "#00b33c",
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
.profile-view-wrapper {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
}

.profile-content {
	padding: 24px;
	width: 100%;
	box-sizing: border-box;
}

.terminal-card {
	background-color: rgba(6, 8, 6, 0.7) !important;
	border: 1px solid var(--border-color) !important;
}

.terminal-button {
	background: transparent !important;
	border: 1px solid var(--accent-color) !important;
	color: var(--accent-color) !important;
	font-family: var(--font-family);
}

.terminal-button:hover:not(:disabled) {
	background: var(--accent-color) !important;
	color: #040604 !important;
	box-shadow: 0 0 15px var(--glow-color);
}

.uplink-item {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.uplink-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.uplink-info {
	font-weight: bold;
	color: var(--accent-color);
	letter-spacing: 1px;
}

.strava-button-line-tag-group {
	display: flex;
	align-items: center;
	gap: 12px;
}

.horizontal-gap-line {
	width: 40px;
	height: 1px;
	background-color: var(--border-color);
	opacity: 0.3;
}

.horizontal-gap-line--active {
	background-color: var(--accent-color);
	opacity: 1;
	box-shadow: 0 0 5px var(--accent-color);
}

.status-text {
	font-size: 0.7rem;
	color: #800000;
	font-weight: bold;
}

.text-success {
	color: var(--accent-color);
}

.color-picker-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px;
	border: 1px solid rgba(0, 179, 60, 0.1);
	background: rgba(0, 0, 0, 0.3);
}

.color-label {
	font-size: 0.75rem;
	color: #008f11;
}

.terminal-tag {
	background: transparent !important;
	border: 1px solid currentColor !important;
}

.btn-icon {
	margin-right: 8px;
	font-weight: bold;
}

.prompt {
	color: var(--accent-color);
	margin-right: 8px;
}
</style>
