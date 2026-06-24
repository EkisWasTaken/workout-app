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
						<n-form-item label="Resting heart rate (bpm)">
							<n-input v-model:value="restingHR" type="text" placeholder="e.g. 55" />
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

			</n-space>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
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
	NForm,
} from "naive-ui";
import { Strava } from "@vicons/fa";
import { FlagOutline } from "@vicons/ionicons5";
import { db } from "@/db";
import { stravaApi } from "@/stravaBridge";
import type { RaceGoal, AddRaceGoalPayload } from "@/types";

const message = useMessage();
const userName = ref("");
const goalWeight = ref<string>("");
const restingHR = ref<string>("");
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
		message.success("Race goal added");
	} catch (error) {
		message.error("Failed to save");
	}
};

const deleteRaceGoal = async (id: number) => {
	try {
		await db.deleteRaceGoal(id);
		await fetchRaceGoals();
		window.dispatchEvent(new CustomEvent("race-goals-updated"));
		message.success("Goal removed");
	} catch (error) {
		message.error("Failed to delete");
	}
};

const loadProfile = async () => {
	try {
		const storedName = localStorage.getItem("userName");
		if (storedName) userName.value = storedName;
		const storedGoal = localStorage.getItem("goalWeight");
		if (storedGoal) goalWeight.value = storedGoal;
		const storedRHR = localStorage.getItem("restingHR");
		if (storedRHR) restingHR.value = storedRHR;
	} catch (e) { console.error("Failed to load profile", e); }
};

const saveProfile = () => {
	try {
		localStorage.setItem("userName", userName.value);
		if (goalWeight.value !== "") {
			localStorage.setItem("goalWeight", goalWeight.value);
		}
		if (restingHR.value !== "") {
			localStorage.setItem("restingHR", restingHR.value);
		}
		message.success("Profile saved");
	} catch (e) { message.error("Failed to save"); }
};

const checkStravaConnection = async () => {
	try {
		isStravaConnected.value = await stravaApi.isStravaConnected();
	} catch (error) { console.error('Error checking Strava connection:', error); }
};

const handleConnectToStrava = async () => {
	connectingToStrava.value = true;
	try {
		await stravaApi.getAuthUrl();
	} catch (e) {
		message.error("Strava unavailable");
		connectingToStrava.value = false;
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
			message.success("Strava connected");
		} catch (e) {
			console.error("Web OAuth Error:", e);
			message.error("Connection failed");
		} finally {
			connectingToStrava.value = false;
		}
	}
};

onMounted(() => {
	loadProfile();
	handleWebStravaCallback();
	checkStravaConnection();
	fetchRaceGoals();
});
</script>

<style scoped>
.profile-view-wrapper { width: 100%; min-height: 100%; }
.profile-content { padding: 24px 28px 40px; max-width: 760px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .profile-content { padding: 16px 16px 32px; } }

.page-title { font-size: 1.5rem; font-weight: 400; margin-bottom: 20px; }
.card-title { font-size: 1rem; font-weight: 600; color: var(--text-color); }
.settings-card { border-radius: var(--radius) !important; }

.uplink-item { display: flex; flex-direction: column; gap: 16px; }
.uplink-header { display: flex; justify-content: space-between; align-items: center; }
.uplink-info { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-color); }
.strava-button-line-tag-group { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.status-text { font-size: 0.8rem; color: var(--text-muted); }
.text-success { color: var(--success-color); }

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
</style>
