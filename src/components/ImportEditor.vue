<template>
	<n-modal v-model:show="showModal" preset="card"
		:title="`Import ${importType === 'workout' ? 'workouts' : 'nutrition'}`"
		style="width: 860px; max-width: 96vw;">
		<n-space vertical size="large">
			<!-- Source: drop a file or paste -->
			<div class="import-sources">
				<div class="dropzone" :class="{ dragging: isDragging }"
					@click="fileInput?.click()"
					@dragover.prevent="isDragging = true"
					@dragleave.prevent="isDragging = false"
					@drop.prevent="onDrop">
					<input ref="fileInput" type="file" accept=".csv,.txt,text/csv" style="display: none" @change="onFileChange" />
					<n-icon :component="CloudUploadOutline" class="dz-icon" />
					<div v-if="!fileName" class="dz-text"><strong>Drop a CSV file</strong> or click to browse</div>
					<div v-else class="file-chip" @click.stop>
						<n-icon :component="DocumentTextOutline" /> {{ fileName }}
						<button class="chip-x" @click="clearFile" aria-label="Remove file">✕</button>
					</div>
				</div>
				<div class="paste-divider"><span>or paste rows</span></div>
				<n-input v-model:value="rawPastedText" type="textarea" :rows="3"
					:disabled="!!fileName" placeholder="Paste CSV/TSV rows here (including the header line)…" />
			</div>

			<!-- Controls -->
			<div class="import-toolbar">
				<div class="delim">
					<span class="lbl">Delimiter</span>
					<n-radio-group v-model:value="selectedDelimiter" size="small">
						<n-radio-button value=",">,</n-radio-button>
						<n-radio-button value=";">;</n-radio-button>
						<n-radio-button value="\t">Tab</n-radio-button>
						<n-radio-button value="|">|</n-radio-button>
					</n-radio-group>
				</div>
				<n-space size="small">
					<n-button v-if="importType === 'workout'" size="small" @click="downloadTemplate">
						<template #icon><n-icon :component="DownloadOutline" /></template>
						Template
					</n-button>
					<n-button size="small" @click="addEmptyRow">
						<template #icon><n-icon :component="AddOutline" /></template>
						Add row
					</n-button>
				</n-space>
			</div>

			<n-alert v-if="csvModelDescription" type="default" :show-icon="false">
				<span class="fmt-label">Columns:</span> <code class="fmt-code">{{ csvModelDescription }}</code>
			</n-alert>

			<n-data-table :columns="columns" :data="editableData" :pagination="false"
				:max-height="360" :scroll-x="1900" size="small"
				:row-key="(r: DataRow) => r.id" />

			<div class="import-footer">
				<span class="row-count" :class="{ err: hasErrors }">
					{{ editableData.length }} row{{ editableData.length === 1 ? '' : 's' }}<template v-if="hasErrors"> · fix highlighted cells to import</template>
				</span>
				<n-space>
					<n-button @click="cancelImport">Cancel</n-button>
					<n-button type="primary" @click="confirmImport" :disabled="hasErrors || editableData.length === 0">
						Import {{ editableData.length || '' }}
					</n-button>
				</n-space>
			</div>
		</n-space>
	</n-modal>
</template>

<script setup lang="ts">
import { ref, watch, h, computed } from 'vue'
import {
	NModal, NSpace, NButton, NAlert, NRadioGroup, NRadioButton, NDataTable, NInput, NTooltip, NIcon
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { CloudUploadOutline, DocumentTextOutline, DownloadOutline, AddOutline } from '@vicons/ionicons5'
import Papa from 'papaparse'
import type { ParseResult } from 'papaparse';

interface DataRow {
	[key: string]: string | number | undefined;
	id: number; // Unique ID for editing
}

const props = defineProps({
	show: {
		type: Boolean,
		required: true
	},
	initialData: {
		type: Array,
		required: true
	},
	initialDelimiter: {
		type: String,
		required: true
	},
	rawFileContent: {
		type: String,
		default: ''
	},
	csvModelDescription: { // New prop for CSV model info
		type: String,
		default: ''
	},
	importType: {
		type: String as () => 'workout' | 'nutrition',
		required: true
	}
});

const emit = defineEmits(['update:show', 'confirm', 'cancel']);

const showModal = ref(props.show);
const selectedDelimiter = ref(props.initialDelimiter || ',');
const editableData = ref<DataRow[]>([]);
const validationErrors = ref<Record<number, Record<string, string>>>({});
const hasErrors = computed(() => Object.keys(validationErrors.value).length > 0);

const rawPastedText = ref('');
const localFileContent = ref('');
const fileName = ref('');
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// A loaded file (dropped/browsed, or provided by the parent) takes precedence over pasted text.
const currentRawContent = computed(() =>
	localFileContent.value || props.rawFileContent || rawPastedText.value
);

const readFile = (file: File) => {
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		localFileContent.value = String(reader.result || '');
		fileName.value = file.name;
	};
	reader.readAsText(file);
};

const onFileChange = (e: Event) => {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (file) readFile(file);
};

const onDrop = (e: DragEvent) => {
	isDragging.value = false;
	const file = e.dataTransfer?.files?.[0];
	if (file) readFile(file);
};

const clearFile = () => {
	localFileContent.value = '';
	fileName.value = '';
	if (fileInput.value) fileInput.value.value = '';
};

const parseContent = (content: string) => {
	if (!content) {
		initializeEditableData([]);
		return;
	}
	Papa.parse(content, {
		header: true,
		skipEmptyLines: true,
		delimiter: selectedDelimiter.value,
		transformHeader: (h: string) => h.trim(),
		complete: (results: ParseResult<any>) => {
			if (results.errors.length) console.error('Parsing errors:', results.errors);
			initializeEditableData(results.data);
			validateAllRows();
		}
	});
};

watch(() => props.show, (newVal) => {
	showModal.value = newVal;
	if (newVal) {
		rawPastedText.value = '';
		localFileContent.value = '';
		fileName.value = '';
		parseContent(currentRawContent.value);
	}
});

watch(showModal, (newVal) => emit('update:show', newVal));

watch([currentRawContent, selectedDelimiter], () => parseContent(currentRawContent.value));

watch(editableData, () => validateAllRows(), { deep: true });

const addEmptyRow = () => {
	editableData.value.push({ id: Date.now() + editableData.value.length } as DataRow);
};

const downloadTemplate = () => {
	const keys = workoutColumns.map(c => String((c as any).key));
	const example: Record<string, string> = {
		name: 'Easy run', date: '2026-06-22', type: 'running', duration: '45', distance: '8',
		isCompleted: '1', actualDuration: '44', rpe: '5', totalWeightLifted: '', caloriesBurned: '',
		targetPace: '5:30/km', gymType: '', notes: 'Felt good',
	};
	const csv = `${keys.join(',')}\n${keys.map(k => example[k] ?? '').join(',')}\n`;
	const blob = new Blob([csv], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'workout-import-template.csv';
	a.click();
	URL.revokeObjectURL(url);
};

const validateWorkoutRow = (row: DataRow): Record<string, string> => {
	const errors: Record<string, string> = {};

	if (!row.name || (row.name as string).trim() === '') {
		errors.name = 'Name is required.';
	}
	if (!row.date || (row.date as string).trim() === '') {
		errors.date = 'Date is required.';
	} else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date as string)) {
		errors.date = 'Date must be YYYY-MM-DD format.';
	}

	if (row.duration !== undefined && row.duration !== '' && isNaN(Number(row.duration))) {
		errors.duration = 'Duration must be a number.';
	}
	if (row.caloriesBurned !== undefined && row.caloriesBurned !== '' && isNaN(Number(row.caloriesBurned))) {
		errors.caloriesBurned = 'Calories Burned must be a number.';
	}
	if (row.isCompleted !== undefined && row.isCompleted !== '' && ![0, 1].includes(Number(row.isCompleted))) {
		errors.isCompleted = 'Completed must be 0 or 1.';
	}

	// New validations for additional workout fields
	if (row.actualDuration !== undefined && row.actualDuration !== '' && isNaN(Number(row.actualDuration))) {
		errors.actualDuration = 'Actual Duration must be a number.';
	}
	if (row.rpe !== undefined && row.rpe !== '' && isNaN(Number(row.rpe))) {
		errors.rpe = 'RPE must be a number.';
	}
	if (row.totalWeightLifted !== undefined && row.totalWeightLifted !== '' && isNaN(Number(row.totalWeightLifted))) {
		errors.totalWeightLifted = 'Total Weight Lifted must be a number.';
	}
	if (row.distance !== undefined && row.distance !== '' && isNaN(Number(row.distance))) {
		errors.distance = 'Distance must be a number.';
	}
	return errors;
};

const validateNutritionRow = (row: DataRow): Record<string, string> => {
	const errors: Record<string, string> = {};

	if (!row.date || (row.date as string).trim() === '') {
		errors.date = 'Date is required.';
	} else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date as string)) {
		errors.date = 'Date must be YYYY-MM-DD format.';
	}

	const numericFields = ['energyTarget_kcal', 'proteinTarget_g', 'carbTarget_g', 'fatTarget_g', 'mealsPerDay', 'preWorkoutCarbs_g', 'postWorkoutProtein_g', 'hydration_ml', 'fiber_g', 'bodyWeightTarget_kg'];
	for (const field of numericFields) {
		if (row[field] !== undefined && row[field] !== '' && isNaN(Number(row[field]))) {
			errors[field] = `${field} must be a number.`;
		}
	}
	return errors;
};

const validateRow = (row: DataRow): Record<string, string> => {
	if (props.importType === 'workout') {
		return validateWorkoutRow(row);
	} else {
		return validateNutritionRow(row);
	}
};

const validateAllRows = () => {
	const allErrors: Record<number, Record<string, string>> = {};
	editableData.value.forEach((row, index) => {
		const rowErrors = validateRow(row);
		if (Object.keys(rowErrors).length > 0) {
			allErrors[index] = rowErrors;
		}
	});
	validationErrors.value = allErrors;
};

const initializeEditableData = (data: any[]) => {
	editableData.value = data.map((row, index) => ({
		...row,
		id: index // Add a unique ID for Naive UI table key
	}));
};

const workoutColumns: DataTableColumns<DataRow> = [
	{
		title: 'Name',
		key: 'name',
		render(row, index) {
			const error = validationErrors.value[index]?.name;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.name as string,
							  'onUpdate:value': (v) => editableData.value[index].name = v,
							  placeholder: 'Workout Name',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Date',
		key: 'date',
		render(row, index) {
			const error = validationErrors.value[index]?.date;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.date as string,
							  'onUpdate:value': (v) => editableData.value[index].date = v,
							  placeholder: 'YYYY-MM-DD',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Duration (min)',
		key: 'duration',
		render(row, index) {
			const error = validationErrors.value[index]?.duration;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.duration as string,
							  'onUpdate:value': (v) => editableData.value[index].duration = v,
							  placeholder: 'e.g., 60',
							  type: 'text',
							  inputmode: 'numeric',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Calories Burned',
		key: 'caloriesBurned',
		render(row, index) {
			const error = validationErrors.value[index]?.caloriesBurned;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.caloriesBurned as string,
							  'onUpdate:value': (v) => editableData.value[index].caloriesBurned = v,
							  placeholder: 'e.g., 300',
							  type: 'text',
							  inputmode: 'numeric',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Type',
		key: 'type',
		render(row, index) {
			const error = validationErrors.value[index]?.type;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.type as string,
							  'onUpdate:value': (v) => editableData.value[index].type = v,
							  placeholder: 'e.g., running',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Target Pace',
		key: 'targetPace',
		render(row, index) {
			const error = validationErrors.value[index]?.targetPace;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.targetPace as string,
							  'onUpdate:value': (v) => editableData.value[index].targetPace = v,
							  placeholder: 'e.g., 5:00/km',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}

	},
	{
		title: 'Completed',
		key: 'isCompleted',
		render(row, index) {
			const error = validationErrors.value[index]?.isCompleted;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.isCompleted as string,
							  'onUpdate:value': (v) => editableData.value[index].isCompleted = v,
							  placeholder: '0 or 1',
							  type: 'text',
							  inputmode: 'numeric',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Actual Duration (min)',
		key: 'actualDuration',
		render(row, index) {
			const error = validationErrors.value[index]?.actualDuration;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.actualDuration as string,
							  'onUpdate:value': (v) => editableData.value[index].actualDuration = v,
							  placeholder: 'e.g., 55',
							  type: 'text',
							  inputmode: 'numeric',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'RPE',
		key: 'rpe',
		render(row, index) {
			const error = validationErrors.value[index]?.rpe;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.rpe as string,
							  'onUpdate:value': (v) => editableData.value[index].rpe = v,
							  placeholder: 'e.g., 7',
							  type: 'text',
							  inputmode: 'numeric',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Notes',
		key: 'notes',
		render(row, index) {
			const error = validationErrors.value[index]?.notes;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.notes as string,
							  'onUpdate:value': (v) => editableData.value[index].notes = v,
							  placeholder: 'e.g., felt good',
							  type: 'textarea',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Total Weight Lifted (kg)',
		key: 'totalWeightLifted',
		render(row, index) {
			const error = validationErrors.value[index]?.totalWeightLifted;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.totalWeightLifted as string,
							  'onUpdate:value': (v) => editableData.value[index].totalWeightLifted = v,
							  placeholder: 'e.g., 5000',
							  type: 'text',
							  inputmode: 'numeric',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Distance (km)',
		key: 'distance',
		render(row, index) {
			const error = validationErrors.value[index]?.distance;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.distance as string,
							  'onUpdate:value': (v) => editableData.value[index].distance = v,
							  placeholder: 'e.g., 10.5',
							  type: 'text',
							  inputmode: 'numeric',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	}
];

const nutritionColumns: DataTableColumns<DataRow> = [
	{
		title: 'Date',
		key: 'date',
		render(row, index) {
			const error = validationErrors.value[index]?.date;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.date as string,
							  'onUpdate:value': (v) => editableData.value[index].date = v,
							  placeholder: 'YYYY-MM-DD',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Energy Target (kcal)',
		key: 'energyTarget_kcal',
		render(row, index) {
			const error = validationErrors.value[index]?.energyTarget_kcal;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.energyTarget_kcal as string,
							  'onUpdate:value': (v) => editableData.value[index].energyTarget_kcal = v,
							  placeholder: 'e.g., 2500',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Protein Target (g)',
		key: 'proteinTarget_g',
		render(row, index) {
			const error = validationErrors.value[index]?.proteinTarget_g;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.proteinTarget_g as string,
							  'onUpdate:value': (v) => editableData.value[index].proteinTarget_g = v,
							  placeholder: 'e.g., 150',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Carb Target (g)',
		key: 'carbTarget_g',
		render(row, index) {
			const error = validationErrors.value[index]?.carbTarget_g;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.carbTarget_g as string,
							  'onUpdate:value': (v) => editableData.value[index].carbTarget_g = v,
							  placeholder: 'e.g., 300',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Fat Target (g)',
		key: 'fatTarget_g',
		render(row, index) {
			const error = validationErrors.value[index]?.fatTarget_g;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.fatTarget_g as string,
							  'onUpdate:value': (v) => editableData.value[index].fatTarget_g = v,
							  placeholder: 'e.g., 80',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Meals Per Day',
		key: 'mealsPerDay',
		render(row, index) {
			const error = validationErrors.value[index]?.mealsPerDay;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.mealsPerDay as string,
							  'onUpdate:value': (v) => editableData.value[index].mealsPerDay = v,
							  placeholder: 'e.g., 5',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Pre-Workout Carbs (g)',
		key: 'preWorkoutCarbs_g',
		render(row, index) {
			const error = validationErrors.value[index]?.preWorkoutCarbs_g;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.preWorkoutCarbs_g as string,
							  'onUpdate:value': (v) => editableData.value[index].preWorkoutCarbs_g = v,
							  placeholder: 'e.g., 30',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Post-Workout Protein (g)',
		key: 'postWorkoutProtein_g',
		render(row, index) {
			const error = validationErrors.value[index]?.postWorkoutProtein_g;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.postWorkoutProtein_g as string,
							  'onUpdate:value': (v) => editableData.value[index].postWorkoutProtein_g = v,
							  placeholder: 'e.g., 25',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Hydration (ml)',
		key: 'hydration_ml',
		render(row, index) {
			const error = validationErrors.value[index]?.hydration_ml;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.hydration_ml as string,
							  'onUpdate:value': (v) => editableData.value[index].hydration_ml = v,
							  placeholder: 'e.g., 3000',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Fiber (g)',
		key: 'fiber_g',
		render(row, index) {
			const error = validationErrors.value[index]?.fiber_g;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.fiber_g as string,
							  'onUpdate:value': (v) => editableData.value[index].fiber_g = v,
							  placeholder: 'e.g., 30',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Weight Target (kg)',
		key: 'bodyWeightTarget_kg',
		render(row, index) {
			const error = validationErrors.value[index]?.bodyWeightTarget_kg;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.bodyWeightTarget_kg as string,
							  'onUpdate:value': (v) => editableData.value[index].bodyWeightTarget_kg = v,
							  placeholder: 'e.g., 75',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	},
	{
		title: 'Notes',
		key: 'notes',
		render(row, index) {
			const error = validationErrors.value[index]?.notes;
			return h(
				NTooltip,
				{ trigger: 'hover', disabled: !error },
				{
					trigger: () =>
						h(
							NInput,
							{ value: row.notes as string,
							  'onUpdate:value': (v) => editableData.value[index].notes = v,
							  placeholder: 'e.g., feeling energetic',
							  type: 'textarea',
							  status: error ? 'error' : undefined
							})
					,
					default: () => error
				}
			);
		}
	}
];

const columns = computed(() => {
	return props.importType === 'workout' ? workoutColumns : nutritionColumns;
});

const cancelImport = () => {
	emit('cancel');
	showModal.value = false;
};

const confirmImport = () => {
	emit('confirm', editableData.value);
	showModal.value = false;
};
</script>

<style scoped>
.import-sources { display: flex; flex-direction: column; gap: 10px; }
.dropzone {
	display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
	padding: 22px; border: 1.5px dashed var(--border-strong); border-radius: var(--radius);
	background: var(--surface-2); cursor: pointer; transition: border-color 0.15s, background 0.15s;
	color: var(--text-secondary);
}
.dropzone:hover, .dropzone.dragging { border-color: var(--primary-color); background: var(--primary-soft); }
.dz-icon { font-size: 1.6rem; color: var(--text-muted); }
.dz-text strong { color: var(--text-color); }
.file-chip { display: inline-flex; align-items: center; gap: 8px; color: var(--text-color); font-size: 0.9rem; }
.chip-x { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; }
.chip-x:hover { color: var(--danger-color); }
.paste-divider { display: flex; align-items: center; color: var(--text-muted); font-size: 0.78rem; }
.paste-divider span { white-space: nowrap; }

.import-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.delim { display: flex; align-items: center; gap: 10px; }
.delim .lbl { color: var(--text-secondary); font-size: 0.82rem; }

.fmt-label { color: var(--text-secondary); font-weight: 500; margin-right: 6px; }
.fmt-code { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-secondary); }

.import-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.row-count { font-size: 0.82rem; color: var(--text-secondary); }
.row-count.err { color: var(--warning-color); }
</style>