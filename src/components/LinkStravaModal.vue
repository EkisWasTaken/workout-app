<template>
    <n-modal v-model:show="showInternal" :mask-closable="false" preset="dialog" title="Link Strava Activity"
        positive-text="Link" negative-text="Cancel" @positive-click="onPositiveClick" @negative-click="onNegativeClick">
        <n-form-item label="Select Strava Activity">
            <n-select v-model:value="selectedStravaActivityId" :options="stravaActivityOptions"
                placeholder="Select a Strava activity" clearable :loading="loadingActivities" />
        </n-form-item>
    </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import { NModal, NFormItem, NSelect } from 'naive-ui';
import { db } from '@/db';
import { stravaApi } from '@/stravaBridge';

const props = defineProps<{
    show: boolean;
    workoutId: number | null;
}>();

const emit = defineEmits(['update:show', 'linked']);

const showInternal = ref(props.show);
const selectedStravaActivityId = ref<string | null>(null);
const stravaActivityOptions = ref<{ label: string; value: string; }[]>([]);
const loadingActivities = ref(false);

watchEffect(() => {
  showInternal.value = props.show;
});

watch(showInternal, (newValue) => {
  if (newValue !== props.show) {
    emit('update:show', newValue);
  }
});

watch(showInternal, (newValue) => {
  if (newValue === true && props.workoutId !== null) {
    console.log('Modal became visible with valid workoutId. Loading activities.');
    loadStravaActivities();
  } else if (newValue === false) {
    console.log('Modal is closing. Clearing selected activity and options.');
    selectedStravaActivityId.value = null;
    stravaActivityOptions.value = []; // Clear options to prevent stale data
  }
  if (newValue !== props.show) {
    emit('update:show', newValue);
  }
});

async function loadStravaActivities() {
    if (loadingActivities.value) return;
    console.log('loadStravaActivities called.');
    loadingActivities.value = true;
    try {
        const isConnected = await stravaApi.isStravaConnected();
        console.log('Strava Connected:', isConnected);
        if (!isConnected) {
            console.warn('Strava is not connected. Please connect to Strava in your settings.');
            loadingActivities.value = false;
            return;
        }

        const activities = await stravaApi.getActivities();
        console.log('Fetched Strava activities:', activities);
        if (activities && Array.isArray(activities)) {
            stravaActivityOptions.value = activities.map((act: any) => ({
                label: `${act.name} - ${new Date(act.start_date_local).toLocaleDateString()} (${(act.distance / 1000).toFixed(2)} km)`,
                value: act.id.toString(),
            }));
            console.log('Mapped Strava activity options:', stravaActivityOptions.value);
        } else {
            stravaActivityOptions.value = [];
        }
    } catch (error) {
        console.error('Failed to load Strava activities:', error);
        stravaActivityOptions.value = [];
    } finally {
        loadingActivities.value = false;
    }
}


async function onPositiveClick() {
    if (props.workoutId !== null && selectedStravaActivityId.value !== null) {
        try {
            await stravaApi.linkStravaActivity(props.workoutId, selectedStravaActivityId.value);
            // Mark the workout as completed
            await db.completeWorkout({
                id: props.workoutId,
                isCompleted: 1,
            });
            emit('linked'); // Notify parent that linking was successful
            showInternal.value = false;
        } catch (error) {
            console.error('Failed to link Strava activity:', error);
            // Optionally show an error message to the user
        }
    }
}


function onNegativeClick() {
    showInternal.value = false;
}
</script>
