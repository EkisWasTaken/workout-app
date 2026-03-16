<template>
	<n-form>
		<n-form-item label="Workout Template">
			<n-select v-model:value="selectedTemplate" :options="templateOptions" clearable
				placeholder="Select a template" />
		</n-form-item>
		<n-form-item label="Workout Name">
			<n-input v-model:value="newWorkoutName" placeholder="Workout Name" />
		</n-form-item>
		<n-form-item label="Date">
			<n-date-picker v-model:value="workoutDate" type="date" clearable />
		</n-form-item>
		<n-form-item label="Workout Type">
			<n-select v-model:value="selectedWorkoutType" :options="workoutTypeOptions" />
		</n-form-item>
		<n-form-item v-if="selectedWorkoutType === 'Running'" label="Target Pace">
			<n-input v-model:value="targetPace" placeholder="e.g., 5:00 min/km" />
		</n-form-item>
		<n-form-item v-if="selectedWorkoutType === 'Gym'" label="Type of Gym Workout">
			<n-input v-model:value="gymWorkoutType" placeholder="e.g., Chest, Legs, Back" />
		</n-form-item>
		<n-button @click="handleSave" type="primary" block>{{ isEditing ? 'Update Workout' : 'Add Workout' }}</n-button>
	</n-form>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { NInput, NButton, NForm, NFormItem, NSelect, NDatePicker } from 'naive-ui'
import { format } from 'date-fns'
import type { AddWorkoutPayload, Workout, WorkoutTemplate } from '../types' // Added AddWorkoutPayload and made Workout a type import

const props = defineProps({
	initialDate: {
		type: String,
		default: null
	},
	workoutToEdit: {
		type: Object as () => Workout | null,
		default: null
	}
})

const emit = defineEmits(['workoutAdded', 'workoutUpdated'])

const newWorkoutName = ref('')
const selectedWorkoutType = ref('Running')
const targetPace = ref('')
const gymWorkoutType = ref('')
const workoutDate = ref(Date.now()); // New ref for the date picker
const templates = ref<WorkoutTemplate[]>([]);
const selectedTemplate = ref<number | null>(null);

const templateOptions = computed(() => {
	return templates.value.map(template => ({
		label: template.name,
		value: template.id
	}));
});

watch(selectedTemplate, async (templateId) => {
	if (templateId) {
		const template = templates.value.find(t => t.id === templateId);
		if (template) {
			newWorkoutName.value = template.name;
		}
	}
});


const isEditing = computed(() => !!props.workoutToEdit);

watch(() => props.workoutToEdit, (workout) => {
	if (workout) {
		newWorkoutName.value = workout.name;
		selectedWorkoutType.value = workout.type || 'Running';
		targetPace.value = workout.targetPace || '';
		gymWorkoutType.value = workout.gymType || '';
		workoutDate.value = new Date(workout.date).getTime();
	}
}, { immediate: true });


import { db } from '@/db';

onMounted(async () => {
	if (props.initialDate) {
		// Parse 'YYYY-MM-DD' string to a Date object, then get its timestamp
		workoutDate.value = new Date(props.initialDate).getTime();
	}
	templates.value = await db.getWorkoutTemplates();
});

const workoutTypeOptions = [
	{
		label: 'Running',
		value: 'Running'
	},
	{
		label: 'Gym',
		value: 'gym'
	},
	{
		label: 'Rest Day',
		value: 'Rest Day'
	},
	{
		label: 'Other',
		value: 'Other'
	}
]

async function handleSave() {
	if (newWorkoutName.value.trim() === '') return;

	if (isEditing.value && props.workoutToEdit) {
		const updatedWorkout: Workout = {
			...props.workoutToEdit,
			name: newWorkoutName.value,
			date: format(new Date(workoutDate.value), 'yyyy-MM-dd'),
			type: selectedWorkoutType.value,
			targetPace: selectedWorkoutType.value === 'Running' ? targetPace.value : undefined,
			gymType: selectedWorkoutType.value === 'Gym' ? gymWorkoutType.value : undefined,
		};
		await db.updateWorkout(updatedWorkout);
		emit('workoutUpdated');
	} else {
		const workoutPayload: AddWorkoutPayload = {
			name: newWorkoutName.value,
			date: format(new Date(workoutDate.value), 'yyyy-MM-dd'),
			type: selectedWorkoutType.value,
			isCompleted: 0,
			targetPace: selectedWorkoutType.value === 'Running' ? targetPace.value : undefined,
			gymType: selectedWorkoutType.value === 'Gym' ? gymWorkoutType.value : undefined,
		}

		await db.addWorkout(workoutPayload)
		emit('workoutAdded')
		
		// Reset form
		newWorkoutName.value = ''
		targetPace.value = ''
		gymWorkoutType.value = ''
	}
}
</script>
