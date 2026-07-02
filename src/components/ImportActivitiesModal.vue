<template>
	<CustomModal :show="show" title="Import activity files" @update:show="v => emit('update:show', v)">
		<div class="import-body">
			<p class="import-hint">
				Drop <strong>.fit</strong>, <strong>.gpx</strong> or <strong>.tcx</strong> files (also <strong>.gz</strong>) from
				HealthFit, Apple Health or a Strava bulk export. Heart rate, GPS, splits and best efforts are read directly from the file.
			</p>

			<div
				class="drop-zone"
				:class="{ over: dragOver }"
				@click="fileInput?.click()"
				@dragover.prevent="dragOver = true"
				@dragleave="dragOver = false"
				@drop.prevent="onDrop"
			>
				<n-icon :component="CloudUploadOutline" class="drop-icon" />
				<span v-if="!parsing">Click to choose files or drag them here</span>
				<span v-else class="ascii-spinner">Parsing {{ parsingName }}</span>
				<input
					ref="fileInput"
					type="file"
					multiple
					accept=".fit,.gpx,.tcx,.gz,application/gzip"
					style="display: none"
					@change="onPick"
				/>
			</div>

			<div v-if="errors.length" class="parse-errors">
				<div v-for="(err, i) in errors" :key="i" class="parse-error">⚠ {{ err }}</div>
			</div>

			<div v-if="parsed.length" class="parsed-list">
				<div v-for="(item, i) in parsed" :key="i" class="parsed-row" :class="{ off: !item.selected }">
					<input type="checkbox" v-model="item.selected" />
					<div class="parsed-info">
						<span class="parsed-name">{{ item.activity.name }}</span>
						<span class="parsed-meta mono">
							{{ item.activity.start_date_local.slice(0, 10) }}
							· {{ (item.activity.distance / 1000).toFixed(2) }} km
							· {{ Math.round(item.activity.moving_time / 60) }} min
							<template v-if="item.activity.average_heartrate"> · {{ Math.round(item.activity.average_heartrate) }} bpm</template>
						</span>
					</div>
					<span class="parsed-sport" :style="{ color: sportChipColor(item.activity.sport_type) }">{{ item.activity.sport_type }}</span>
				</div>

				<label class="create-workouts-toggle">
					<input type="checkbox" v-model="createWorkouts" />
					Also add them as completed workouts on the calendar
				</label>

				<div class="modal-actions">
					<button class="action-button" @click="reset">Clear</button>
					<button class="action-button primary" :disabled="saving || !selectedCount" @click="saveAll">
						<span v-if="!saving">Import {{ selectedCount }} activit{{ selectedCount === 1 ? 'y' : 'ies' }}</span>
						<span v-else class="ascii-spinner">Importing</span>
					</button>
				</div>
			</div>
		</div>
	</CustomModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NIcon, useMessage } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import CustomModal from './CustomModal.vue'
import { parseActivityFile, type ParsedActivity } from '@/import/parseActivityFile'
import { db } from '@/db'
import { getSportColor } from '@/utils/workouts'

defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'update:show', v: boolean): void; (e: 'imported'): void }>()

const message = useMessage()
const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const parsing = ref(false)
const parsingName = ref('')
const saving = ref(false)
const createWorkouts = ref(true)
const parsed = ref<{ activity: ParsedActivity; selected: boolean }[]>([])
const errors = ref<string[]>([])

const selectedCount = computed(() => parsed.value.filter(p => p.selected).length)

function sportChipColor(sport: string) {
	if (sport === 'Run') return getSportColor('running')
	if (sport === 'Ride') return getSportColor('bike')
	if (sport === 'WeightTraining') return getSportColor('gym')
	return getSportColor('other')
}

function onPick(e: Event) {
	const files = (e.target as HTMLInputElement).files
	if (files) handleFiles(Array.from(files))
	if (fileInput.value) fileInput.value.value = ''
}

function onDrop(e: DragEvent) {
	dragOver.value = false
	if (e.dataTransfer?.files) handleFiles(Array.from(e.dataTransfer.files))
}

async function handleFiles(files: File[]) {
	parsing.value = true
	for (const file of files) {
		parsingName.value = file.name
		try {
			const activity = await parseActivityFile(file)
			const dup = parsed.value.some(p =>
				p.activity.start_date === activity.start_date &&
				Math.abs(p.activity.distance - activity.distance) < 1)
			if (!dup) parsed.value.push({ activity, selected: true })
		} catch (err: any) {
			errors.value.push(`${file.name}: ${err?.message || err}`)
		}
	}
	parsing.value = false
	parsingName.value = ''
}

function sportToWorkoutType(sport: string): string {
	if (sport === 'Run') return 'Running'
	if (sport === 'Ride') return 'Bike'
	if (sport === 'WeightTraining') return 'Gym'
	return 'Other'
}

async function saveAll() {
	saving.value = true
	let imported = 0
	let duplicates = 0
	try {
		for (const item of parsed.value.filter(p => p.selected)) {
			const a = item.activity
			const res = await db.addImportedActivity(a)
			if (res.duplicate) { duplicates++; continue }
			imported++
			if (createWorkouts.value) {
				await db.addWorkout({
					name: a.name,
					date: a.start_date_local.slice(0, 10),
					type: sportToWorkoutType(a.sport_type),
					distance: a.distance ? Math.round((a.distance / 1000) * 100) / 100 : undefined,
					actualDuration: Math.round(a.moving_time / 60),
					caloriesBurned: a.calories ? Math.round(a.calories) : undefined,
					isCompleted: 1,
					stravaActivityId: res.id,
					notes: '',
				} as any)
			}
		}
		message.success(`Imported ${imported} activit${imported === 1 ? 'y' : 'ies'}${duplicates ? ` · ${duplicates} already existed` : ''}`)
		reset()
		emit('imported')
		emit('update:show', false)
	} catch (err: any) {
		const msg = String(err?.message || err)
		if (msg.startsWith('MISSING_TABLE')) {
			message.error('Database table missing — run supabase_imported_activities.sql in the Supabase SQL editor once.', { duration: 10000 })
		} else {
			message.error('Import failed: ' + msg)
		}
	} finally {
		saving.value = false
	}
}

function reset() {
	parsed.value = []
	errors.value = []
}
</script>

<style scoped>
.import-body { display: flex; flex-direction: column; gap: 14px; }
.import-hint { margin: 0; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; }

.drop-zone {
	border: 1.5px dashed var(--border-strong);
	border-radius: var(--radius);
	padding: 28px 16px;
	display: flex; flex-direction: column; align-items: center; gap: 8px;
	color: var(--text-secondary); font-size: 0.85rem;
	cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.drop-zone:hover, .drop-zone.over { border-color: var(--primary-color); background: var(--primary-soft); }
.drop-icon { font-size: 1.8rem; color: var(--text-muted); }

.parse-errors { display: flex; flex-direction: column; gap: 4px; }
.parse-error { font-size: 0.78rem; color: var(--danger-color); background: var(--danger-soft); padding: 6px 10px; border-radius: var(--radius-sm); }

.parsed-list { display: flex; flex-direction: column; gap: 8px; }
.parsed-row {
	display: flex; align-items: center; gap: 12px;
	background: var(--surface-2); border: 1px solid var(--border-color);
	border-radius: var(--radius-sm); padding: 10px 12px;
}
.parsed-row.off { opacity: 0.45; }
.parsed-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.parsed-name { font-size: 0.86rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.parsed-meta { font-size: 0.74rem; color: var(--text-muted); }
.parsed-sport { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }

.create-workouts-toggle {
	display: flex; align-items: center; gap: 8px;
	font-size: 0.82rem; color: var(--text-secondary); cursor: pointer;
	margin-top: 4px;
}

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
.action-button {
	background: var(--surface-2); border: 1px solid var(--border-color); color: var(--text-color);
	padding: 9px 15px; border-radius: var(--radius-sm); cursor: pointer;
	font-family: var(--font-family); font-size: 0.85rem; font-weight: 500;
	display: inline-flex; align-items: center; gap: 7px;
}
.action-button:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--border-strong); }
.action-button.primary { background: var(--primary-color); border-color: var(--primary-color); color: #fff; }
.action-button.primary:hover:not(:disabled) { background: var(--primary-strong); }
.action-button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
