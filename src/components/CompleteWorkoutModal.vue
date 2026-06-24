<template>
    <n-modal v-model:show="showInternal" :mask-closable="false" preset="dialog" title="Complete Workout"
        positive-text="Save" negative-text="Cancel" @positive-click="onPositiveClick" @negative-click="onNegativeClick">
        <n-form :model="formValue" label-placement="top">
            <n-form-item v-if="workout?.type?.toLowerCase() === 'gym'" label="Total weight lifted (kg)">
                <n-input-number v-model:value="formValue.totalWeightLifted" clearable />
            </n-form-item>
            <n-form-item label="Notes">
                <n-input v-model:value="formValue.notes" type="textarea" placeholder="How did it go?" />
            </n-form-item>
            <n-form-item v-if="isCardio && stravaActivityOptions.length > 0" label="Link Strava activity">
                <n-select v-model:value="formValue.stravaActivityId" :options="stravaActivityOptions"
                    placeholder="Select a Strava activity" clearable />
            </n-form-item>
            <n-form-item v-if="isCardio && stravaActivityOptions.length === 0" label="Distance (km)">
                <n-input-number v-model:value="formValue.distance" clearable :min="0" />
            </n-form-item>
        </n-form>
    </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue';
import { NModal, NForm, NFormItem, NInputNumber, NInput, NSelect } from 'naive-ui';
import type { Workout, StravaActivity, CompleteWorkoutFormValues } from '../types';
import { stravaApi } from '../stravaBridge';

const props = defineProps<{
    show: boolean;
    workout: Workout | null;
}>();

const emit = defineEmits(['update:show', 'complete']);

const showInternal = ref(props.show);

watchEffect(() => { showInternal.value = props.show; });
watch(showInternal, (v) => { if (v !== props.show) emit('update:show', v); });

const isCardio = computed(() => {
    const t = props.workout?.type?.toLowerCase()
    return t === 'running' || t === 'bike'
})

const formValue = ref<CompleteWorkoutFormValues>({
    notes: '',
    totalWeightLifted: 0,
    stravaActivityId: undefined,
    distance: undefined,
});

const stravaActivities = ref<StravaActivity[]>([]);
const stravaActivityOptions = ref<{ label: string; value: number }[]>([]);

watch(() => props.workout, (w) => {
    if (w) {
        formValue.value = { notes: '', totalWeightLifted: 0, stravaActivityId: undefined, distance: undefined };
        if (isCardio.value) loadStravaActivities();
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
                label: `${act.name} — ${new Date(act.start_date_local).toLocaleDateString()}`,
                value: act.id,
            }));
        } else {
            stravaActivities.value = [];
            stravaActivityOptions.value = [];
        }
    } catch {
        stravaActivities.value = [];
        stravaActivityOptions.value = [];
    } finally {
        isStravaLoading.value = false;
    }
}

function onPositiveClick() {
    const payload: Partial<Workout> = { ...formValue.value };
    if (isCardio.value) {
        if (payload.stravaActivityId) delete payload.distance;
        else delete payload.stravaActivityId;
    } else {
        delete payload.distance;
        delete payload.stravaActivityId;
    }
    if (props.workout?.type?.toLowerCase() !== 'gym') delete payload.totalWeightLifted;
    emit('complete', payload);
    showInternal.value = false;
}

function onNegativeClick() {
    showInternal.value = false;
}
</script>
