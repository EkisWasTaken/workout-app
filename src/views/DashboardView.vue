<template>
  <div class="dashboard-view-wrapper">
    <div class="dashboard-view">
      <div class="page-head">
        <div>
          <h1>Schedule</h1>
          <p class="sub">Plan, drag to reschedule, and complete your sessions</p>
        </div>
        <div class="actions-bar">
          <button @click="openAddWorkoutModal(null)" class="action-button primary">
            <n-icon :component="AddOutline" /> Add workout
          </button>
          <button @click="showLogWeightModal = true" class="action-button">
            <n-icon :component="BodyOutline" /> Log weight
          </button>
          <button @click="handleImportSys" class="action-button">
            <n-icon :component="CloudUploadOutline" /> Import
          </button>
        </div>
      </div>

      <div class="calendar-container">
        <div class="calendar-header">
          <button @click="previousMonth" class="nav-button" aria-label="Previous month"><n-icon :component="ChevronBackOutline" /></button>
          <span class="month-display">{{ formattedCurrentMonth }}</span>
          <button @click="nextMonth" class="nav-button" aria-label="Next month"><n-icon :component="ChevronForwardOutline" /></button>
        </div>
        <div class="calendar-grid days-header">
          <div v-for="day in weekDays" :key="day" class="day-cell header">{{ day }}</div>
        </div>
        <div class="calendar-grid">
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
                <n-icon v-if="workout.isCompleted === 1" class="done-check" :component="CheckmarkCircle" />
                <span class="event-name">{{ workout.name }}</span>
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
          <h2 class="detail-title">{{ selectedWorkout.name }}</h2>
          <dl class="detail-list">
            <div><dt>Date</dt><dd>{{ selectedWorkout.date }}</dd></div>
            <div><dt>Type</dt><dd>{{ selectedWorkout.type || 'N/A' }}</dd></div>
            <div v-if="selectedWorkout.duration"><dt>Planned duration</dt><dd>{{ selectedWorkout.duration }} min</dd></div>
            <div v-if="selectedWorkout.distance"><dt>Planned distance</dt><dd>{{ selectedWorkout.distance }} km</dd></div>
          </dl>

          <div v-if="selectedWorkout.isCompleted" class="detail-completed">
            <span class="status-pill"><n-icon :component="CheckmarkCircle" /> Completed</span>
            <dl class="detail-list">
              <div v-if="selectedWorkout.actualDuration"><dt>Actual duration</dt><dd>{{ selectedWorkout.actualDuration }} min</dd></div>
              <div v-if="selectedWorkout.totalWeightLifted"><dt>Load lifted</dt><dd>{{ selectedWorkout.totalWeightLifted }} kg</dd></div>
              <div v-if="selectedWorkout.rpe"><dt>RPE</dt><dd>{{ selectedWorkout.rpe }}/10</dd></div>
            </dl>
          </div>

          <p v-if="selectedWorkout.notes" class="detail-notes">{{ selectedWorkout.notes }}</p>

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
          <!-- Running / bike: link Strava as the source of truth -->
          <template v-if="getWorkoutType(selectedWorkout) === 'running' || getWorkoutType(selectedWorkout) === 'bike'">
            <div class="form-group">
              <label for="strava-activity">Strava activity</label>
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

            <div v-if="stravaPreview" class="strava-preview">
              <span class="sp-item"><span class="sp-num">{{ stravaPreview.distance }}</span> km</span>
              <span class="sp-item"><span class="sp-num">{{ stravaPreview.duration }}</span> min</span>
              <span class="sp-note">pulled from Strava</span>
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
  parseISO
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Workout, AddWorkoutPayload, DailyWeight, CompleteWorkoutFormValues, RaceGoal, StravaActivity } from '../types';
import CustomModal from '../components/CustomModal.vue';
import ImportEditor from '../components/ImportEditor.vue';
import { stravaApi } from '../stravaBridge';

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
const stravaActivities = ref<StravaActivity[]>([]);

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
    console.log('Dashboard: loadStravaActivities triggered');
    isStravaLoading.value = true;
    try {
        const isConnected = await stravaApi.isStravaConnected();
        if (!isConnected) {
            console.warn('Dashboard: Strava not connected, skipping fetch');
            stravaActivityOptions.value = [];
            return;
        }
        const activities = await stravaApi.getActivities();
        console.log('Dashboard: Fetched Strava response:', activities);
        
        if (activities && Array.isArray(activities)) {
            stravaActivities.value = activities;
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
        } else if (activities && activities.error === 'API_ERROR') {
            const isRateLimit = activities.details?.errors?.some((e: any) => e.code === 'exceeded' || e.message?.includes('Rate Limit'));
            if (isRateLimit) {
                console.error('Dashboard: Strava Rate Limit Exceeded');
                // We could show a toast here if we had a message provider
            }
            stravaActivityOptions.value = [];
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
// == CALENDAR LOGIC END ==


// == EXISTING DATA LOGIC ==
const workouts = ref<Workout[]>([]);
const dailyWeights = ref<DailyWeight[]>([]);
const raceGoals = ref<RaceGoal[]>([]);

const getWorkoutType = (workout: Workout): 'gym' | 'running' | 'bike' | 'rest' | 'other' => {
	if (workout.type) {
		const typeLower = workout.type.toLowerCase();
		if (typeLower === 'gym') return 'gym';
		if (typeLower === 'running') return 'running';
		if (typeLower === 'bike' || typeLower === 'cycling') return 'bike';
		if (typeLower === 'rest day' || typeLower === 'rest') return 'rest';
	}
	const nameLower = workout.name.toLowerCase();
	if (nameLower.includes('gym') || nameLower.includes('strength')) return 'gym';
	if (nameLower.includes('run') || nameLower.includes('running')) return 'running';
	if (nameLower.includes('bike') || nameLower.includes('cycle') || nameLower.includes('cycling')) return 'bike';
	return 'other';
};

const getWorkoutClass = (workout: Workout) => {
  const type = getWorkoutType(workout).toLowerCase();
  const completed = workout.isCompleted === 1 ? 'completed' : 'pending';
  return `workout-${type} status-${completed}`;
};

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

async function loadWorkouts() { workouts.value = await db.getWorkouts(); }
async function loadDailyWeights() { dailyWeights.value = await db.getDailyWeights(); }

onMounted(() => { loadWorkouts(); loadDailyWeights(); loadRaceGoals(); });
onActivated(() => { loadWorkouts(); loadDailyWeights(); loadRaceGoals(); });

</script>


<style scoped>
.dashboard-view-wrapper { height: 100%; }
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

.modal-actions { margin-top: 22px; display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
@media (max-width: 600px) { .modal-actions { flex-direction: column-reverse; } .modal-actions .action-button { width: 100%; justify-content: center; } }
.delete-button { border-color: var(--danger-soft); color: var(--danger-color); margin-right: auto; }
.delete-button:hover:not(:disabled) { background: var(--danger-color); border-color: var(--danger-color); color: #fff; }

button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
