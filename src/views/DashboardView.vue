<template>
  <div class="dashboard-view-wrapper">
    <div class="dashboard-view">
      <div class="actions-bar">
        <button @click="openAddWorkoutModal(null)" class="action-button">
          <span class="btn-icon">[+]</span> ADD_WORKOUT
        </button>
        <button @click="showLogWeightModal = true" class="action-button">
          <span class="btn-icon">[W]</span> LOG_WEIGHT
        </button>
        <button @click="handleImportSys" class="action-button">
          <span class="btn-icon">[I]</span> IMPORT_SYS
        </button>
      </div>

      <div class="calendar-container glitch-alive">
        <div class="calendar-header">
          <button @click="previousMonth" class="nav-button">&lt;&lt; PREV</button>
          <span class="month-display">{{ formattedCurrentMonth.toUpperCase() }}</span>
          <button @click="nextMonth" class="nav-button">NEXT &gt;&gt;</button>
        </div>
        <div class="calendar-grid days-header">
          <div v-for="day in weekDays" :key="day" class="day-cell header">_{{ day.toUpperCase() }}</div>
        </div>
        <div class="calendar-grid">
          <div v-for="day in days" :key="day.date.toISOString()" 
               class="day-cell" 
               :class="{ 'not-current-month': !day.isCurrentMonth }" 
               @click.stop="openAddWorkoutModal(day.date)"
               @dragover.prevent
               @drop="onDrop($event, day.date)">
            <div class="day-number">{{ day.dayOfMonth }}</div>
            <div class="events">
              <div v-for="goal in day.raceGoals" :key="goal.id" class="event-tag race-goal-tag">
                <span class="prompt">!</span> [RACE] {{ goal.name.toUpperCase() }}
              </div>
              <div v-for="workout in day.workouts" :key="workout.id" 
                   class="event-tag workout-tag" 
                   :class="getWorkoutClass(workout)" 
                   :draggable="workout.isCompleted !== 1"
                   @dragstart="onDragStart($event, workout)"
                   @click.stop="openDetailsModal(workout)">
                <div class="workout-gradient-banner"></div>
                <span class="prompt">></span> {{ workout.name.toUpperCase() }}
              </div>
              <div v-for="weight in day.dailyWeights" :key="weight.id" class="event-tag weight-tag">
                <span class="prompt">@</span> {{ weight.weight }} KG
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add Workout Modal -->
      <CustomModal v-model:show="showAddWorkoutModal" title="[+] NEW_WORKOUT_ENTRY">
        <div class="form-container">
          <div class="form-group">
            <label for="workout-name">_NAME</label>
            <input type="text" id="workout-name" v-model="newWorkout.name" placeholder="ENTER_WORKOUT_NAME" />
          </div>
          <div class="form-group">
            <label for="workout-date">_DATE</label>
            <input type="date" id="workout-date" v-model="newWorkout.date" />
          </div>
          <div class="form-group">
            <label for="workout-type">_TYPE</label>
            <select id="workout-type" v-model="newWorkout.type">
              <option>Running</option>
              <option>Gym</option>
              <option>Bike</option>
              <option>Rest</option>
              <option>Other</option>
            </select>
          </div>
          <button @click="saveNewWorkout" class="action-button save-button" :disabled="isActionLoading">
            <span v-if="!isActionLoading"><span class="btn-icon">[S]</span> SAVE_ENTRY</span>
            <span v-else class="ascii-spinner">SAVING</span>
          </button>
        </div>
      </CustomModal>

      <!-- Log Weight Modal -->
      <CustomModal v-model:show="showLogWeightModal" title="[W] LOG_BIOMETRICS">
        <div class="form-container">
          <div class="form-group">
            <label for="weight-amount">_MASS_KG</label>
            <input type="number" id="weight-amount" v-model="newWeight.weight" />
          </div>
          <div class="form-group">
            <label for="weight-date">_DATE</label>
            <input type="date" id="weight-date" v-model="newWeight.date" />
          </div>
          <button @click="saveNewWeight" class="action-button save-button" :disabled="isActionLoading">
            <span v-if="!isActionLoading"><span class="btn-icon">[S]</span> SAVE_WEIGHT</span>
            <span v-else class="ascii-spinner">LOGGING</span>
          </button>
        </div>
      </CustomModal>

      <!-- Details/Edit/Complete Workout Modal -->
      <CustomModal v-if="selectedWorkout" v-model:show="showDetailsModal" :title="'[?] ' + modalTitle.toUpperCase()">
        <!-- View Mode -->
        <div v-if="modalMode === 'view'" class="details-view">
          <h2 class="terminal-h2"><span class="prompt">></span> {{ selectedWorkout.name.toUpperCase() }}</h2>
          <p>_DATE: {{ selectedWorkout.date }}</p>
          <p>_TYPE: {{ selectedWorkout.type?.toUpperCase() || 'N/A' }}</p>
          <p v-if="selectedWorkout.duration">_PLANNED_DUR: {{ selectedWorkout.duration }} MIN</p>
          <p v-if="selectedWorkout.distance">_PLANNED_DIST: {{ selectedWorkout.distance }} KM</p>
          
          <div v-if="selectedWorkout.isCompleted">
            <div class="terminal-divider">--------------------------------</div>
            <p>_STATUS: [COMPLETED]</p>
            <p v-if="selectedWorkout.actualDuration">_ACTUAL_DUR: {{ selectedWorkout.actualDuration }} MIN</p>
            <p v-if="selectedWorkout.totalWeightLifted">_LOAD_MASS: {{ selectedWorkout.totalWeightLifted }} KG</p>
            <p v-if="selectedWorkout.rpe">_RPE_INDEX: {{ selectedWorkout.rpe }}/10</p>
          </div>

          <p v-if="selectedWorkout.notes">_LOG_NOTES: {{ selectedWorkout.notes }}</p>
          
          <div class="modal-actions">
            <button @click="handleDeleteWorkout" class="action-button delete-button" :disabled="isActionLoading">
              <span v-if="!isActionLoading"><span class="btn-icon">[X]</span> DELETE</span>
              <span v-else class="ascii-spinner">DELETING</span>
            </button>
            <button @click="modalMode = 'edit'" class="action-button">
              <span class="btn-icon">[E]</span> EDIT
            </button>
            <button v-if="!selectedWorkout.isCompleted" @click="modalMode = 'complete'" class="action-button save-button">
              <span class="btn-icon">[√]</span> COMPLETE
            </button>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else-if="modalMode === 'edit'" class="form-container">
          <div class="form-group">
            <label>_NAME</label>
            <input type="text" v-model="selectedWorkout.name" />
          </div>
          <div class="form-group">
            <label>_DATE</label>
            <input type="date" v-model="selectedWorkout.date" />
          </div>
          <div class="form-group">
            <label>_TYPE</label>
            <select v-model="selectedWorkout.type">
              <option>Running</option>
              <option>Gym</option>
              <option>Bike</option>
              <option>Rest</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>_PLANNED_DUR</label>
            <input type="number" v-model="selectedWorkout.duration" />
          </div>
          <div class="form-group">
            <label>_PLANNED_DIST</label>
            <input type="number" v-model="selectedWorkout.distance" />
          </div>
          <div class="form-group">
            <label>_NOTES</label>
            <textarea v-model="selectedWorkout.notes"></textarea>
          </div>

          <div class="modal-actions">
            <button @click="modalMode = 'view'" class="action-button">
              <span class="btn-icon">[C]</span> CANCEL
            </button>
            <button @click="handleUpdateWorkout" class="action-button save-button" :disabled="isActionLoading">
              <span v-if="!isActionLoading"><span class="btn-icon">[S]</span> UPDATE_SYS</span>
              <span v-else class="ascii-spinner">SYNCING</span>
            </button>
          </div>
        </div>

        <!-- Complete Mode -->
        <div v-else-if="modalMode === 'complete'" class="form-container">
          <div class="form-group">
            <label>_ACTUAL_DUR_MIN</label>
            <input type="number" v-model="completionData.actualDuration" />
          </div>
          <div class="form-group" v-if="getWorkoutType(selectedWorkout) === 'gym'">
            <label>_LOAD_MASS_KG</label>
            <input type="number" v-model="completionData.totalWeightLifted" />
          </div>
          
          <div class="form-group" v-if="getWorkoutType(selectedWorkout) === 'running'">
            <label for="strava-activity">_STRAVA_LINK</label>
            <select id="strava-activity" v-model="completionData.stravaActivityId" :disabled="isStravaLoading">
              <option :value="undefined">-- {{ isStravaLoading ? 'LOADING_DATA...' : 'NULL' }} --</option>
              <option v-for="activity in stravaActivityOptions" :key="activity.value" :value="activity.value">
                {{ activity.label }}
              </option>
              <option v-if="!isStravaLoading && stravaActivityOptions.length === 0" disabled>
                -- NO_ACTIVITIES_FOUND --
              </option>
            </select>
          </div>

          <div class="form-group" v-if="getWorkoutType(selectedWorkout) === 'running' && !completionData.stravaActivityId">
            <label>_ACTUAL_DIST_KM</label>
            <input type="number" v-model="completionData.distance" />
          </div>
          <div class="form-group">
            <label>_RPE_INDEX</label>
            <input type="number" min="1" max="10" v-model="completionData.rpe" />
          </div>
          <div class="form-group">
            <label>_NOTES</label>
            <textarea v-model="completionData.notes"></textarea>
          </div>

          <div class="modal-actions">
            <button @click="modalMode = 'view'" class="action-button">
              <span class="btn-icon">[C]</span> CANCEL
            </button>
            <button @click="handleSaveCompletion" class="action-button save-button" :disabled="isActionLoading">
              <span v-if="!isActionLoading"><span class="btn-icon">[S]</span> COMMIT_LOG</span>
              <span v-else class="ascii-spinner">WRITING</span>
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
        csv-model-description="name,date(YYYY-MM-DD),type,duration(min),distance(km),notes,isCompleted(0 or 1)"
        @confirm="onImportConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue';
import { useMessage } from 'naive-ui';
import { db } from '@/db';
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
import type { Workout, AddWorkoutPayload, DailyWeight, CompleteWorkoutFormValues, RaceGoal } from '../types';
import CustomModal from '../components/CustomModal.vue';
import ImportEditor from '../components/ImportEditor.vue';
import { stravaApi } from '../stravaBridge';

const isActionLoading = ref(false);
const message = useMessage();

// == DRAG AND DROP LOGIC START ==
function onDragStart(event: DragEvent, workout: Workout) {
  if (workout.isCompleted === 1) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.setData('workoutId', String(workout.id));
    event.dataTransfer.effectAllowed = 'move';
    
    // Add a ghost image or styling if desired
    const target = event.target as HTMLElement;
    target.style.opacity = '0.5';
    
    event.dataTransfer.setDragImage(target, 0, 0);
  }
}

async function onDrop(event: DragEvent, date: Date) {
  const workoutId = event.dataTransfer?.getData('workoutId');
  
  // Reset opacity for all workout tags (cleanup)
  document.querySelectorAll('.workout-tag').forEach((el: any) => {
    el.style.opacity = '1';
  });

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

async function handleImportSys() {
  if (!(window as any).ipcRenderer) {
    message.error('IMPORT_ONLY_AVAILABLE_IN_DESKTOP_APP');
    return;
  }

  try {
    const { canceled, filePaths } = await (window as any).ipcRenderer.invoke('open-file-dialog');
    if (canceled || filePaths.length === 0) return;

    const result = await (window as any).ipcRenderer.invoke('read-file', filePaths[0]);
    if (result.success) {
      importRawContent.value = result.content;
      showImportEditor.value = true;
    } else {
      message.error('FAILED_TO_READ_FILE: ' + result.error);
    }
  } catch (error) {
    console.error('Import error:', error);
    message.error('SYSTEM_ERROR_DURING_IMPORT');
  }
}

async function onImportConfirm(data: any[]) {
  isActionLoading.value = true;
  try {
    let successCount = 0;
    for (const row of data) {
      const workout: any = {
        name: row.name,
        date: row.date,
        type: row.type || 'Other',
        duration: row.duration ? Number(row.duration) : null,
        distance: row.distance ? Number(row.distance) : null,
        notes: row.notes || '',
        isCompleted: row.isCompleted ? Number(row.isCompleted) : 0,
        isDeleted: 0
      };
      await db.addWorkout(workout);
      successCount++;
    }
    message.success(`SUCCESSFULLY_IMPORTED_${successCount}_WORKOUTS`);
    await loadWorkouts();
  } catch (error) {
    console.error('Import confirmation error:', error);
    message.error('PARTIAL_IMPORT_ERROR_CHECK_DATABASE');
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

const modalTitle = computed(() => {
  if (modalMode.value === 'edit') return 'EDIT_WORKOUT';
  if (modalMode.value === 'complete') return 'MARK_COMPLETED';
  return 'WORKOUT_INFO';
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
            stravaActivityOptions.value = activities.map((act: any) => {
                let dateStr = 'UNKNOWN_DATE';
                try {
                    if (act.start_date_local) {
                        dateStr = format(parseISO(act.start_date_local), 'dd/MM/yy');
                    }
                } catch (e) {
                    console.error('Date parsing error:', e);
                }
                const distKm = act.distance ? (act.distance / 1000).toFixed(2) : '0.00';
                return {
                    label: `${(act.name || 'UNNAMED_RUN').toUpperCase()} - ${dateStr} [${distKm}KM]`,
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

function openDetailsModal(workout: Workout) {
  selectedWorkout.value = { ...workout };
  modalMode.value = 'view';
  completionData.value = {
    actualDuration: workout.duration || 0,
    rpe: 5,
    notes: workout.notes || '',
    totalWeightLifted: workout.totalWeightLifted || 0,
    distance: workout.distance || 0,
    stravaActivityId: undefined,
  };

  if (getWorkoutType(workout) === 'running') {
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
  if (confirm(`ARE_YOU_SURE_YOU_WANT_TO_PURGE_ENTRY: "${selectedWorkout.value.name.toUpperCase()}"?`)) {
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

    if (payload.stravaActivityId) {
      payload.stravaActivityId = String(payload.stravaActivityId);
      delete payload.distance;
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
    return {
    date,
    dayOfMonth: getDate(date),
    isCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
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
.dashboard-view-wrapper {
  height: 100%;
}

.dashboard-view {
  padding: 16px;
  color: var(--text-color);
  font-family: var(--font-family);
}

.actions-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .actions-bar {
    flex-direction: column;
    gap: 8px;
  }
  .action-button {
    width: 100%;
    justify-content: center;
  }
}

.action-button {
  background: #050505;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 10px 16px;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: 0.8rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.action-button:hover {
  border-color: var(--accent-color);
  background-color: rgba(0, 179, 60, 0.05);
  box-shadow: 0 0 10px var(--glow-color);
}

.btn-icon {
  margin-right: 8px;
  color: var(--accent-color);
  font-weight: bold;
}

.calendar-container {
  border: 1px solid var(--border-color);
  background-color: rgba(6, 8, 6, 0.8);
  box-shadow: 0 0 15px rgba(0, 179, 60, 0.05);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #050505;
  border-bottom: 1px solid var(--border-color);
}

.nav-button {
  background: transparent;
  border: 1px solid var(--border-color);
  color: #008f11;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.7rem;
  font-family: var(--font-family);
}

.nav-button:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.month-display {
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--accent-color);
  letter-spacing: 2px;
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: 1fr;
  }
  .days-header {
    display: none;
  }
  .day-cell {
    min-height: auto !important;
    border-right: none !important;
    border-bottom: 1px solid rgba(0, 179, 60, 0.1);
    padding: 12px 8px !important;
    flex-direction: row !important;
    align-items: flex-start;
    gap: 12px;
  }
  .day-number {
    width: 30px;
    align-self: flex-start !important;
    margin-bottom: 0 !important;
    font-size: 1rem !important;
  }
  .events {
    width: 100%;
  }
}

.days-header {
  border-bottom: 1px solid rgba(0, 179, 60, 0.1);
}

.day-cell {
  min-height: 110px;
  border-right: 1px solid rgba(0, 179, 60, 0.1);
  border-top: 1px solid rgba(0, 179, 60, 0.1);
  padding: 6px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  background-color: rgba(6, 8, 6, 0.2);
}

.day-cell:hover {
  background-color: rgba(0, 179, 60, 0.03);
}

.day-cell:nth-child(7n) {
  border-right: none;
}

.day-cell.header {
  min-height: auto;
  text-align: center;
  font-weight: bold;
  padding: 10px 4px;
  border-top: none;
  cursor: default;
  color: #008f11;
  font-size: 0.75rem;
}

.day-number {
  font-weight: bold;
  margin-bottom: 6px;
  align-self: flex-end;
  font-size: 0.8rem;
  opacity: 0.7;
}

.day-cell.not-current-month {
  display: none; /* Hide days from other months on mobile list view */
}

@media (min-width: 769px) {
  .day-cell.not-current-month {
    display: flex;
  }
}

.day-cell.not-current-month .day-number {
  opacity: 0.2;
}

.events {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-tag {
  padding: 2px 6px;
  font-size: 0.65rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid transparent;
  position: relative;
  padding-left: 12px;
}

.workout-gradient-banner {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-image: linear-gradient(to bottom, var(--gradient-from), var(--gradient-to));
}

.workout-gym .workout-gradient-banner {
  --gradient-from: var(--color-gym-primary);
  --gradient-to: rgba(var(--color-gym-primary-rgb), 0.3);
}

.workout-running .workout-gradient-banner {
  --gradient-from: var(--color-running-primary);
  --gradient-to: rgba(var(--color-running-primary-rgb), 0.3);
}

.workout-bike .workout-gradient-banner {
  --gradient-from: var(--color-bike-primary);
  --gradient-to: rgba(var(--color-bike-primary-rgb), 0.3);
}

.workout-rest .workout-gradient-banner {
  --gradient-from: var(--color-rest-primary);
  --gradient-to: rgba(var(--color-rest-primary-rgb), 0.3);
}

.workout-other .workout-gradient-banner {
  --gradient-from: var(--color-other-primary);
  --gradient-to: rgba(var(--color-other-primary-rgb), 0.3);
}


.prompt {
  color: var(--accent-color);
  margin-right: 4px;
}

.workout-gym { border-color: var(--color-gym-primary); color: var(--color-gym-primary); }
.workout-running { border-color: var(--color-running-primary); color: var(--color-running-primary); }
.workout-bike { border-color: var(--color-bike-primary); color: var(--color-bike-primary); }
.workout-rest { border-color: #757575; color: #757575; }.workout-other { border-color: var(--color-other-primary); color: var(--color-other-primary); }

.status-completed {
  background-color: rgba(0, 179, 60, 0.05);
  font-weight: bold;
}

.status-completed::before {
  content: "[√] ";
  font-size: 0.6rem;
}

.nutrition-tag {
  border-color: rgba(255, 179, 0, 0.3);
  color: #ffb300;
}

.weight-tag {
  border-color: rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.race-goal-tag {
  color: #ff3e3e;
  border: 1px solid rgba(255, 62, 62, 0.4);
  background: rgba(255, 62, 62, 0.05);
  font-weight: bold;
}

/* Form Styling */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-weight: bold;
  color: #008f11;
  font-size: 0.7rem;
  letter-spacing: 1px;
}

input, select, textarea {
  background-color: #050505;
  border: 1px solid var(--border-color);
  color: var(--accent-color);
  font-family: var(--font-family);
  padding: 10px;
  font-size: 16px; /* Prevent zoom on mobile iOS */
  outline: none;
}

@media (min-width: 769px) {
  input, select, textarea {
    font-size: 0.8rem;
  }
}

input:focus, select:focus, textarea:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 5px var(--glow-color);
}

.save-button {
  margin-top: 10px;
  align-self: flex-end;
  background-color: transparent;
  color: var(--accent-color);
  border-color: var(--accent-color);
}

@media (max-width: 768px) {
  .save-button {
    width: 100%;
  }
}

.save-button:hover:not(:disabled) {
  background-color: var(--accent-color);
  color: #050505;
}

.terminal-divider {
  color: var(--border-color);
  margin: 15px 0;
  opacity: 0.5;
}

.terminal-h2 {
  color: var(--accent-color);
  margin-bottom: 15px;
  font-size: 1rem;
}

.modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .modal-actions {
    flex-direction: column;
  }
}

.delete-button {
  border-color: #800000;
  color: #ff4d4d;
}

.delete-button:hover:not(:disabled) {
  background-color: #ff4d4d;
  color: #050505;
  border-color: #ff4d4d;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
