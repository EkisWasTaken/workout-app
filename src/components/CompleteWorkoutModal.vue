<template>
    <n-modal v-model:show="showInternal" :mask-closable="false" preset="dialog" title="Complete Workout"
        positive-text="Save" negative-text="Cancel" @positive-click="onPositiveClick" @negative-click="onNegativeClick">
        <n-form :model="formValue" label-placement="top">
            <n-form-item label="Actual Duration (minutes)">
                <n-input-number v-model:value="formValue.actualDuration" clearable />
            </n-form-item>
            <n-form-item v-if="workout?.type?.toLowerCase() === 'gym'" label="Total Weight Lifted (kg)">
                <n-input-number v-model:value="formValue.totalWeightLifted" clearable />
            </n-form-item>
            <n-form-item label="Rate of Perceived Exertion (RPE)">
                <n-slider v-model:value="formValue.rpe" :min="1" :max="10" :step="1" />
            </n-form-item>
            <n-form-item label="Notes">
                <n-input v-model:value="formValue.notes" type="textarea" placeholder="How did it go?" />
            </n-form-item>
            <n-form-item v-if="(workout?.type?.toLowerCase() === 'running' || workout?.type?.toLowerCase() === 'bike') && stravaActivityOptions.length > 0"
                label="Link Strava Activity">
                <n-select v-model:value="formValue.stravaActivityId" :options="stravaActivityOptions"
                    placeholder="Select a Strava activity" clearable />
            </n-form-item>
            <n-form-item v-if="(workout?.type?.toLowerCase() === 'running' || workout?.type?.toLowerCase() === 'bike') && stravaActivityOptions.length === 0"
                label="Distance (km)">
                <n-input-number v-model:value="formValue.distance" clearable :min="0" />
            </n-form-item>
        </n-form>
    </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import { NModal, NForm, NFormItem, NInputNumber, NSlider, NInput, NSelect } from 'naive-ui';
import type { Workout, StravaActivity, CompleteWorkoutFormValues } from '../types';
import { stravaApi } from '../stravaBridge';

const props = defineProps<{
    show: boolean;
    workout: Workout | null;
}>();

const emit = defineEmits(['update:show', 'complete']);

const showInternal = ref(props.show);

// Sync internal state with prop
watchEffect(() => {
  showInternal.value = props.show;
});

// Emit update event when internal state changes (e.g., from modal's internal close button)
watch(showInternal, (newValue) => {
  if (newValue !== props.show) {
    emit('update:show', newValue);
  }
});

const formValue = ref<CompleteWorkoutFormValues>({
    actualDuration: props.workout?.duration,
    rpe: 5,
    notes: '',
    totalWeightLifted: 0,
    stravaActivityId: undefined,
    distance: undefined, // Changed from manualDistance
});

const stravaActivities = ref<StravaActivity[]>([]);
const stravaActivityOptions = ref<{ label: string; value: number; }[]>([]);

watch(() => props.workout, (newWorkout) => {
    if (newWorkout) {
        formValue.value.actualDuration = newWorkout.duration;
        formValue.value.rpe = 5;
        formValue.value.notes = '';
        formValue.value.totalWeightLifted = 0;
        formValue.value.stravaActivityId = undefined;
        formValue.value.distance = undefined; // Changed from manualDistance

        if (newWorkout.type?.toLowerCase() === 'running' || newWorkout.type?.toLowerCase() === 'bike') {
            loadStravaActivities();
        }
    }
});

const isStravaLoading = ref(false);

async function loadStravaActivities() {
    if (isStravaLoading.value) return;
    isStravaLoading.value = true;
    try {
        const activities = await stravaApi.getActivities();
        if (activities && Array.isArray(activities)) {
            stravaActivities.value = activities;
            stravaActivityOptions.value = activities.map((act: StravaActivity) => ({
                label: `${act.name} - ${new Date(act.start_date_local).toLocaleDateString()}`,
                value: act.id, // Now binding a number
            }));
        } else {
            stravaActivities.value = [];
            stravaActivityOptions.value = [];
        }
    } catch (error) {
        console.error('Failed to load Strava activities:', error);
    } finally {
        isStravaLoading.value = false;
    }
}

function onPositiveClick() {
    const payload: Partial<Workout> = { ...formValue.value };
    const isMapType = props.workout?.type?.toLowerCase() === 'running' || props.workout?.type?.toLowerCase() === 'bike';
    if (isMapType) { // Use toLowerCase for robustness
        if (payload.stravaActivityId) {
            delete payload.distance; // If stravaId is selected, distance comes from Strava
        } else {
            // payload.distance is already set if manual distance was entered
            delete payload.stravaActivityId; // No strava activity if manual distance
        }
    } else { // Not a running or bike workout
        delete payload.distance; // Delete distance for non-running/bike workouts
        delete payload.stravaActivityId; // Delete stravaActivityId for non-running/bike workouts
    }

    if (props.workout?.type?.toLowerCase() !== 'gym') { // Use toLowerCase for robustness
        delete payload.totalWeightLifted;
    }

    emit('complete', payload);
    showInternal.value = false;
}

function onNegativeClick() {
    showInternal.value = false;
}
</script>
