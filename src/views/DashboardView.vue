<template>
  <div class="dashboard-view-wrapper">
    <div class="dashboard-view">
      <div class="page-head">
        <div>
          <h1>Schedule</h1>
          <p class="sub">Paces update automatically from your fitness and goals — no need to rewrite the plan</p>
        </div>
        <div class="actions-bar">
          <button @click="openAddWorkoutModal(null)" class="action-button primary">
            <n-icon :component="AddOutline" /> Add workout
          </button>
          <button @click="showLogWeightModal = true" class="action-button">
            <n-icon :component="BodyOutline" /> Log weight
          </button>
          <button @click="showActivityImport = true" class="action-button">
            <n-icon :component="WatchOutline" /> Import activities
          </button>
          <button @click="handleImportSys" class="action-button">
            <n-icon :component="CloudUploadOutline" /> Import CSV
          </button>
        </div>
      </div>

      <div class="calendar-container">
        <div class="calendar-header">
          <button @click="goPrev" class="nav-button" :aria-label="viewMode === 'week' ? 'Previous week' : 'Previous month'"><n-icon :component="ChevronBackOutline" /></button>
          <span class="month-display">{{ viewMode === 'week' ? weekRangeLabel : formattedCurrentMonth }}</span>
          <button @click="goNext" class="nav-button" :aria-label="viewMode === 'week' ? 'Next week' : 'Next month'"><n-icon :component="ChevronForwardOutline" /></button>
          <div class="view-toggle">
            <button :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">Month</button>
            <button :class="{ active: viewMode === 'week' }" @click="setWeekView">Week</button>
          </div>
        </div>

        <!-- WEEK VIEW: full session details for the week at a glance -->
        <div v-if="viewMode === 'week'" class="week-view">
          <div v-for="day in weekDetailed" :key="day.key" class="wv-day" :class="{ 'wv-today': day.isToday }">
            <div class="wv-dayhead">
              <span class="wv-dow">{{ day.dow }}</span>
              <span class="wv-datenum">{{ day.dayNum }}</span>
              <span v-for="goal in day.raceGoals" :key="goal.id" class="wv-race"><n-icon :component="FlagOutline" /> {{ goal.name }}</span>
              <button class="wv-add" @click="openAddWorkoutModal(day.date)" aria-label="Add workout"><n-icon :component="AddOutline" /></button>
            </div>
            <p v-if="day.workouts.length === 0" class="wv-restday">Rest day</p>
            <div v-else class="wv-sessions">
              <div v-for="w in day.workouts" :key="w.id" class="wv-card" :class="getWorkoutClass(w)" @click="openDetailsModal(w)">
                <span class="wv-badge"><n-icon :component="workoutIcon(w)" /></span>
                <div class="wv-body">
                  <div class="wv-cardtop">
                    <span class="wv-name">{{ w.name }}</span>
                    <n-icon v-if="w.isCompleted === 1" class="wv-done" :component="CheckmarkCircle" />
                  </div>
                  <div v-if="hasStats(w)" class="wv-pills">
                    <span v-if="w.distance" class="wv-pill">{{ w.distance }} km</span>
                    <span v-if="w.duration" class="wv-pill">{{ w.duration }} min</span>
                    <span v-if="sessionPaceFor(w)" class="wv-pill wv-pill-pace"
                      :class="'basis-' + sessionPaceFor(w)!.basis" :title="sessionPaceFor(w)!.explain">
                      {{ sessionPaceFor(w)!.zone }} · {{ sessionPaceFor(w)!.value
                      }}<template v-if="sessionPaceFor(w)!.basis !== 'planned'">/km</template>
                    </span>
                    <span v-if="w.gymType" class="wv-pill">{{ w.gymType }}</span>
                  </div>
                  <ul v-if="noteSteps(w).length" class="wv-steps">
                    <li v-for="(step, i) in noteSteps(w)" :key="i">{{ step }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="viewMode === 'month'" class="calendar-grid days-header">
          <div v-for="day in weekDays" :key="day" class="day-cell header">{{ day }}</div>
        </div>
        <div v-if="viewMode === 'month'" class="calendar-grid">
          <div v-for="day in days" :key="day.date.toISOString()" 
               class="day-cell" 
               :class="{ 
                 'not-current-month': !day.isCurrentMonth,
                 'is-today': day.isToday,
                 'drag-over': dragOverDate === format(day.date, 'yyyy-MM-dd')
               }" 
               @click.stop="openAddWorkoutModal(day.date)"
               @dragover.prevent
               @dragenter.prevent="onDragEnter(day.date)"
               @dragleave="onDragLeave(day.date)"
               @drop="onDrop($event, day.date)">
            <div class="day-number">{{ day.dayOfMonth }}</div>
            <div class="events">
              <div v-for="goal in day.raceGoals" :key="goal.id" class="event-tag race-goal-tag">
                <n-icon :component="FlagOutline" /> {{ goal.name }}
              </div>
              <div v-for="workout in day.workouts" :key="workout.id"
                   class="event-tag workout-tag"
                   :class="[getWorkoutClass(workout), { 'dragging': draggingWorkoutId === workout.id }]"
                   :draggable="workout.isCompleted !== 1"
                   @dragstart="onDragStart($event, workout)"
                   @dragend="onDragEnd"
                   @click.stop="openDetailsModal(workout)">
                <div class="workout-banner"></div>
                <div class="wt-body">
                  <span class="wt-title">
                    <n-icon v-if="workout.isCompleted === 1" class="done-check" :component="CheckmarkCircle" />
                    <n-icon v-else class="wt-ico" :component="workoutIcon(workout)" />
                    <span class="event-name">{{ workout.name }}</span>
                  </span>
                  <span v-if="workoutMeta(workout)" class="wt-meta">{{ workoutMeta(workout) }}</span>
                </div>
              </div>
              <div v-for="weight in day.dailyWeights" :key="weight.id" class="event-tag weight-tag">
                <n-icon :component="BodyOutline" /> {{ weight.weight }} kg
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add Workout Modal -->
      <CustomModal v-model:show="showAddWorkoutModal" title="New workout">
        <div class="form-container">
          <div class="form-group">
            <label for="workout-name">Name</label>
            <input type="text" id="workout-name" v-model="newWorkout.name" placeholder="e.g. Easy run" />
          </div>
          <div class="form-group">
            <label for="workout-date">Date</label>
            <input type="date" id="workout-date" v-model="newWorkout.date" />
          </div>
          <div class="form-group">
            <label for="workout-type">Type</label>
            <select id="workout-type" v-model="newWorkout.type">
              <option>Running</option>
              <option>Gym</option>
              <option>Bike</option>
              <option>Rest</option>
              <option>Other</option>
            </select>
          </div>
          <button @click="saveNewWorkout" class="action-button primary save-button" :disabled="isActionLoading">
            <span v-if="!isActionLoading">Save workout</span>
            <span v-else class="ascii-spinner">Saving</span>
          </button>
        </div>
      </CustomModal>

      <!-- Log Weight Modal -->
      <CustomModal v-model:show="showLogWeightModal" title="Log body weight">
        <div class="form-container">
          <div class="form-group">
            <label for="weight-amount">Weight (kg)</label>
            <input type="number" id="weight-amount" v-model="newWeight.weight" />
          </div>
          <div class="form-group">
            <label for="weight-date">Date</label>
            <input type="date" id="weight-date" v-model="newWeight.date" />
          </div>
          <button @click="saveNewWeight" class="action-button primary save-button" :disabled="isActionLoading">
            <span v-if="!isActionLoading">Save weight</span>
            <span v-else class="ascii-spinner">Saving</span>
          </button>
        </div>
      </CustomModal>

      <!-- Details/Edit/Complete Workout Modal -->
      <CustomModal v-if="selectedWorkout" v-model:show="showDetailsModal" :title="modalTitle">
        <!-- View Mode -->
        <div v-if="modalMode === 'view'" class="details-view">
          <div class="rn-card" :class="getWorkoutClass(selectedWorkout)">
            <div class="rn-head">
              <span class="rn-badge"><n-icon :component="workoutIcon(selectedWorkout)" /></span>
              <div class="rn-headtext">
                <h2 class="rn-title">{{ selectedWorkout.name }}</h2>
                <span class="rn-sub">{{ workoutTypeLabel(selectedWorkout) }} · {{ formatLongDate(selectedWorkout.date) }}</span>
              </div>
              <span v-if="selectedWorkout.isCompleted" class="rn-done"><n-icon :component="CheckmarkCircle" /></span>
            </div>

            <div v-if="hasStats(selectedWorkout)" class="rn-stats">
              <div v-if="selectedWorkout.distance" class="rn-stat">
                <span class="rn-val"><span class="rn-num">{{ selectedWorkout.distance }}</span><span class="rn-unit">km</span></span>
                <span class="rn-lbl">Distance</span>
              </div>
              <div v-if="selectedWorkout.duration" class="rn-stat">
                <span class="rn-val"><span class="rn-num">{{ selectedWorkout.duration }}</span><span class="rn-unit">min</span></span>
                <span class="rn-lbl">Duration</span>
              </div>
              <div v-if="sessionPaceFor(selectedWorkout)" class="rn-stat rn-stat-pace"
                :class="'basis-' + sessionPaceFor(selectedWorkout)!.basis"
                :title="sessionPaceFor(selectedWorkout)!.explain">
                <span class="rn-val">
                  <span class="rn-num">{{ sessionPaceFor(selectedWorkout)!.value }}</span>
                  <span v-if="sessionPaceFor(selectedWorkout)!.basis !== 'planned'" class="rn-unit">/km</span>
                </span>
                <span class="rn-lbl">{{ sessionPaceFor(selectedWorkout)!.zone }}</span>
              </div>
              <div v-if="selectedWorkout.gymType" class="rn-stat">
                <span class="rn-val"><span class="rn-num rn-num-sm">{{ selectedWorkout.gymType }}</span></span>
                <span class="rn-lbl">Focus</span>
              </div>
            </div>

            <div v-if="noteSteps(selectedWorkout).length" class="rn-plan">
              <span class="rn-plan-h">Session plan</span>
              <ul class="rn-steps">
                <li v-for="(step, i) in noteSteps(selectedWorkout)" :key="i">{{ step }}</li>
              </ul>
            </div>
          </div>

          <div v-if="selectedWorkout.isCompleted" class="detail-completed">
            <span class="status-pill"><n-icon :component="CheckmarkCircle" /> Completed</span>
            <dl class="detail-list">
              <div v-if="selectedWorkout.actualDuration"><dt>Actual duration</dt><dd>{{ selectedWorkout.actualDuration }} min</dd></div>
              <div v-if="selectedWorkout.totalWeightLifted"><dt>Load lifted</dt><dd>{{ selectedWorkout.totalWeightLifted }} kg</dd></div>
              <div v-if="selectedWorkout.rpe"><dt>RPE</dt><dd>{{ selectedWorkout.rpe }}/10</dd></div>
            </dl>
          </div>

          <div class="modal-actions">
            <button @click="handleDeleteWorkout" class="action-button delete-button" :disabled="isActionLoading">
              <span v-if="!isActionLoading"><n-icon :component="TrashOutline" /> Delete</span>
              <span v-else class="ascii-spinner">Deleting</span>
            </button>
            <button @click="modalMode = 'edit'" class="action-button">
              <n-icon :component="CreateOutline" /> Edit
            </button>
            <button v-if="!selectedWorkout.isCompleted" @click="modalMode = 'complete'" class="action-button primary save-button">
              <n-icon :component="CheckmarkOutline" /> Complete
            </button>
            <button v-else @click="goToDetails" class="action-button primary save-button">
              <n-icon :component="MapOutline" /> View full details
            </button>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else-if="modalMode === 'edit'" class="form-container">
          <div class="form-group">
            <label>Name</label>
            <input type="text" v-model="selectedWorkout.name" />
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" v-model="selectedWorkout.date" />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="selectedWorkout.type">
              <option>Running</option>
              <option>Gym</option>
              <option>Bike</option>
              <option>Rest</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Planned duration (min)</label>
            <input type="number" v-model="selectedWorkout.duration" />
          </div>
          <div class="form-group">
            <label>Planned distance (km)</label>
            <input type="number" v-model="selectedWorkout.distance" />
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="selectedWorkout.notes"></textarea>
          </div>

          <div class="modal-actions">
            <button @click="modalMode = 'view'" class="action-button">Cancel</button>
            <button @click="handleUpdateWorkout" class="action-button primary save-button" :disabled="isActionLoading">
              <span v-if="!isActionLoading">Save changes</span>
              <span v-else class="ascii-spinner">Saving</span>
            </button>
          </div>
        </div>

        <!-- Complete Mode -->
        <div v-else-if="modalMode === 'complete'" class="form-container">
          <!-- Running / bike: link a recorded activity as the source of truth -->
          <template v-if="getWorkoutType(selectedWorkout) === 'running' || getWorkoutType(selectedWorkout) === 'bike'">
            <div class="form-group">
              <label for="strava-activity">Recorded activity</label>
              <select id="strava-activity" v-model="completionData.stravaActivityId" :disabled="isStravaLoading">
                <option :value="undefined">-- {{ isStravaLoading ? 'Loading…' : 'Enter manually' }} --</option>
                <option v-for="activity in stravaActivityOptions" :key="activity.value" :value="activity.value">
                  {{ activity.label }}
                </option>
                <option v-if="!isStravaLoading && stravaActivityOptions.length === 0" disabled>
                  -- No activities found --
                </option>
              </select>
            </div>

            <div class="fit-import-row">
              <button class="action-button" :disabled="isFitImporting" @click="fitInput?.click()">
                <span v-if="!isFitImporting">Import FIT file…</span>
                <span v-else class="ascii-spinner">Importing</span>
              </button>
              <span class="fit-import-hint">import a .fit/.gpx/.tcx file and link it to this workout</span>
              <input ref="fitInput" type="file" accept=".fit,.gpx,.tcx,.gz,application/gzip" style="display: none"
                @change="onCompletionFitPicked" />
            </div>

            <div v-if="stravaPreview" class="strava-preview">
              <span class="sp-item"><span class="sp-num">{{ stravaPreview.distance }}</span> km</span>
              <span class="sp-item"><span class="sp-num">{{ stravaPreview.duration }}</span> min</span>
              <span class="sp-note">pulled from activity</span>
            </div>

            <!-- Manual fallback when no Strava activity is linked -->
            <template v-if="!completionData.stravaActivityId">
              <div class="form-group">
                <label>Actual distance (km)</label>
                <input type="number" v-model="completionData.distance" />
              </div>
            </template>
          </template>

          <!-- Gym: load lifted -->
          <template v-else-if="getWorkoutType(selectedWorkout) === 'gym'">
            <div class="form-group">
              <label>Load lifted (kg)</label>
              <input type="number" v-model="completionData.totalWeightLifted" />
            </div>
          </template>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="completionData.notes"></textarea>
          </div>

          <div class="modal-actions">
            <button @click="modalMode = 'view'" class="action-button">Cancel</button>
            <button @click="handleSaveCompletion" class="action-button primary save-button" :disabled="isActionLoading">
              <span v-if="!isActionLoading">Save completion</span>
              <span v-else class="ascii-spinner">Saving</span>
            </button>
          </div>
        </div>
      </CustomModal>

      <!-- Activity file import (FIT/GPX/TCX) -->
      <ImportActivitiesModal v-model:show="showActivityImport" @imported="onActivitiesImported" />

      <!-- Import Editor Modal -->
      <ImportEditor
        v-model:show="showImportEditor"
        :initial-data="[]"
        initial-delimiter=","
        :raw-file-content="importRawContent"
        import-type="workout"
        csv-model-description="name, date (YYYY-MM-DD), type, duration (min), distance (km), isCompleted (0/1), actualDuration (min), rpe, totalWeightLifted (kg), caloriesBurned, targetPace, notes"
        @confirm="onImportConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, NIcon } from 'naive-ui';
import {
  AddOutline, BodyOutline, CloudUploadOutline, ChevronBackOutline, ChevronForwardOutline,
  FlagOutline, CheckmarkCircle, TrashOutline, CreateOutline, CheckmarkOutline, MapOutline,
  WatchOutline, WalkOutline, BarbellOutline, BicycleOutline, BedOutline, FitnessOutline,
} from '@vicons/ionicons5';
import { db } from '@/db';

const router = useRouter();
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek,
  endOfWeek,
  getDate,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Workout, AddWorkoutPayload, DailyWeight, CompleteWorkoutFormValues, RaceGoal, Activity } from '../types';
import CustomModal from '../components/CustomModal.vue';
import ImportEditor from '../components/ImportEditor.vue';
import ImportActivitiesModal from '../components/ImportActivitiesModal.vue';
import { activityApi } from '../activities';
import { parseActivityFile } from '@/import/parseActivityFile';
import { targetForDate, hydrateSettings } from '@/settings';
import { currentVdot, hydrateFitness, refreshFitness, setActivities, setWorkouts } from '@/fitness';
import { paceParts, sessionPace, type SessionPace } from '@/utils/paceAdvice';
import { noteSteps, type SportType } from '@/utils/workouts';
import { buildActivityIndex, effectiveWorkoutType } from '@/utils/workoutSport';

const isActionLoading = ref(false);
const message = useMessage();

// == DRAG AND DROP LOGIC START ==
const draggingWorkoutId = ref<number | null>(null);
const dragOverDate = ref<string | null>(null);

function onDragStart(event: DragEvent, workout: Workout) {
  if (workout.isCompleted === 1) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.setData('workoutId', String(workout.id));
    event.dataTransfer.effectAllowed = 'move';
    draggingWorkoutId.value = workout.id;
  }
}

function onDragEnd() {
  draggingWorkoutId.value = null;
  dragOverDate.value = null;
}

function onDragEnter(date: Date) {
  dragOverDate.value = format(date, 'yyyy-MM-dd');
}

function onDragLeave(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  if (dragOverDate.value === dateStr) {
    dragOverDate.value = null;
  }
}

async function onDrop(event: DragEvent, date: Date) {
  const workoutId = event.dataTransfer?.getData('workoutId');
  dragOverDate.value = null;
  draggingWorkoutId.value = null;

  if (!workoutId) return;

  const workout = workouts.value.find(w => String(w.id) === workoutId);
  if (workout && workout.isCompleted !== 1) {
    const originalDate = workout.date;
    const newDate = format(date, 'yyyy-MM-dd');
    
    if (originalDate === newDate) return;

    isActionLoading.value = true;
    try {
      await db.updateWorkout({ ...workout, date: newDate });
      await loadWorkouts();
      message.success(`MOVED_TO_${newDate}`);
    } catch (e) {
      console.error(e);
      message.error('FAILED_TO_MOVE_WORKOUT');
    } finally {
      isActionLoading.value = false;
    }
  }
}
// == DRAG AND DROP LOGIC END ==

// == IMPORT LOGIC START ==
const showImportEditor = ref(false);
const showActivityImport = ref(false);
const importRawContent = ref('');

function handleImportSys() {
  importRawContent.value = '';
  showImportEditor.value = true;
}

// Coercion helpers keep the imported rows aligned with the DB workout model.
const toNum = (v: any): number | undefined => {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};
const toStr = (v: any): string | undefined =>
  v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim();

async function onImportConfirm(data: any[]) {
  isActionLoading.value = true;
  try {
    let successCount = 0;
    let skipped = 0;
    for (const row of data) {
      if (!row.name || !row.date) { skipped++; continue; }
      const workout: any = {
        name: String(row.name).trim(),
        date: String(row.date).trim(),
        type: toStr(row.type) || 'Other',
        duration: toNum(row.duration),
        distance: toNum(row.distance),
        actualDuration: toNum(row.actualDuration),
        rpe: toNum(row.rpe),
        totalWeightLifted: toNum(row.totalWeightLifted),
        caloriesBurned: toNum(row.caloriesBurned),
        targetPace: toStr(row.targetPace),
        gymType: toStr(row.gymType),
        notes: toStr(row.notes) || '',
        isCompleted: toNum(row.isCompleted) === 1 ? 1 : 0,
        isDeleted: 0,
      };
      await db.addWorkout(workout);
      successCount++;
    }
    message.success(`Imported ${successCount} workout${successCount === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}`);
    await loadWorkouts();
  } catch (error) {
    console.error('Import confirmation error:', error);
    message.error('Some rows failed to import — check the data and try again.');
  } finally {
    isActionLoading.value = false;
    showImportEditor.value = false;
  }
}
// == IMPORT LOGIC END ==

// == DETAILS/EDIT/COMPLETE MODAL LOGIC START ==
const showDetailsModal = ref(false);
const selectedWorkout = ref<Workout | null>(null);
const modalMode = ref<'view' | 'edit' | 'complete'>('view');
const completionData = ref<Partial<CompleteWorkoutFormValues>>({});
const stravaActivityOptions = ref<{ label: string; value: number; }[]>([]);
const stravaActivities = ref<Activity[]>([]);

const selectedStravaActivity = computed(() =>
  stravaActivities.value.find(a => String(a.id) === String(completionData.value.stravaActivityId)) || null
);
const stravaPreview = computed(() => {
  const a = selectedStravaActivity.value;
  if (!a) return null;
  return {
    distance: a.distance ? (a.distance / 1000).toFixed(2) : '0.00',
    duration: a.moving_time ? Math.round(a.moving_time / 60) : 0,
  };
});

const modalTitle = computed(() => {
  if (modalMode.value === 'edit') return 'Edit workout';
  if (modalMode.value === 'complete') return 'Complete workout';
  return 'Workout details';
});

const isStravaLoading = ref(false);

async function loadStravaActivities() {
    if (isStravaLoading.value) return;
    isStravaLoading.value = true;
    try {
        // Imported FIT/GPX activities merged with Strava (when still connected)
        const activities = await activityApi.getAllActivities();

        if (activities && Array.isArray(activities)) {
            stravaActivities.value = activities;
            setActivities(activities); // a newly imported file can change VDOT
            const workoutType = selectedWorkout.value ? getWorkoutType(selectedWorkout.value) : null;
            const filtered = activities.filter((act: any) => {
                const st = (act.sport_type || act.type || '').toLowerCase();
                if (workoutType === 'running') return st === 'run';
                if (workoutType === 'bike') return st === 'ride' || st === 'virtualride' || st === 'ebikeride';
                return true;
            });
            stravaActivityOptions.value = filtered.map((act: any) => {
                let dateStr = 'unknown date';
                try {
                    if (act.start_date_local) {
                        dateStr = format(parseISO(act.start_date_local), 'dd/MM/yy');
                    }
                } catch (e) {
                    console.error('Date parsing error:', e);
                }
                const distKm = act.distance ? (act.distance / 1000).toFixed(2) : '0.00';
                return {
                    label: `${act.name || 'Unnamed activity'} · ${dateStr} · ${distKm} km`,
                    value: act.id,
                };
            });
        } else {
            stravaActivityOptions.value = [];
        }
    } catch (error) {
        console.error('Dashboard: Failed to load Strava activities:', error);
        stravaActivityOptions.value = [];
    } finally {
        isStravaLoading.value = false;
    }
}

// Import a FIT/GPX/TCX file from inside the completion dialog and link it
// straight to the workout being completed.
const fitInput = ref<HTMLInputElement | null>(null);
const isFitImporting = ref(false);

async function onCompletionFitPicked(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (fitInput.value) fitInput.value.value = '';
  if (!file) return;
  isFitImporting.value = true;
  try {
    const activity = await parseActivityFile(file);
    const res = await db.addImportedActivity(activity);
    await loadStravaActivities();

    let linkId: number | undefined = res.duplicate ? undefined : res.id;
    if (res.duplicate) {
      // Already imported earlier: find the existing copy and link that one.
      const t = new Date(activity.start_date).getTime();
      const match = stravaActivities.value.find((a: any) => {
        const ta = new Date(a.start_date || a.start_date_local).getTime();
        return Math.abs(ta - t) < 120000 && Math.abs((a.distance || 0) - activity.distance) < 200;
      });
      linkId = match?.id;
    }

    if (linkId !== undefined) {
      completionData.value.stravaActivityId = linkId as any;
      message.success(res.duplicate
        ? 'Activity was already imported — linked the existing one.'
        : 'Activity imported and linked to this workout.');
    } else {
      message.warning('File imported, but it could not be matched automatically — pick it from the list.');
    }
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.startsWith('MISSING_TABLE')) {
      message.error('Database table missing — run supabase_imported_activities.sql in the Supabase SQL editor once.', { duration: 10000 });
    } else {
      message.error('Import failed: ' + msg);
    }
  } finally {
    isFitImporting.value = false;
  }
}

function goToDetails() {
  if (!selectedWorkout.value?.id) return;
  const id = selectedWorkout.value.id;
  showDetailsModal.value = false;
  router.push(`/workout/${id}`);
}

function openDetailsModal(workout: Workout) {
  selectedWorkout.value = { ...workout };
  modalMode.value = 'view';
  completionData.value = {
    notes: workout.notes || '',
    totalWeightLifted: workout.totalWeightLifted || 0,
    distance: workout.distance || 0,
    stravaActivityId: undefined,
  };

  const type = getWorkoutType(workout);
  if (type === 'running' || type === 'bike') {
    loadStravaActivities();
  }

  showDetailsModal.value = true;
}

async function handleUpdateWorkout() {
  if (!selectedWorkout.value) return;
  isActionLoading.value = true;
  try {
    await db.updateWorkout(selectedWorkout.value);
    showDetailsModal.value = false;
    await loadWorkouts();
  } finally {
    isActionLoading.value = false;
  }
}

async function handleDeleteWorkout() {
  if (!selectedWorkout.value || selectedWorkout.value.id === undefined) return;
  if (confirm(`Delete "${selectedWorkout.value.name}"? This can't be undone.`)) {
    isActionLoading.value = true;
    try {
      await db.deleteWorkout(selectedWorkout.value.id);
      showDetailsModal.value = false;
      await loadWorkouts();
    } finally {
      isActionLoading.value = false;
    }
  }
}

async function handleSaveCompletion() {
  if (!selectedWorkout.value || selectedWorkout.value.id === undefined) return;
  isActionLoading.value = true;
  try {
    const payload: any = {
      id: selectedWorkout.value.id,
      isCompleted: 1,
      ...completionData.value
    };

    // For Strava-linked runs/rides, the activity is the source of truth:
    // pull actual distance (km) and moving time (min) straight from Strava.
    if (payload.stravaActivityId) {
      payload.stravaActivityId = String(payload.stravaActivityId);
      const act = selectedStravaActivity.value;
      if (act) {
        if (act.distance) payload.distance = Math.round((act.distance / 1000) * 100) / 100;
        if (act.moving_time) payload.actualDuration = Math.round(act.moving_time / 60);
      }
    }

    await db.completeWorkout(payload);
    showDetailsModal.value = false;
    await loadWorkouts();
  } finally {
    isActionLoading.value = false;
  }
}
// == DETAILS/EDIT/COMPLETE MODAL LOGIC END ==


// == ADD/LOG MODAL LOGIC START ==
const showAddWorkoutModal = ref(false);
const showLogWeightModal = ref(false);

const newWorkout = ref<AddWorkoutPayload>({
  name: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'Running',
});

const newWeight = ref({
  weight: 70,
  date: format(new Date(), 'yyyy-MM-dd'),
});

function openAddWorkoutModal(date: Date | null) {
  newWorkout.value.date = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  showAddWorkoutModal.value = true;
}

async function saveNewWorkout() {
  if (!newWorkout.value.name) return;
  isActionLoading.value = true;
  try {
    await db.addWorkout(newWorkout.value);
    showAddWorkoutModal.value = false;
    await loadWorkouts();
    newWorkout.value.name = '';
  } finally {
    isActionLoading.value = false;
  }
}

async function saveNewWeight() {
  if (!newWeight.value.weight) {
    message.warning('PLEASE_ENTER_VALID_MASS_VALUE');
    return;
  }
  isActionLoading.value = true;
  try {
    await db.addDailyWeight({
      date: newWeight.value.date,
      weight: Number(newWeight.value.weight)
    });
    message.success('BIOMETRIC_DATA_COMMITTED');
    showLogWeightModal.value = false;
    await loadDailyWeights();
    // Reset date after successful save
    newWeight.value.date = format(new Date(), 'yyyy-MM-dd');
  } catch (error) {
    console.error('Failed to save weight:', error);
    message.error('WRITE_ERROR_CHECK_SYSTEM_LOGS');
  } finally {
    isActionLoading.value = false;
  }
}
// == ADD/LOG MODAL LOGIC END ==

// ... rest of file (loadWorkouts, loadDailyWeights)

// == CALENDAR LOGIC START ==
const currentMonth = ref(new Date());
const formattedCurrentMonth = computed(() => format(currentMonth.value, 'MMMM yyyy', { locale: enUS }));
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const days = computed(() => {
  const monthStart = startOfMonth(currentMonth.value);
  const monthEnd = endOfMonth(currentMonth.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  return dateRange.map(date => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
    date,
    dayOfMonth: getDate(date),
    isCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
    isToday: formattedDate === today,
    workouts: workoutsByDate.value[formattedDate] || [],
    dailyWeights: dailyWeightsByDate.value[formattedDate] || [],
    raceGoals: raceGoalsByDate.value[formattedDate] || [],
    };  });
});

function previousMonth() { currentMonth.value = subMonths(currentMonth.value, 1); }
function nextMonth() { currentMonth.value = addMonths(currentMonth.value, 1); }

// -- Week view: full session detail for a single week --
const viewMode = ref<'month' | 'week'>('month');
const currentWeek = ref(new Date());

function setWeekView() {
  // Jump to the week around whatever month is being viewed (or today if it's that month).
  const today = new Date();
  const inViewedMonth = today.getMonth() === currentMonth.value.getMonth()
    && today.getFullYear() === currentMonth.value.getFullYear();
  currentWeek.value = inViewedMonth ? today : startOfMonth(currentMonth.value);
  viewMode.value = 'week';
}

function goPrev() {
  if (viewMode.value === 'week') currentWeek.value = subWeeks(currentWeek.value, 1);
  else previousMonth();
}
function goNext() {
  if (viewMode.value === 'week') currentWeek.value = addWeeks(currentWeek.value, 1);
  else nextMonth();
}

const weekRangeLabel = computed(() => {
  const start = startOfWeek(currentWeek.value, { weekStartsOn: 1 });
  const end = endOfWeek(currentWeek.value, { weekStartsOn: 1 });
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`
    : `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
});

const weekDetailed = computed(() => {
  const start = startOfWeek(currentWeek.value, { weekStartsOn: 1 });
  const end = endOfWeek(currentWeek.value, { weekStartsOn: 1 });
  const today = format(new Date(), 'yyyy-MM-dd');
  return eachDayOfInterval({ start, end }).map(date => {
    const key = format(date, 'yyyy-MM-dd');
    return {
      key,
      date,
      dow: format(date, 'EEEE'),
      dayNum: format(date, 'd MMM'),
      isToday: key === today,
      workouts: workoutsByDate.value[key] || [],
      raceGoals: raceGoalsByDate.value[key] || [],
    };
  });
});
// == CALENDAR LOGIC END ==


// == EXISTING DATA LOGIC ==
const workouts = ref<Workout[]>([]);
const dailyWeights = ref<DailyWeight[]>([]);
const raceGoals = ref<RaceGoal[]>([]);

/**
 * Where a workout has a recording behind it, the FIT file's sport wins over the
 * hand-entered `type` column. Replaces a local copy of getWorkoutType that had
 * drifted from the shared one in utils/workouts.ts.
 */
const activityIndex = computed(() => buildActivityIndex(stravaActivities.value));
const getWorkoutType = (workout: Workout): SportType =>
	effectiveWorkoutType(workout, activityIndex.value);

const getWorkoutClass = (workout: Workout) => {
  const type = getWorkoutType(workout).toLowerCase();
  const completed = workout.isCompleted === 1 ? 'completed' : 'pending';
  return `workout-${type} status-${completed}`;
};

// -- Runna-style card helpers --
const TYPE_ICONS: Record<string, any> = {
  running: WalkOutline, gym: BarbellOutline, bike: BicycleOutline, rest: BedOutline, other: FitnessOutline,
};
const TYPE_LABELS: Record<string, string> = {
  running: 'Run', gym: 'Strength', bike: 'Bike', rest: 'Rest day', other: 'Workout',
};
const workoutIcon = (w: Workout) => TYPE_ICONS[getWorkoutType(w)] || FitnessOutline;
const workoutTypeLabel = (w: Workout) => TYPE_LABELS[getWorkoutType(w)] || 'Workout';

const formatLongDate = (date: string) => {
  try { return format(parseISO(date), 'EEE d MMM'); } catch { return date; }
};

// Compact subtitle for calendar chips (like Runna's plan cards).
const workoutMeta = (w: Workout): string => {
  const t = getWorkoutType(w);
  const parts: string[] = [];
  if (t === 'gym') { if (w.gymType) parts.push(w.gymType); }
  else if (t === 'rest') { /* no meta */ }
  else { // running / bike
    if (w.distance) parts.push(`${w.distance} km`);
    else if (w.duration) parts.push(`${w.duration} min`);
    const p = paceParts(w);
    if (p) parts.push(p.zone);
  }
  return parts.join(' · ');
};

const hasStats = (w: Workout) => !!(w.distance || w.duration || w.targetPace || w.gymType);

/**
 * Memoised so the template can call derivedPace() per session without
 * recomputing a pace table for every chip on every render.
 */
/**
 * Paces are derived, not stored: change a goal or get fitter and the schedule
 * re-renders. Memoised so the template can call sessionPaceFor() per pill.
 */
const paceSources = computed(() => ({
  currentVdot: currentVdot.value,
  goalFor: (date: string) => {
    const t = targetForDate(date);
    return t ? { vdot: t.neededVdot, distanceM: t.distanceM, name: t.name, terrain: t.terrainFactor } : null;
  },
}));

const sessionPaces = computed(() => {
  const out = new Map<number, SessionPace>();
  for (const w of workouts.value) {
    const p = sessionPace(w, paceSources.value);
    if (p) out.set(w.id, p);
  }
  return out;
});

const sessionPaceFor = (w: Workout) => sessionPaces.value.get(w.id) ?? null;

const workoutsByDate = computed(() => {
	const grouped = {} as { [key: string]: Workout[] }
	for (const workout of workouts.value) {
		if (!grouped[workout.date]) grouped[workout.date] = []
		grouped[workout.date].push(workout)
	}
	return grouped
})

const dailyWeightsByDate = computed(() => {
	const grouped = {} as { [key: string]: DailyWeight[] }
	for (const dailyWeight of dailyWeights.value) {
		if (!grouped[dailyWeight.date]) grouped[dailyWeight.date] = []
		grouped[dailyWeight.date].push(dailyWeight)
	}
	return grouped
})

const raceGoalsByDate = computed(() => {
	const grouped = {} as { [key: string]: RaceGoal[] }
	for (const goal of raceGoals.value) {
		if (!grouped[goal.date]) grouped[goal.date] = []
		grouped[goal.date].push(goal)
	}
	return grouped
})

async function loadRaceGoals() {
  try {
    raceGoals.value = await db.getRaceGoals();
  } catch (error) {
    console.error('Failed to fetch race goals:', error);
  }
}

async function loadWorkouts() {
  workouts.value = await db.getWorkouts();
  // A completed run is a VDOT sample. Keep the fitness store in step so paces,
  // projections and goal verdicts re-derive the moment a session is logged.
  setWorkouts(workouts.value);
}
async function loadDailyWeights() { dailyWeights.value = await db.getDailyWeights(); }

/** Bulk import adds activities (and optionally workouts): re-read both. */
async function onActivitiesImported() {
  await Promise.all([loadWorkouts(), refreshFitness()]);
}

// Pace advice needs the active goal (settings) and current fitness. The activity
// list is needed up front too: it's what corrects each workout's sport.
const loadAll = () => {
  loadWorkouts(); loadDailyWeights(); loadRaceGoals();
  hydrateSettings(); hydrateFitness();
  activityApi.getAllActivities()
    .then(a => { stravaActivities.value = a; })
    .catch(() => { /* no recordings — workouts keep their declared type */ });
};
onMounted(loadAll);
onActivated(loadAll);

</script>


<style scoped>
/* min-height, not height: a fixed 100% clamps to the scroll container's padded
   content box, so the calendar overflowed past the padding that clears the nav. */
.dashboard-view-wrapper { min-height: 100%; }
.dashboard-view { padding: 24px 28px 40px; max-width: 1100px; margin: 0 auto; width: 100%; box-sizing: border-box; color: var(--text-color); }
@media (max-width: 768px) { .dashboard-view { padding: 16px 16px 32px; } }

.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.page-head h1 { font-size: 1.5rem; font-weight: 700; }
.sub { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; }

.actions-bar { display: flex; gap: 10px; flex-wrap: wrap; }
@media (max-width: 600px) { .actions-bar { width: 100%; } .action-button { flex: 1; justify-content: center; } }

.action-button {
  background: var(--surface-2);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 9px 15px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-family);
  font-size: 0.85rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: background 0.15s, border-color 0.15s;
}
.action-button:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--border-strong); }
.action-button .n-icon { font-size: 1.1rem; }
.action-button.primary { background: var(--primary-color); border-color: var(--primary-color); color: #fff; }
.action-button.primary:hover:not(:disabled) { background: var(--primary-strong); border-color: var(--primary-strong); }

.calendar-container { border: 1px solid var(--border-color); background: var(--surface-color); border-radius: var(--radius); overflow: hidden; }
.calendar-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border-color); }
.nav-button { background: var(--surface-2); border: 1px solid var(--border-color); color: var(--text-secondary); width: 34px; height: 34px; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: background 0.15s, color 0.15s; }
.nav-button:hover { background: var(--surface-hover); color: var(--text-color); }
.month-display { font-weight: 600; font-size: 1.1rem; color: var(--text-color); }

.view-toggle { margin-left: auto; display: inline-flex; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 2px; gap: 2px; }
.view-toggle button { background: none; border: none; color: var(--text-secondary); font-family: var(--font-family); font-size: 0.8rem; font-weight: 500; padding: 5px 12px; border-radius: calc(var(--radius-sm) - 2px); cursor: pointer; transition: background 0.15s, color 0.15s; }
.view-toggle button:hover { color: var(--text-color); }
.view-toggle button.active { background: var(--primary-color); color: #fff; }

/* Week view — full session detail */
.week-view { display: flex; flex-direction: column; }
.wv-day { padding: 14px 16px; border-top: 1px solid var(--border-color); }
.wv-day:first-child { border-top: none; }
.wv-today { background: var(--primary-soft); }
.wv-dayhead { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.wv-dow { font-weight: 700; font-size: 0.92rem; color: var(--text-color); }
.wv-today .wv-dow { color: var(--primary-color); }
.wv-datenum { font-size: 0.8rem; color: var(--text-muted); }
.wv-race { display: inline-flex; align-items: center; gap: 4px; font-size: 0.74rem; font-weight: 600; color: var(--danger-color); background: var(--danger-soft); padding: 2px 8px; border-radius: 999px; }
.wv-add { margin-left: auto; width: 26px; height: 26px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--surface-2); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s, color 0.15s; }
.wv-day:hover .wv-add { opacity: 1; }
.wv-add:hover { color: var(--primary-color); border-color: var(--primary-color); }
.wv-restday { margin: 0; font-size: 0.82rem; color: var(--text-muted); font-style: italic; }
.wv-sessions { display: flex; flex-direction: column; gap: 10px; }
.wv-card { display: flex; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color); border-left: 3px solid var(--tag-color); border-radius: var(--radius-sm); background: var(--surface-color); cursor: pointer; transition: background 0.15s, box-shadow 0.15s; }
.wv-card:hover { background: var(--surface-2); box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.wv-card.status-completed { background: color-mix(in srgb, var(--tag-color) 8%, transparent); }
.wv-badge { width: 34px; height: 34px; border-radius: 9px; background: var(--tag-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
.wv-body { flex: 1; min-width: 0; }
.wv-cardtop { display: flex; align-items: center; gap: 6px; }
.wv-name { font-weight: 600; font-size: 0.95rem; color: var(--text-color); }
.wv-done { color: var(--tag-color); font-size: 1.05rem; display: flex; }
.wv-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.wv-pill { font-size: 0.74rem; font-weight: 500; color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--border-color); padding: 2px 9px; border-radius: 999px; }
.wv-pill-pace { color: var(--tag-color); border-color: color-mix(in srgb, var(--tag-color) 40%, transparent); background: color-mix(in srgb, var(--tag-color) 10%, transparent); font-family: var(--font-mono); }
/* Race-pace sessions track the goal (blue); everything else tracks current
   fitness (sport colour). Legacy rows with no recognisable zone stay muted. */
.wv-pill-pace.basis-goal { color: var(--primary-color); border-color: color-mix(in srgb, var(--primary-color) 40%, transparent); background: var(--primary-soft); }
.wv-pill-pace.basis-planned { color: var(--text-muted); border-color: var(--border-color); background: transparent; font-family: inherit; }
.wv-pill-pace { cursor: help; }
.wv-steps { margin: 9px 0 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.wv-steps li { position: relative; padding-left: 16px; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; }
.wv-steps li::before { content: ''; position: absolute; left: 3px; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--tag-color); }

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.days-header { border-bottom: 1px solid var(--border-color); }
.day-cell.header { min-height: auto; text-align: center; font-weight: 600; padding: 10px 4px; cursor: default; color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }

.day-cell {
  min-height: 112px;
  border-right: 1px solid var(--border-color);
  border-top: 1px solid var(--border-color);
  padding: 6px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}
.day-cell:hover { background: var(--surface-2); }
.day-cell.not-current-month { opacity: 0.4; }
.day-number { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.day-cell.is-today { background: var(--primary-soft); }
.is-today .day-number { color: var(--primary-color); font-weight: 700; }
.day-cell.drag-over { background: var(--primary-soft); box-shadow: inset 0 0 0 2px var(--primary-color); }

.events { display: flex; flex-direction: column; gap: 4px; }
.event-tag {
  font-size: 0.7rem; padding: 4px 7px; border-radius: 5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: flex; align-items: center; gap: 5px; position: relative;
  transition: transform 0.1s, opacity 0.1s;
}
.event-tag .n-icon { font-size: 0.85rem; flex-shrink: 0; }
.event-name { overflow: hidden; text-overflow: ellipsis; }
.workout-tag { padding-left: 11px; background: var(--surface-2); color: var(--text-color); cursor: grab; }
.workout-banner { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 5px 0 0 5px; background: var(--tag-color, var(--text-muted)); }
.event-tag.dragging { opacity: 0.4; transform: scale(0.96); cursor: grabbing; }
.done-check { color: var(--tag-color); }

.workout-gym { --tag-color: var(--color-gym-primary); }
.workout-running { --tag-color: var(--color-running-primary); }
.workout-bike { --tag-color: var(--color-bike-primary); }
.workout-rest { --tag-color: var(--color-rest-primary); }
.workout-other { --tag-color: var(--color-other-primary); }

.status-completed { background: color-mix(in srgb, var(--tag-color) 18%, transparent); }
.status-completed .event-name { font-weight: 600; }

.weight-tag { background: var(--success-soft); color: var(--success-color); }
.race-goal-tag { background: var(--danger-soft); color: var(--danger-color); font-weight: 600; }

@media (max-width: 768px) {
  .calendar-grid { grid-template-columns: 1fr; }
  .days-header { display: none; }
  .day-cell { min-height: auto; border-right: none; flex-direction: row; align-items: flex-start; gap: 12px; padding: 12px 10px; }
  .day-cell.not-current-month { display: none; }
  .day-number { width: 28px; flex-shrink: 0; }
  .events { width: 100%; }
}

/* Forms */
.form-container { display: flex; flex-direction: column; gap: 16px; padding: 6px 0; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
label { font-weight: 500; color: var(--text-secondary); font-size: 0.8rem; }
input, select, textarea {
  background: var(--surface-2);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  font-family: var(--font-family);
  padding: 10px 12px;
  font-size: 16px;
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
@media (min-width: 769px) { input, select, textarea { font-size: 0.88rem; } }
input:focus, select:focus, textarea:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-soft); }
textarea { min-height: 70px; resize: vertical; }

.strava-preview {
  display: flex; align-items: center; gap: 16px;
  background: var(--surface-2); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); padding: 10px 14px; margin-top: -4px;
}
.sp-item { font-size: 0.9rem; color: var(--text-color); }
.sp-num { font-family: var(--font-mono); font-weight: 700; font-size: 1.05rem; }
.sp-note { margin-left: auto; font-size: 0.72rem; color: #fc5100; font-weight: 600; }

.fit-import-row { display: flex; align-items: center; gap: 10px; margin-top: -4px; }
.fit-import-hint { font-size: 0.74rem; color: var(--text-muted); }

.save-button { margin-top: 6px; align-self: flex-end; }
@media (max-width: 600px) { .save-button { width: 100%; justify-content: center; } }

/* Details view */
.detail-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 14px; }
.detail-list { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.detail-list > div { display: flex; justify-content: space-between; gap: 12px; font-size: 0.88rem; }
.detail-list dt { color: var(--text-secondary); margin: 0; }
.detail-list dd { margin: 0; color: var(--text-color); font-weight: 500; }
.detail-completed { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px; }
.status-pill { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; background: var(--success-soft); color: var(--success-color); padding: 5px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.detail-notes { margin-top: 14px; color: var(--text-secondary); font-size: 0.88rem; background: var(--surface-2); padding: 10px 12px; border-radius: var(--radius-sm); }

/* Runna-style calendar chip subtitle */
.workout-tag { align-items: stretch; padding-top: 5px; padding-bottom: 5px; }
.wt-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.wt-title { display: flex; align-items: center; gap: 4px; min-width: 0; }
.wt-title .event-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.wt-ico { color: var(--tag-color); font-size: 0.82rem; flex-shrink: 0; }
.wt-meta { font-size: 0.63rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: 0.01em; }

/* Runna-style workout card (details view) */
.rn-card { border: 1px solid var(--border-color); border-radius: var(--radius); overflow: hidden; background: var(--surface-color); }
.rn-head { display: flex; align-items: center; gap: 12px; padding: 15px 16px; background: color-mix(in srgb, var(--tag-color) 12%, transparent); border-bottom: 1px solid var(--border-color); }
.rn-badge { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--tag-color); color: #fff; font-size: 1.3rem; flex-shrink: 0; }
.rn-headtext { flex: 1; min-width: 0; }
.rn-title { font-size: 1.15rem; font-weight: 700; margin: 0; line-height: 1.25; }
.rn-sub { font-size: 0.78rem; color: var(--text-secondary); }
.rn-done { color: var(--tag-color); font-size: 1.45rem; display: flex; flex-shrink: 0; }
.rn-stats { display: flex; flex-wrap: wrap; gap: 10px; padding: 14px 16px; }
.rn-stat { flex: 1; min-width: 86px; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
.rn-val { display: flex; align-items: baseline; gap: 2px; }
.rn-num { font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; line-height: 1.05; color: var(--text-color); }
.rn-num-sm { font-size: 1.02rem; }
.rn-unit { font-size: 0.72rem; color: var(--text-muted); font-weight: 500; }
.rn-lbl { font-size: 0.66rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.rn-stat-pace { cursor: help; }
.rn-stat-pace.basis-goal .rn-num { color: var(--primary-color); }
.rn-stat-pace.basis-planned .rn-num { color: var(--text-secondary); font-size: 0.9rem; }
.rn-plan { padding: 2px 16px 16px; }
.rn-plan-h { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; }
.rn-steps { margin: 9px 0 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.rn-steps li { position: relative; padding-left: 18px; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45; }
.rn-steps li::before { content: ''; position: absolute; left: 4px; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: var(--tag-color); }

.modal-actions { margin-top: 22px; display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
@media (max-width: 600px) { .modal-actions { flex-direction: column-reverse; } .modal-actions .action-button { width: 100%; justify-content: center; } }
.delete-button { border-color: var(--danger-soft); color: var(--danger-color); margin-right: auto; }
.delete-button:hover:not(:disabled) { background: var(--danger-color); border-color: var(--danger-color); color: #fff; }

button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
