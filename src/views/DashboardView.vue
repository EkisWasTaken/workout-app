<template>
  <div class="dashboard-view-wrapper">
    <div class="dashboard-view">
      <div class="page-head">
        <div>
          <h1 class="page-title">Schedule</h1>
          <p class="sub">Click a day to add a session, click a session to log it, drag to move it. Run paces update as your fitness changes.</p>
        </div>
        <div class="actions-bar">
          <button @click="openAddWorkoutModal(null)" class="action-button primary">
            <n-icon :component="AddOutline" /> Add session
          </button>
          <button @click="copyLastWeek" class="action-button" :disabled="isActionLoading"
            title="Duplicate last week's sessions onto this week">
            <n-icon :component="CopyOutline" /> Copy last week
          </button>
          <button @click="showLogWeightModal = true" class="action-button">
            <n-icon :component="BodyOutline" /> Log weight
          </button>
          <button @click="showActivityImport = true" class="action-button"
            title="Import .fit, .gpx or .tcx files exported from a watch or Strava">
            <n-icon :component="WatchOutline" /> Import watch files
          </button>
          <button @click="showBuildPlan = true" class="action-button"
            title="Generate a phased training plan from now to a race on your calendar">
            <n-icon :component="TrendingUpOutline" /> Build plan
          </button>
          <button @click="handleImportSys" class="action-button"
            title="Add or update many planned sessions at once from a spreadsheet">
            <n-icon :component="CloudUploadOutline" /> Import plan (CSV)
          </button>
        </div>
      </div>

      <div class="calendar-container">
        <div class="calendar-header">
          <button @click="goPrev" class="nav-button" :aria-label="viewMode === 'week' ? 'Previous week' : 'Previous month'"><n-icon :component="ChevronBackOutline" /></button>
          <span class="month-display">{{ viewMode === 'week' ? weekRangeLabel : formattedCurrentMonth }}</span>
          <button @click="goNext" class="nav-button" :aria-label="viewMode === 'week' ? 'Next week' : 'Next month'"><n-icon :component="ChevronForwardOutline" /></button>
          <!-- One click back to where you are, from anywhere in the calendar. -->
          <button @click="goToToday" class="today-button">Today</button>
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
            <p v-if="day.workouts.length === 0" class="wv-restday">Nothing planned</p>
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
          <div v-for="(day, i) in weekDays" :key="day" class="dh-cell" :class="{ we: i >= 5 }">{{ day }}</div>
        </div>
        <div v-if="viewMode === 'month'" class="calendar-grid cal-body">
          <div v-for="day in days" :key="day.date.toISOString()"
               class="day-cell"
               :class="{
                 'not-current-month': !day.isCurrentMonth,
                 'is-today': day.isToday,
                 'we': day.isWeekend,
                 'drag-over': dragOverDate === format(day.date, 'yyyy-MM-dd')
               }"
               @click.stop="openAddWorkoutModal(day.date)"
               @dragover.prevent
               @dragenter.prevent="onDragEnter(day.date)"
               @dragleave="onDragLeave(day.date)"
               @drop="onDrop($event, day.date)">
            <!-- Fixed-height head so every cell's chips start on one baseline. -->
            <div class="day-head"><span class="day-number">{{ day.dayOfMonth }}</span></div>

            <div class="events">
              <div v-for="goal in day.showRaces" :key="'r' + goal.id" class="chip race" :title="goal.name">
                <n-icon :component="FlagOutline" class="chip-ico" />
                <span class="chip-name">{{ goal.name }}</span>
              </div>

              <div v-for="workout in day.showWorkouts" :key="workout.id"
                   class="chip workout"
                   :class="[getWorkoutClass(workout), {
                     done: workout.isCompleted === 1,
                     dragging: draggingWorkoutId === workout.id,
                   }]"
                   :draggable="workout.isCompleted !== 1"
                   :title="workout.name"
                   @dragstart="onDragStart($event, workout)"
                   @dragend="onDragEnd"
                   @click.stop="openDetailsModal(workout)">
                <n-icon v-if="workout.isCompleted === 1" class="chip-ico done-check" :component="CheckmarkCircle" />
                <n-icon v-else class="chip-ico" :component="workoutIcon(workout)" />
                <span class="chip-name">{{ workout.name }}</span>
                <span v-if="chipMeta(workout)" class="chip-meta">{{ chipMeta(workout) }}</span>
              </div>

              <div v-for="weight in day.showWeights" :key="'w' + weight.id" class="chip weight">
                <n-icon :component="BodyOutline" class="chip-ico" />
                <span class="chip-name">{{ weight.weight }} kg</span>
              </div>

              <button v-if="day.hiddenCount > 0" class="more" @click.stop="openWeekFor(day.date)">
                +{{ day.hiddenCount }} more
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add Workout Modal -->
      <CustomModal v-model:show="showAddWorkoutModal" title="New session">
        <div class="form-container">
          <div v-if="templates.length" class="form-group">
            <label for="workout-template">From template (optional)</label>
            <select id="workout-template" v-model="selectedTemplateId">
              <option :value="null">— None —</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ TEMPLATE_KIND_LABELS[t.kind || 'gym'] }} · {{ t.name }}
              </option>
            </select>
          </div>
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

          <div v-if="newWorkout.type === 'Gym'" class="form-group">
            <label for="workout-split">Split <span class="label-hint">— groups your gym stats, e.g. Push, Pull, Legs</span></label>
            <input id="workout-split" v-model="newWorkout.gymType" list="gym-splits" placeholder="optional" />
          </div>

          <!-- The whole session in one pass — no save-then-edit round trip. -->
          <div class="form-row">
            <div v-if="newWorkoutIsDistance" class="form-group">
              <label for="workout-distance">Distance (km)</label>
              <input type="number" id="workout-distance" v-model="newWorkout.distance" min="0" step="0.5"
                placeholder="optional" />
            </div>
            <div class="form-group">
              <label for="workout-duration">Duration (min)</label>
              <input type="number" id="workout-duration" v-model="newWorkout.duration" min="0"
                placeholder="optional" />
            </div>
          </div>

          <div class="form-group">
            <label for="workout-notes">Notes</label>
            <textarea id="workout-notes" v-model="newWorkout.notes"
              placeholder="Session plan, e.g. 4×1 km at threshold with 90 s jog"></textarea>
          </div>

          <div class="form-group">
            <label for="workout-repeat">Repeat</label>
            <select id="workout-repeat" v-model.number="repeatWeeks">
              <option :value="1">Just this date</option>
              <option v-for="n in [2, 3, 4, 6, 8, 12]" :key="n" :value="n">
                Weekly for {{ n }} weeks
              </option>
            </select>
          </div>

          <button @click="saveNewWorkout" class="action-button primary save-button" :disabled="isActionLoading">
            <span v-if="!isActionLoading">
              {{ repeatWeeks > 1 ? `Save ${repeatWeeks} sessions` : 'Save workout' }}
            </span>
            <span v-else class="ascii-spinner">Saving</span>
          </button>
        </div>
      </CustomModal>

      <datalist id="gym-splits">
        <option v-for="sp in splitSuggestions" :key="sp" :value="sp" />
      </datalist>

      <!-- Log Weight Modal -->
      <CustomModal v-model:show="showLogWeightModal" title="Log body weight">
        <div class="form-container">
          <div class="form-group">
            <label for="weight-amount">Weight (kg)</label>
            <input type="number" id="weight-amount" v-model="newWeight.weight" step="0.1" min="20" max="300" />
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
                <span class="rn-lbl">Split</span>
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
              <div v-if="selectedWorkout.actualDuration"><dt>Duration</dt><dd>{{ selectedWorkout.actualDuration }} min</dd></div>
              <div v-if="selectedWorkout.totalWeightLifted"><dt>Total load</dt><dd>{{ selectedWorkout.totalWeightLifted.toLocaleString() }} kg</dd></div>
              <div v-if="selectedWorkout.rpe"><dt>How hard it felt</dt><dd>{{ selectedWorkout.rpe }}/10 · {{ RPE_WORDS[selectedWorkout.rpe] }}</dd></div>
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
            <button v-if="!selectedWorkout.isCompleted" @click="startCompletion" class="action-button primary save-button">
              <n-icon :component="CheckmarkOutline" /> Log as done
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
          <div v-if="selectedWorkout.type === 'Gym'" class="form-group">
            <label>Split <span class="label-hint">— groups your gym stats</span></label>
            <input v-model="selectedWorkout.gymType" list="gym-splits" placeholder="e.g. Push" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ selectedWorkout.isCompleted ? 'Planned duration (min)' : 'Duration (min)' }}</label>
              <input type="number" v-model="selectedWorkout.duration" min="0" />
            </div>
            <div v-if="selectedWorkout.type === 'Running' || selectedWorkout.type === 'Bike'" class="form-group">
              <label>{{ selectedWorkout.isCompleted ? 'Distance done (km)' : 'Distance (km)' }}</label>
              <input type="number" v-model="selectedWorkout.distance" min="0" step="0.1" />
            </div>
          </div>
          <template v-if="selectedWorkout.isCompleted">
            <div class="form-row">
              <div class="form-group">
                <label>Actual duration (min)</label>
                <input type="number" v-model="selectedWorkout.actualDuration" min="0" />
              </div>
              <div class="form-group">
                <label>How hard it felt</label>
                <select v-model.number="selectedWorkout.rpe">
                  <option :value="undefined">—</option>
                  <option v-for="n in 10" :key="n" :value="n">{{ n }} · {{ RPE_WORDS[n] }}</option>
                </select>
              </div>
            </div>
            <div v-if="selectedWorkout.type === 'Gym'" class="form-group">
              <label>Total load (kg)</label>
              <input type="number" v-model="selectedWorkout.totalWeightLifted" min="0" />
            </div>
          </template>
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
          <!-- Running / bike: a recording is the most accurate source -->
          <template v-if="getWorkoutType(selectedWorkout) === 'running' || getWorkoutType(selectedWorkout) === 'bike'">
            <div class="form-group">
              <label for="strava-activity">Recording <span class="label-hint">— from your watch, if you imported one</span></label>
              <select id="strava-activity" v-model="completionData.stravaActivityId" :disabled="isStravaLoading">
                <option :value="undefined">{{ isStravaLoading ? 'Loading recordings…' : 'No recording — enter it by hand' }}</option>
                <option v-for="activity in stravaActivityOptions" :key="activity.value" :value="activity.value">
                  {{ activity.label }}
                </option>
              </select>
              <span v-if="!isStravaLoading && stravaActivityOptions.length === 0" class="field-hint">
                No recordings imported yet. Import a file below, or fill in the distance by hand.
              </span>
            </div>

            <div class="fit-import-row">
              <button class="action-button" :disabled="isFitImporting" @click="fitInput?.click()">
                <span v-if="!isFitImporting">Import a watch file…</span>
                <span v-else class="ascii-spinner">Importing</span>
              </button>
              <span class="fit-import-hint">.fit, .gpx or .tcx — it's linked to this session automatically</span>
              <input ref="fitInput" type="file" accept=".fit,.gpx,.tcx,.gz,application/gzip" style="display: none"
                @change="onCompletionFitPicked" />
            </div>

            <div v-if="stravaPreview" class="strava-preview">
              <span class="sp-item"><span class="sp-num">{{ stravaPreview.distance }}</span> km</span>
              <span class="sp-item"><span class="sp-num">{{ stravaPreview.duration }}</span> min</span>
              <span class="sp-note">taken from the recording</span>
            </div>

            <div v-if="!completionData.stravaActivityId" class="form-row">
              <div class="form-group">
                <label>Distance (km)</label>
                <input type="number" v-model="completionData.distance" min="0" step="0.1" />
              </div>
              <div class="form-group">
                <label>Duration (min)</label>
                <input type="number" v-model="completionData.actualDuration" min="0" />
              </div>
            </div>
          </template>

          <!-- Gym: total load -->
          <template v-else-if="getWorkoutType(selectedWorkout) === 'gym'">
            <div class="form-row">
              <div class="form-group">
                <label>Total load (kg)</label>
                <input type="number" v-model="completionData.totalWeightLifted" min="0" step="5" />
              </div>
              <div class="form-group">
                <label>Duration (min)</label>
                <input type="number" v-model="completionData.actualDuration" min="0" />
              </div>
            </div>
            <p class="field-hint block">
              Add up weight × reps for every working set — 3 sets of 8 at 100 kg is 2,400 kg.
              This is what the Gym stats track, so count it the same way each time.
            </p>
          </template>

          <template v-else-if="getWorkoutType(selectedWorkout) !== 'rest'">
            <div class="form-group">
              <label>Duration (min)</label>
              <input type="number" v-model="completionData.actualDuration" min="0" />
            </div>
          </template>

          <div v-if="getWorkoutType(selectedWorkout) !== 'rest'" class="form-group">
            <label>How hard did it feel?</label>
            <div class="rpe-scale" role="radiogroup" aria-label="How hard did it feel, 1 to 10">
              <button
                v-for="n in 10" :key="n" type="button" class="rpe-dot"
                :class="{ on: completionData.rpe === n }"
                :aria-checked="completionData.rpe === n" role="radio"
                :title="RPE_WORDS[n]"
                @click="completionData.rpe = completionData.rpe === n ? undefined : n"
              >{{ n }}</button>
            </div>
            <span class="field-hint">{{ completionData.rpe ? RPE_WORDS[completionData.rpe] : 'Optional · 1 is very easy, 10 is all-out' }}</span>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="completionData.notes" placeholder="How did it go?"></textarea>
          </div>

          <div class="modal-actions">
            <button @click="modalMode = 'view'" class="action-button">Cancel</button>
            <button @click="handleSaveCompletion" class="action-button primary save-button" :disabled="isActionLoading">
              <span v-if="!isActionLoading">Save as done</span>
              <span v-else class="ascii-spinner">Saving</span>
            </button>
          </div>
        </div>
      </CustomModal>

      <!-- Activity file import (FIT/GPX/TCX) -->
      <BuildPlanModal
        v-model:show="showBuildPlan"
        :races="raceGoals"
        :existing="workouts"
        :recent-weekly-km="recentWeeklyKm"
        :gym-days="usualGymDays"
        @created="loadWorkouts"
      />

      <ImportActivitiesModal v-model:show="showActivityImport" @imported="onActivitiesImported" />

      <!-- Import Editor Modal -->
      <ImportEditor
        v-model:show="showImportEditor"
        :initial-data="[]"
        initial-delimiter=","
        :raw-file-content="importRawContent"
        import-type="workout"
        csv-model-description="name, date (YYYY-MM-DD), type, gymType (split, e.g. Push), duration (min), distance (km), isCompleted (0/1), actualDuration (min), rpe (1–10), totalWeightLifted (kg), caloriesBurned, targetPace, notes"
        @confirm="onImportConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, NIcon } from 'naive-ui';
import {
  AddOutline, BodyOutline, CloudUploadOutline, CopyOutline, ChevronBackOutline, ChevronForwardOutline,
  FlagOutline, CheckmarkCircle, TrashOutline, CreateOutline, CheckmarkOutline, MapOutline,
  WatchOutline, WalkOutline, BarbellOutline, BicycleOutline, BedOutline, FitnessOutline,
  TrendingUpOutline,
} from '@vicons/ionicons5';
import { db } from '@/db';
import { isOwner } from '@/owner';

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
  getDay,
  parseISO
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Workout, AddWorkoutPayload, DailyWeight, CompleteWorkoutFormValues, RaceGoal, Activity, WorkoutTemplate } from '../types';
import { buildWorkoutFromTemplate } from '@/utils/templateSession';
import { templatesFromWorkoutRows } from '@/utils/templateDerive';
import CustomModal from '../components/CustomModal.vue';
import ImportEditor from '../components/ImportEditor.vue';
import ImportActivitiesModal from '../components/ImportActivitiesModal.vue';
import BuildPlanModal from '../components/BuildPlanModal.vue';
import { activityApi } from '../activities';
import { parseActivityFile } from '@/import/parseActivityFile';
import { targetForDate, hydrateSettings } from '@/settings';
import { currentVdot, hydrateFitness, refreshFitness, setActivities, setWorkouts } from '@/fitness';
import { sessionPace, type SessionPace } from '@/utils/paceAdvice';
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
      message.success(`Moved to ${format(date, 'EEE d MMM')}`);
    } catch (e) {
      console.error(e);
      message.error("Couldn't move that session. Check your connection and try again.");
    } finally {
      isActionLoading.value = false;
    }
  }
}
// == DRAG AND DROP LOGIC END ==

// == IMPORT LOGIC START ==
const showImportEditor = ref(false);
const showBuildPlan = ref(false);

/**
 * Average weekly running distance over the last eight weeks, ignoring weeks
 * with nothing in them — a fortnight off shouldn't tell the plan builder the
 * athlete only runs 10 km a week.
 */
const recentWeeklyKm = computed(() => {
  const since = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
  const byWeek = new Map<string, number>();
  for (const w of workouts.value) {
    if (w.isCompleted !== 1 || w.date < since || !w.distance) continue;
    if (getWorkoutType(w) !== 'running') continue;
    const key = format(startOfWeek(parseISO(w.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    byWeek.set(key, (byWeek.get(key) || 0) + w.distance);
  }
  const weeks = [...byWeek.values()].filter(km => km > 0);
  return weeks.length ? weeks.reduce((a, b) => a + b, 0) / weeks.length : 0;
});

/** Weekdays with a gym session on them more often than not, over the last eight weeks. */
const usualGymDays = computed(() => {
  const since = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
  const counts = new Array(7).fill(0);
  for (const w of workouts.value) {
    if (w.date < since || getWorkoutType(w) !== 'gym') continue;
    counts[getDay(parseISO(w.date))]++;
  }
  const busiest = Math.max(...counts);
  if (busiest < 2) return [];
  return counts.flatMap((n, day) => (n >= busiest * 0.6 ? [day] : []));
});
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

/** Match key for update mode: same day + same name (case-insensitive). */
const workoutKey = (date: string, name: string) =>
  `${String(date).trim()}\u0000${String(name).trim().toLowerCase()}`;

async function onImportConfirm(data: any[], opts: { asTemplates?: boolean; mode?: 'add' | 'update' } = {}) {
  isActionLoading.value = true;
  try {
    const mode = opts.mode ?? 'add';

    // Update mode matches rows to existing workouts so a re-import edits the
    // schedule in place instead of duplicating it.
    const existingByKey = new Map<string, Workout>();
    if (mode === 'update') {
      for (const w of await db.getWorkouts()) existingByKey.set(workoutKey(w.date, w.name), w);
    }

    let added = 0, updated = 0, skipped = 0;
    for (const row of data) {
      if (!row.name || !row.date) { skipped++; continue; }
      const name = String(row.name).trim();
      const date = String(row.date).trim();

      const match = mode === 'update' ? existingByKey.get(workoutKey(date, name)) : undefined;
      if (match) {
        // Overwrite the plan only; keep completion + logged results untouched.
        // For a workout you've already done, `distance` holds what you actually
        // ran, so don't let the CSV's planned distance clobber it.
        const done = match.isCompleted === 1;
        await db.updateWorkout({
          ...match,
          name,
          date,
          type: toStr(row.type) || match.type || 'Other',
          duration: done ? match.duration : toNum(row.duration),
          distance: done ? match.distance : toNum(row.distance),
          targetPace: toStr(row.targetPace),
          gymType: toStr(row.gymType),
          notes: toStr(row.notes) || '',
          caloriesBurned: toNum(row.caloriesBurned) ?? match.caloriesBurned,
        });
        updated++;
        continue;
      }

      await db.addWorkout({
        name,
        date,
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
      } as any);
      added++;
    }

    // Optionally distil the distinct sessions into reusable templates.
    let templateCount = 0;
    if (opts.asTemplates) {
      const toCreate = templatesFromWorkoutRows(data, templates.value);
      for (const t of toCreate) {
        try { await db.addWorkoutTemplate(t); templateCount++; }
        catch (e) { console.error('Template create failed for', t.name, e); }
      }
      if (templateCount) templates.value = await db.getWorkoutTemplates();
    }

    const parts = [
      added ? `${added} added` : '',
      updated ? `${updated} updated` : '',
      skipped ? `${skipped} skipped` : '',
      templateCount ? `${templateCount} new template${templateCount === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    message.success(`Import done — ${parts.join(', ') || 'nothing to do'}`);
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
  if (modalMode.value === 'edit') return 'Edit session';
  if (modalMode.value === 'complete') return 'Log session';
  return 'Session';
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
            // Closest to the session's date first, so the right recording is at the top.
            const target = selectedWorkout.value ? parseISO(selectedWorkout.value.date).getTime() : Date.now();
            const when = (act: any) => new Date(act.start_date_local || act.start_date || 0).getTime();
            filtered.sort((a: any, b: any) => Math.abs(when(a) - target) - Math.abs(when(b) - target));
            stravaActivityOptions.value = filtered.map((act: any) => {
                let dateStr = 'unknown date';
                try {
                    if (act.start_date_local) {
                        dateStr = format(parseISO(act.start_date_local), 'EEE d MMM yyyy');
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
      message.error(isOwner.value
        ? 'Database table missing — run supabase_imported_activities.sql in the Supabase SQL editor once.'
        : "Activity storage isn't set up on this account yet — let the app owner know.",
        { duration: 10000 });
    } else {
      message.error('Import failed: ' + msg);
    }
  } finally {
    isFitImporting.value = false;
  }
}

/**
 * Open the completion form with a same-day recording already picked, so logging
 * a run you've imported is one click rather than a hunt through a long list.
 */
function startCompletion() {
  const w = selectedWorkout.value;
  if (w && !completionData.value.stravaActivityId) {
    const sameDay = stravaActivities.value.find((a: any) =>
      String(a.start_date_local || '').slice(0, 10) === w.date &&
      stravaActivityOptions.value.some(o => String(o.value) === String(a.id)));
    if (sameDay) completionData.value.stravaActivityId = sameDay.id as any;
  }
  modalMode.value = 'complete';
}

const RPE_WORDS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Comfortable', 4: 'Steady', 5: 'Moderate',
  6: 'Somewhat hard', 7: 'Hard', 8: 'Very hard', 9: 'Near max', 10: 'All-out',
};

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
    totalWeightLifted: workout.totalWeightLifted || undefined,
    distance: workout.distance || undefined,
    actualDuration: workout.actualDuration || workout.duration || undefined,
    rpe: workout.rpe || undefined,
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
    const w = selectedWorkout.value;
    await db.updateWorkout({
      ...w,
      duration: cleanNum(w.duration),
      distance: cleanNum(w.distance),
      actualDuration: cleanNum(w.actualDuration),
      rpe: cleanNum(w.rpe),
      totalWeightLifted: cleanNum(w.totalWeightLifted),
      gymType: w.type === 'Gym' ? (w.gymType?.trim() || undefined) : w.gymType,
    });
    showDetailsModal.value = false;
    await loadWorkouts();
    message.success('Changes saved.');
  } catch (e) {
    console.error('Update failed', e);
    message.error("Couldn't save your changes. Check your connection and try again.");
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
      message.success('Session deleted.');
    } catch (e) {
      console.error('Delete failed', e);
      message.error("Couldn't delete that session. Check your connection and try again.");
    } finally {
      isActionLoading.value = false;
    }
  }
}

async function handleSaveCompletion() {
  if (!selectedWorkout.value || selectedWorkout.value.id === undefined) return;
  isActionLoading.value = true;
  try {
    const c = completionData.value;
    const payload: any = {
      id: selectedWorkout.value.id,
      isCompleted: 1,
      notes: c.notes ?? '',
      stravaActivityId: c.stravaActivityId,
      distance: cleanNum(c.distance),
      actualDuration: cleanNum(c.actualDuration),
      rpe: cleanNum(c.rpe),
      totalWeightLifted: cleanNum(c.totalWeightLifted),
    };
    // Never overwrite a field the form didn't show with an empty value.
    for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k];

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
    message.success('Logged. Nice work.');
  } catch (e) {
    console.error('Completion failed', e);
    message.error("Couldn't save that. Check your connection and try again.");
  } finally {
    isActionLoading.value = false;
  }
}
// == DETAILS/EDIT/COMPLETE MODAL LOGIC END ==


// == ADD/LOG MODAL LOGIC START ==
const showAddWorkoutModal = ref(false);
const showLogWeightModal = ref(false);

/**
 * The whole session, captured in one pass.
 *
 * This form used to take only name/date/type, so planning a 12 km easy run meant
 * saving, reopening the session and editing it to add the distance. Everything
 * the edit dialog offers is here now.
 */
const newWorkout = ref<AddWorkoutPayload>({
  name: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'Running',
  duration: undefined,
  distance: undefined,
  notes: '',
});

/** Repeat the session on the same weekday for this many consecutive weeks. */
const repeatWeeks = ref(1);

const newWorkoutIsDistance = computed(() =>
  newWorkout.value.type === 'Running' || newWorkout.value.type === 'Bike');

// Shared template library — pick one to pre-fill the new workout from.
const templates = ref<WorkoutTemplate[]>([]);
const selectedTemplateId = ref<number | null>(null);

const TEMPLATE_KIND_LABELS: Record<string, string> = { gym: 'Gym', run: 'Run', bike: 'Bike', other: 'Other' };
const TEMPLATE_KIND_TYPES: Record<string, string> = { gym: 'Gym', run: 'Running', bike: 'Bike', other: 'Other' };

/** Picking a template fills the form, so you can see — and change — what it brings. */
watch(selectedTemplateId, (id) => {
  if (!id) return;
  const t = templates.value.find(t => t.id === id);
  if (t) {
    newWorkout.value.name = t.name;
    newWorkout.value.type = TEMPLATE_KIND_TYPES[t.kind || 'gym'];
    if (t.kind === 'gym' && t.workout_type) newWorkout.value.gymType = t.workout_type;
    if (t.duration) newWorkout.value.duration = t.duration;
    if (t.distance) newWorkout.value.distance = t.distance;
    if (t.notes && !newWorkout.value.notes) newWorkout.value.notes = t.notes;
  }
});

/** Splits already in use first, then the common ones — so spelling stays consistent. */
const splitSuggestions = computed(() => {
  const used = workouts.value.map(w => w.gymType?.trim()).filter((x): x is string => !!x);
  return [...new Set([...used, 'Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body'])];
});

const newWeight = ref({
  weight: 70,
  date: format(new Date(), 'yyyy-MM-dd'),
});

function openAddWorkoutModal(date: Date | null) {
  newWorkout.value = {
    name: '',
    date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    type: 'Running',
    duration: undefined,
    distance: undefined,
    gymType: undefined,
    notes: '',
  };
  repeatWeeks.value = 1;
  selectedTemplateId.value = null;
  showAddWorkoutModal.value = true;
}

/** Blank strings and NaN out of number inputs must not reach the database. */
const cleanNum = (v: unknown): number | undefined => {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

async function saveNewWorkout() {
  if (!newWorkout.value.name.trim()) {
    message.warning('Give the session a name first.');
    return;
  }
  isActionLoading.value = true;
  try {
    const template = selectedTemplateId.value
      ? templates.value.find(t => t.id === selectedTemplateId.value)
      : null;

    const weeks = Math.max(1, Math.min(52, Math.round(Number(repeatWeeks.value) || 1)));
    const baseDate = parseISO(newWorkout.value.date);

    for (let i = 0; i < weeks; i++) {
      const date = format(addWeeks(baseDate, i), 'yyyy-MM-dd');

      // A chosen template carries pace/distance/gymType/notes; anything the user
      // typed into the form then overrides it.
      let payload: AddWorkoutPayload = template
        ? await buildWorkoutFromTemplate(template, date)
        : { ...newWorkout.value, date };

      payload = {
        ...payload,
        date,
        name: newWorkout.value.name || template?.name || 'Session',
        type: newWorkout.value.type,
        duration: cleanNum(newWorkout.value.duration) ?? payload.duration,
        distance: newWorkoutIsDistance.value
          ? (cleanNum(newWorkout.value.distance) ?? payload.distance)
          : undefined,
        notes: newWorkout.value.notes || payload.notes || '',
        gymType: newWorkout.value.type === 'Gym'
          ? (newWorkout.value.gymType?.trim() || payload.gymType || undefined)
          : undefined,
      };

      await db.addWorkout(payload);
    }

    showAddWorkoutModal.value = false;
    await loadWorkouts();
    message.success(weeks === 1 ? 'Session added.' : `Added to ${weeks} weeks.`);
    selectedTemplateId.value = null;
  } catch (e) {
    console.error('Failed to add workout', e);
    message.error("Couldn't save that session. Check your connection and try again.");
  } finally {
    isActionLoading.value = false;
  }
}

/**
 * Copy the previous week's plan onto this one.
 *
 * Building a training week one dialog at a time is the single most tedious
 * thing in the app, and most weeks are a variation on the last.
 */
async function copyLastWeek() {
  // In week view, "this week" is the week you're looking at; in month view it's
  // the real current week.
  const anchor = viewMode.value === 'week' ? currentWeek.value : new Date();
  const targetStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const sourceStart = subWeeks(targetStart, 1);
  const sourceEnd = endOfWeek(sourceStart, { weekStartsOn: 1 });

  const source = workouts.value.filter(w => {
    const d = parseISO(w.date);
    return d >= sourceStart && d <= sourceEnd;
  });

  if (!source.length) {
    message.warning('Nothing scheduled last week to copy.');
    return;
  }

  const targetEnd = endOfWeek(targetStart, { weekStartsOn: 1 });
  const already = workouts.value.some(w => {
    const d = parseISO(w.date);
    return d >= targetStart && d <= targetEnd;
  });
  if (already && !window.confirm(
    `This week already has sessions. Add ${source.length} more from last week?`)) return;

  isActionLoading.value = true;
  try {
    for (const w of source) {
      // Copy the plan, never the results: a copied session starts uncompleted.
      await db.addWorkout({
        name: w.name,
        date: format(addWeeks(parseISO(w.date), 1), 'yyyy-MM-dd'),
        type: w.type,
        duration: w.duration,
        distance: w.isCompleted === 1 ? undefined : w.distance,
        targetPace: w.targetPace,
        gymType: w.gymType,
        notes: w.notes || '',
        isCompleted: 0,
      } as AddWorkoutPayload);
    }
    await loadWorkouts();
    message.success(`Copied ${source.length} session${source.length === 1 ? '' : 's'} from last week.`);
  } catch (e) {
    console.error('Copy week failed', e);
    message.error("Couldn't copy last week. Check your connection and try again.");
  } finally {
    isActionLoading.value = false;
  }
}

/** Start from the last weigh-in rather than an arbitrary 70 kg. */
watch(showLogWeightModal, open => {
  if (!open) return;
  const last = [...dailyWeights.value].sort((a, b) => b.date.localeCompare(a.date))[0];
  newWeight.value = { weight: last?.weight ?? newWeight.value.weight, date: format(new Date(), 'yyyy-MM-dd') };
});

async function saveNewWeight() {
  if (!newWeight.value.weight) {
    message.warning('Enter a weight first.');
    return;
  }
  isActionLoading.value = true;
  try {
    await db.addDailyWeight({
      date: newWeight.value.date,
      weight: Number(newWeight.value.weight)
    });
    message.success('Weight logged.');
    showLogWeightModal.value = false;
    await loadDailyWeights();
    // Reset date after successful save
    newWeight.value.date = format(new Date(), 'yyyy-MM-dd');
  } catch (error) {
    console.error('Failed to save weight:', error);
    message.error("Couldn't save that weight. Check your connection and try again.");
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

/**
 * How many chips fit in a month cell before we collapse the rest.
 *
 * Every row is a fixed height so the grid stays aligned; capping the chips is
 * what makes that possible. Overflow isn't hidden — it becomes a "+N more"
 * button that opens that week in the detailed week view.
 */
const MAX_MONTH_CHIPS = 3;

/**
 * On a phone the month grid becomes one day per row, so cells grow to fit and
 * there's no reason to collapse anything — capping there would hide sessions
 * behind a "+N more" for no gain.
 */
const isNarrow = ref(window.innerWidth <= 768);
const onCalendarResize = () => { isNarrow.value = window.innerWidth <= 768; };
onMounted(() => window.addEventListener('resize', onCalendarResize));
onUnmounted(() => window.removeEventListener('resize', onCalendarResize));

const chipBudget = computed(() => (isNarrow.value ? Number.POSITIVE_INFINITY : MAX_MONTH_CHIPS));

const days = computed(() => {
  const monthStart = startOfMonth(currentMonth.value);
  const monthEnd = endOfMonth(currentMonth.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return dateRange.map(date => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const workouts = workoutsByDate.value[formattedDate] || [];
    const dailyWeights = dailyWeightsByDate.value[formattedDate] || [];
    const raceGoals = raceGoalsByDate.value[formattedDate] || [];

    // Races first (they anchor the day), then sessions, then the weigh-in.
    const total = raceGoals.length + workouts.length + dailyWeights.length;
    let budget = chipBudget.value;
    const showRaces = raceGoals.slice(0, budget);
    budget -= showRaces.length;
    const showWorkouts = workouts.slice(0, Math.max(0, budget));
    budget -= showWorkouts.length;
    const showWeights = dailyWeights.slice(0, Math.max(0, budget));

    const dow = date.getDay();
    return {
      date,
      dayOfMonth: getDate(date),
      isCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: formattedDate === todayStr,
      isWeekend: dow === 0 || dow === 6,
      workouts,
      dailyWeights,
      raceGoals,
      showRaces,
      showWorkouts,
      showWeights,
      hiddenCount: total - showRaces.length - showWorkouts.length - showWeights.length,
    };
  });
});

function previousMonth() { currentMonth.value = subMonths(currentMonth.value, 1); }
function nextMonth() { currentMonth.value = addMonths(currentMonth.value, 1); }

/** Jump back to the current month or week — the fastest way to re-orient. */
function goToToday() {
  const now = new Date();
  currentMonth.value = now;
  currentWeek.value = now;
}

/** Open one day's full detail by switching to the week view around it. */
function openWeekFor(date: Date) {
  currentWeek.value = date;
  viewMode.value = 'week';
}

/**
 * The trailing figure on a month chip. One token only — the cell is 19px tall
 * and the name needs the room; the week view carries pace, split and notes.
 */
function chipMeta(workout: Workout): string {
  const type = getWorkoutType(workout);
  if (type === 'rest') return '';
  if (type !== 'gym' && workout.distance) return `${workout.distance} km`;
  if (workout.duration) return `${workout.duration}m`;
  return '';
}

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
  running: 'Run', gym: 'Gym', bike: 'Bike', rest: 'Rest day', other: 'Other',
};
const workoutIcon = (w: Workout) => TYPE_ICONS[getWorkoutType(w)] || FitnessOutline;
const workoutTypeLabel = (w: Workout) => TYPE_LABELS[getWorkoutType(w)] || 'Workout';

const formatLongDate = (date: string) => {
  try { return format(parseISO(date), 'EEE d MMM'); } catch { return date; }
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
  db.getWorkoutTemplates().then(t => { templates.value = t; }).catch(() => { /* library empty or table missing */ });
  hydrateSettings(); hydrateFitness();
  activityApi.getAllActivities()
    .then(a => { stravaActivities.value = a; })
    .catch(() => { /* no recordings — workouts keep their declared type */ });
};
onMounted(loadAll);
onActivated(loadAll);

</script>


<style scoped>
.label-hint { font-weight: 400; color: var(--text-muted); font-size: 0.78rem; }
.field-hint { display: block; margin-top: 5px; font-size: 0.76rem; color: var(--text-muted); line-height: 1.45; }
.field-hint.block { margin: -4px 0 12px; }
.rpe-scale { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
.rpe-dot {
  height: 34px; border-radius: var(--radius-sm); cursor: pointer;
  border: 1px solid var(--border-color); background: var(--surface-2);
  color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.8rem;
}
.rpe-dot:hover { border-color: var(--border-strong); color: var(--text-color); }
.rpe-dot.on { background: var(--primary-color); border-color: var(--primary-color); color: #fff; }
/* min-height, not height: a fixed 100% clamps to the scroll container's padded
   content box, so the calendar overflowed past the padding that clears the nav. */
.dashboard-view-wrapper { min-height: 100%; }
.dashboard-view { padding: 24px 28px 40px; max-width: 1100px; margin: 0 auto; width: 100%; box-sizing: border-box; color: var(--text-color); }
@media (max-width: 768px) { .dashboard-view { padding: 16px 16px 32px; } }

.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.sub { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; }

.actions-bar { display: flex; gap: 10px; flex-wrap: wrap; }
@media (max-width: 600px) {
  .actions-bar { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .actions-bar .action-button { justify-content: center; white-space: nowrap; font-size: 0.8rem; padding: 9px 8px; }
  /* The primary action gets the full row. */
  .actions-bar .action-button.primary { grid-column: 1 / -1; }
  .action-button { flex: 1; justify-content: center; }
}

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
/* Gap-based, not space-between: the nav cluster stays together on the left and
   the view toggle is pushed right, so the month label doesn't wander. */
.calendar-header { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; }
@media (max-width: 480px) {
  .month-display { min-width: 0; flex: 1; font-size: 0.92rem; }
  .view-toggle { margin-left: 0; width: 100%; }
  .view-toggle button { flex: 1; }
}
.nav-button { background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); width: 30px; height: 30px; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
.nav-button:hover { background: var(--surface-hover); color: var(--text-color); }
.month-display { font-weight: 600; font-size: 1rem; color: var(--text-color); min-width: 10ch; text-align: center; }

.today-button {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-family);
  font-size: 0.78rem;
  font-weight: 600;
  transition: color 0.15s, border-color 0.15s;
}
.today-button:hover { color: var(--primary-color); border-color: var(--primary-color); }

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

/*
 * One hairline system: a 1px grid gap over a border-coloured backdrop, instead
 * of a border on every cell. Per-cell borders left the last column's edge
 * doubled against the container and needed first/last-child exceptions to stay
 * even; the gap approach can't drift out of alignment.
 */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--border-color);
}
/* Keeps the body grid's 1px gap so the weekday labels sit exactly over their
   columns — dropping the gap here re-divides the width and the header drifts
   almost a pixel off by Sunday. The gap is invisible: no cell background. */
.days-header {
  background: transparent;
  border-bottom: 1px solid var(--border-color);
}
.dh-cell {
  text-align: center;
  font-weight: 700;
  padding: 8px 4px;
  color: var(--text-muted);
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
/* Weekends read slightly brighter so the week's shape is obvious at a glance. */
.dh-cell.we { color: var(--text-secondary); }

/* Every row is exactly this tall. Rows used to grow with their busiest day, so
   the grid came out lumpy and you couldn't scan across a week. */
.cal-body { grid-auto-rows: 126px; }

.day-cell {
  background: var(--surface-color);
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: background 0.13s;
}
.day-cell:hover { background: var(--surface-2); }
.day-cell.we { background: color-mix(in srgb, var(--surface-2) 45%, var(--surface-color)); }
.day-cell.we:hover { background: var(--surface-2); }

/* Recessed rather than faded: blanket opacity muddied the chips too. */
.day-cell.not-current-month { background: color-mix(in srgb, var(--background-color) 60%, var(--surface-color)); }
.day-cell.not-current-month .day-number { color: var(--text-muted); opacity: 0.6; }

/* A fixed-height head row keeps every cell's chips on the same baseline. */
.day-head { height: 20px; display: flex; align-items: center; flex-shrink: 0; }
.day-number {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

/* Today gets a filled disc and a ring — findable without hunting for a tint. */
.day-cell.is-today { background: color-mix(in srgb, var(--primary-color) 8%, var(--surface-color)); }
.is-today .day-number { background: var(--primary-color); color: #fff; font-weight: 700; }
.is-today::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1.5px solid var(--primary-color);
  pointer-events: none;
}

.day-cell.drag-over { background: var(--primary-soft); box-shadow: inset 0 0 0 2px var(--primary-color); }

.events { display: flex; flex-direction: column; gap: 2px; min-height: 0; overflow: hidden; }

/* One-line chips. The month grid is for scanning; the week view carries the
   detail. Two-line chips are what pushed rows past their height. */
.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 19px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 0.68rem;
  line-height: 1;
  background: var(--surface-2);
  color: var(--text-color);
  flex-shrink: 0;
  border-left: 3px solid var(--tag-color, var(--text-muted));
  overflow: hidden;
  transition: transform 0.1s, opacity 0.1s;
}
.chip.workout { cursor: grab; }
.chip-ico { font-size: 0.76rem; flex-shrink: 0; color: var(--tag-color); }
.chip-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.chip-meta { flex-shrink: 0; font-size: 0.62rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.chip.done { background: color-mix(in srgb, var(--tag-color) 16%, transparent); }
.chip.done .chip-name { color: var(--text-secondary); }
.chip.dragging { opacity: 0.4; transform: scale(0.96); cursor: grabbing; }
.chip.race { background: var(--danger-soft); color: var(--danger-color); border-left-color: var(--danger-color); font-weight: 600; }
.chip.race .chip-ico { color: var(--danger-color); }
.chip.weight { background: transparent; color: var(--text-muted); border-left-color: transparent; padding-left: 6px; }
.chip.weight .chip-ico { color: var(--text-muted); }

.more {
  height: 15px;
  font-size: 0.62rem;
  color: var(--text-muted);
  padding-left: 8px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}
.more:hover { color: var(--primary-color); }

.workout-gym { --tag-color: var(--color-gym-primary); }
.workout-running { --tag-color: var(--color-running-primary); }
.workout-bike { --tag-color: var(--color-bike-primary); }
.workout-rest { --tag-color: var(--color-rest-primary); }
.workout-other { --tag-color: var(--color-other-primary); }

@media (max-width: 768px) {
  /* One day per row on a phone: seven 40px columns is unreadable. Weeks stay
     grouped by the 1px gap, and empty out-of-month days are dropped. */
  .calendar-grid { grid-template-columns: 1fr; }
  .days-header { display: none; }
  .cal-body { grid-auto-rows: auto; }
  .day-cell { flex-direction: row; align-items: flex-start; gap: 12px; padding: 10px; overflow: visible; }
  .day-cell.not-current-month { display: none; }
  .day-head { height: auto; padding-top: 1px; }
  .events { flex: 1; overflow: visible; gap: 4px; }
  .chip { height: 22px; font-size: 0.72rem; }
}

/* Forms */
.form-container { display: flex; flex-direction: column; gap: 16px; padding: 6px 0; }
.form-group { display: flex; flex-direction: column; gap: 6px; }

/* Two short fields side by side; stacks on a phone. */
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; min-width: 0; }
@media (max-width: 520px) { .form-row { flex-direction: column; } }
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
.sp-note { margin-left: auto; font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }

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
