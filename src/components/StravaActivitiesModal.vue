<template>
  <n-modal
    :show="show"
    @update:show="updateShow"
    preset="dialog"
    title="Strava Activities"
    :mask-closable="true"
    style="width: 800px;"
  >
    <n-card
      :bordered="false"
      size="small"
      role="dialog"
      aria-modal="true"
    >
      <n-space vertical>
        <n-alert v-if="!activities || activities.length === 0" type="info">
          No Strava activities found. Make sure you are connected to Strava and have activities in your account.
        </n-alert>
        <n-list v-else bordered>
          <n-list-item v-for="activity in activities" :key="activity.id">
            <n-thing :title="activity.name">
              <template #description>
                <n-space justify="space-between">
                  <span>Type: {{ activity.type }}</span>
                  <span>Distance: {{ (activity.distance / 1000).toFixed(2) }} km</span>
                  <span>Duration: {{ formatDuration(activity.moving_time) }}</span>
                </n-space>
              </template>
            </n-thing>
            <n-button @click="openLinkModal(activity)">Link</n-button>
          </n-list-item>
        </n-list>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="updateShow(false)">Close</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal
    :show="showLinkModal"
    @update:show="showLinkModal = false"
    preset="dialog"
    title="Link to Workout"
    :mask-closable="true"
  >
    <n-spin :show="linkingActivity">
      <n-space vertical>
        <p>Select a workout to link to this Strava activity:</p>
        <n-select
          v-model:value="selectedWorkoutId"
          :options="workoutOptions"
          placeholder="Select a workout"
        />
        <n-space justify="end">
          <n-button @click="showLinkModal = false" :disabled="linkingActivity">Cancel</n-button>
          <n-button type="primary" @click="linkActivity" :disabled="linkingActivity">Link</n-button>
        </n-space>
      </n-space>
    </n-spin>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { NModal, NCard, NButton, NSpace, NList, NListItem, NThing, NAlert, NSelect, useMessage, NSpin } from 'naive-ui';
import type { Workout, StravaActivity } from '../types'; // Import from shared types

const props = defineProps<{
  show: boolean;
}>();

const emits = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const message = useMessage();
const activities = ref<any[]>([]);
const workouts = ref<Workout[]>([]);
const showLinkModal = ref(false);
const selectedActivity = ref<StravaActivity | null>(null);
const selectedWorkoutId = ref<number | null>(null);
const linkingActivity = ref(false); // New ref for loading state

const workoutOptions = computed(() =>
  workouts.value
    .filter(workout => workout.type?.toLowerCase() === 'running' || workout.type?.toLowerCase() === 'bike')
    .map((workout) => ({
      label: `${workout.name} (${workout.date})`,
      value: workout.id,
    }))
);

const openLinkModal = (activity: StravaActivity) => {
  console.log('Open link modal for activity:', activity); // Add this line
  selectedActivity.value = activity;
  showLinkModal.value = true;
  fetchWorkouts();
};

import { db } from '@/db';

const fetchWorkouts = async () => {
  try {
    workouts.value = await db.getWorkouts();
    console.log('Fetched workouts for linking:', workouts.value); // Add this line
  } catch (error) {
    console.error('Failed to fetch workouts:', error);
  }
};

import { stravaApi } from '@/stravaBridge';

const linkActivity = async () => {
  if (selectedActivity.value && selectedWorkoutId.value) {
    try {
      linkingActivity.value = true; // Set loading state
      await stravaApi.linkStravaActivity(
        selectedWorkoutId.value as number,
        selectedActivity.value.id.toString()
      );
      message.success('Successfully linked Strava activity to workout!');
      showLinkModal.value = false;
      // window.ipcRenderer.send('workout-linked'); // Original line, check if needed
    } catch (error) {
      message.error('Failed to link Strava activity.');
      console.error('Error linking Strava activity:', error);
    } finally {
      linkingActivity.value = false; // Reset loading state
    }
  }
};

const updateShow = (value: boolean) => {
  emits('update:show', value);
};

const fetchActivities = async () => {
  try {
    const fetchedActivities = await stravaApi.getActivities(); // Changed from getAthleteActivities
    console.log('Fetched Strava activities:', fetchedActivities); // Add this line
    if (fetchedActivities && !fetchedActivities.error) {
        activities.value = fetchedActivities;
    } else {
        activities.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch Strava activities:', error);
    activities.value = [];
  }
};


const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let result = '';
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0 || hours > 0) { // Display minutes if there are any, or if there are hours
    result += `${minutes}m `;
  }
  result += `${remainingSeconds}s`;
  return result.trim();
};

watch(() => props.show, (newValue) => {
  if (newValue) {
    fetchActivities();
  }
});
</script>