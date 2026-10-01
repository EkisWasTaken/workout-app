<template>
  <div class="templates-view-wrapper">
    <div class="templates-content">
      <n-space justify="space-between" align="center" style="margin-bottom: 16px; width: 100%">
        <h1 class="page-title">Templates</h1>
        <n-button type="primary" @click="showAddTemplateModal = true">New template</n-button>
      </n-space>

      <!-- The exercise library used to be its own page in the menu. It only
           exists to feed gym templates, so it lives here as a second tab. -->
      <div class="tpl-tabs" role="tablist" aria-label="Templates sections">
        <button class="tpl-tab" :class="{ on: tab === 'templates' }" role="tab"
          :aria-selected="tab === 'templates'" @click="setTab('templates')">
          Templates<span class="tpl-tab-count">{{ templates.length }}</span>
        </button>
        <button class="tpl-tab" :class="{ on: tab === 'exercises' }" role="tab"
          :aria-selected="tab === 'exercises'" @click="setTab('exercises')">
          Exercise library<span class="tpl-tab-count">{{ exerciseLibrary.length }}</span>
        </button>
      </div>

      <ExerciseLibrary
        v-if="tab === 'exercises'"
        :exercises="exerciseLibrary"
        :templates="templates"
        :template-exercises="exercisesByTemplate"
        :loading="loadingTemplates || loadingExercises"
        :failed="exercisesFailed"
        @open-template="openTemplateById"
        @new-template="startNewGymTemplate"
        @show-templates="setTab('templates')"
      />

      <template v-else>
      <p class="hint">
        A template is a session you do again and again — a push day, a threshold run. Build it once,
        then add it to any date from here or with "Add session" on the schedule.
        Templates are shared with everyone using the app: you can use and copy anyone's,
        but only edit or delete your own.
      </p>

      <!-- While the library loads, rows the same height as the real ones. The
           list used to be blank and then pop into place, pushing the page down. -->
      <div v-if="loadingTemplates" class="tpl-skeletons">
        <div v-for="i in 3" :key="i" class="tpl-skeleton-row">
          <div class="tpl-skeleton-main">
            <Skeleton width="180px" height="15px" :delay="i * 90" />
            <Skeleton width="120px" height="11px" :delay="i * 90 + 40" />
          </div>
          <Skeleton width="120px" height="28px" radius="var(--radius-sm, 6px)" :delay="i * 90 + 80" />
        </div>
      </div>

      <n-list v-else-if="templates.length" bordered style="width: 100%">
        <n-list-item v-for="template in templates" :key="template.id">
          <n-thing>
            <template #header>
              <span class="tpl-kind" :class="`kind-${template.kind || 'gym'}`">{{ kindLabel(template.kind) }}</span>
              {{ template.name }}
              <span v-if="!isOwn(template)" class="tpl-shared" title="Created by someone else">Shared</span>
            </template>
            <template #description>
              <span class="tpl-meta">{{ templateSummary(template) }}</span>
              <!-- A gym template's whole point is its exercise list, and the list
                   used to show nothing but the split — so every push day looked
                   identical and you had to schedule one to find out what was in it. -->
              <span v-if="exerciseLine(template)" class="tpl-exercises">{{ exerciseLine(template) }}</span>
            </template>
          </n-thing>
          <template #suffix>
            <n-space align="center" :size="8">
              <n-button size="small" type="primary" ghost @click="openSchedule(template)">
                Add to schedule
              </n-button>
              <n-button v-if="isOwn(template)" size="small" quaternary @click="openEdit(template)">
                Edit
              </n-button>
              <!-- Someone else's template can't be edited, so copying it is how you
                   adapt it: same session, your own row, yours to change. -->
              <n-button v-else size="small" quaternary :loading="duplicatingId === template.id"
                @click="duplicate(template)">
                Copy to mine
              </n-button>
              <!-- Only the owner may delete. The library is shared, and a friend
                   wiping your templates is not a feature. -->
              <n-popconfirm v-if="isOwn(template)" @positive-click="deleteTemplate(template.id)" placement="left">
                <template #trigger>
                  <n-button size="small" type="error" quaternary>Delete</n-button>
                </template>
                Delete this template?
              </n-popconfirm>
            </n-space>
          </template>
        </n-list-item>
      </n-list>
      <n-empty v-else-if="!loadingTemplates" description="No templates yet. Create one for a session you repeat every week." style="margin-top: 40px">
        <template #extra>
          <n-button size="small" @click="showAddTemplateModal = true">New template</n-button>
        </template>
      </n-empty>
      </template>

      <!-- Create template -->
      <n-modal v-model:show="showAddTemplateModal" preset="card" :style="{ width: '800px', maxWidth: '95vw' }"
        :title="editingId ? 'Edit template' : 'New template'" @after-leave="resetNewTemplate">
        <n-space vertical size="large">
          <n-radio-group v-model:value="newTemplate.kind">
            <n-radio-button value="gym">Gym session</n-radio-button>
            <n-radio-button value="run">Run</n-radio-button>
            <n-radio-button value="bike">Bike</n-radio-button>
            <n-radio-button value="other">Other</n-radio-button>
          </n-radio-group>

          <n-form-item label="Template name" :show-feedback="false">
            <n-input v-model:value="newTemplate.name" placeholder="e.g. Push day, Threshold 5×1k" />
          </n-form-item>

          <n-form-item :label="typeFieldLabel" :show-feedback="false">
            <n-input v-model:value="newTemplate.workout_type" :placeholder="typeFieldPlaceholder" />
          </n-form-item>

          <!-- Distance sports (run / bike): pace + distance -->
          <template v-if="isDistanceKind">
            <n-space :size="12" style="width: 100%">
              <n-form-item label="Target pace (/km)" :show-feedback="false" style="flex: 1">
                <n-input v-model:value="newTemplate.target_pace" placeholder="e.g. 5:00" />
              </n-form-item>
              <n-form-item label="Distance (km)" :show-feedback="false" style="flex: 1">
                <n-input-number v-model:value="newTemplate.distance" :min="0" :step="0.5" placeholder="e.g. 10"
                  style="width: 100%" />
              </n-form-item>
              <n-form-item label="Duration (min)" :show-feedback="false" style="flex: 1">
                <n-input-number v-model:value="newTemplate.duration" :min="0" placeholder="e.g. 45"
                  style="width: 100%" />
              </n-form-item>
            </n-space>
          </template>

          <!-- Gym-specific -->
          <template v-else-if="newTemplate.kind === 'other'">
            <n-form-item label="Duration (min)" :show-feedback="false">
              <n-input-number v-model:value="newTemplate.duration" :min="0" placeholder="e.g. 45"
                style="width: 200px" />
            </n-form-item>
          </template>
          <template v-else>
            <n-form-item label="Duration (min)" :show-feedback="false">
              <n-input-number v-model:value="newTemplate.duration" :min="0" placeholder="e.g. 60"
                style="width: 200px" />
            </n-form-item>
            <n-data-table :columns="columns" :data="newTemplate.exercises" :pagination="false" :bordered="false" />
            <n-button @click="addExercise" block dashed>Add exercise</n-button>
          </template>

          <n-form-item label="Notes" :show-feedback="false">
            <n-input v-model:value="newTemplate.notes" type="textarea" :autosize="{ minRows: 2 }"
              placeholder="Anything to copy onto the scheduled session" />
          </n-form-item>

          <n-button type="primary" @click="saveTemplate" block :loading="saving">
            {{ editingId ? 'Save changes' : 'Create template' }}
          </n-button>
        </n-space>
      </n-modal>

      <!-- Schedule a template onto a date -->
      <n-modal v-model:show="showScheduleModal" preset="card" :style="{ width: '420px', maxWidth: '95vw' }"
        :title="`Schedule: ${scheduleTarget?.name ?? ''}`">
        <n-space vertical size="large">
          <n-form-item label="Date" :show-feedback="false">
            <n-date-picker v-model:value="scheduleDate" type="date" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Repeat" :show-feedback="false">
            <n-select v-model:value="scheduleWeeks" :options="repeatOptions" />
          </n-form-item>
          <n-button type="primary" block :loading="scheduling" @click="confirmSchedule">Add to schedule</n-button>
        </n-space>
      </n-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NButton, NList, NListItem, NThing, NModal, NSpace, NInput, NInputNumber,
  useMessage, NDataTable, NPopconfirm, NFormItem, NRadioGroup, NRadioButton, NEmpty,
  NDatePicker, NSelect, NAutoComplete,
} from 'naive-ui';
import { addWeeks, format } from 'date-fns';
import type { WorkoutTemplate, WorkoutTemplateExercise, TemplateKind, Exercise } from '../types';
import { db, NOT_YOUR_TEMPLATE } from '@/db';
import Skeleton from '@/components/Skeleton.vue';
import ExerciseLibrary from '@/components/ExerciseLibrary.vue';
import { auth } from '@/auth';
import { buildWorkoutFromTemplate } from '@/utils/templateSession';

/** Templates are a shared library; only the creator gets the destructive actions. */
const isOwn = (t: WorkoutTemplate) => !t.user_id || t.user_id === auth.user?.id;

const message = useMessage();
const templates = ref<WorkoutTemplate[]>([]);
const showAddTemplateModal = ref(false);
const saving = ref(false);
/** Set while the modal is editing an existing row; null while creating one. */
const editingId = ref<number | null>(null);
const loadingTemplates = ref(true);
const duplicatingId = ref<number | null>(null);
/** Exercise lists for every gym template, so the list can show what's in them. */
const exercisesByTemplate = ref<Record<number, WorkoutTemplateExercise[]>>({});

interface NewTemplate {
  kind: TemplateKind;
  name: string;
  workout_type: string;
  target_pace: string;
  distance: number | null;
  duration: number | null;
  notes: string;
  exercises: Partial<WorkoutTemplateExercise>[];
}

const blankTemplate = (): NewTemplate => ({
  kind: 'gym', name: '', workout_type: '', target_pace: '',
  distance: null, duration: null, notes: '', exercises: [],
});

const newTemplate = ref<NewTemplate>(blankTemplate());

const resetNewTemplate = () => {
  newTemplate.value = blankTemplate();
  editingId.value = null;
};

const isDistanceKind = computed(() => newTemplate.value.kind === 'run' || newTemplate.value.kind === 'bike');

const KIND_LABELS: Record<TemplateKind, string> = { gym: 'Gym', run: 'Run', bike: 'Bike', other: 'Other' };
const kindLabel = (k?: TemplateKind) => KIND_LABELS[k || 'gym'];

const typeFieldLabel = computed(() =>
  newTemplate.value.kind === 'gym' ? 'Split — groups your gym stats'
    : newTemplate.value.kind === 'bike' ? 'Ride type'
    : newTemplate.value.kind === 'run' ? 'Run type — sets the pace shown on the schedule' : 'Type');
const typeFieldPlaceholder = computed(() =>
  newTemplate.value.kind === 'gym' ? 'e.g. Push, Pull, Legs'
    : newTemplate.value.kind === 'run' ? 'e.g. Easy, Threshold, Long, Intervals' : 'optional');

function templateSummary(t: WorkoutTemplate): string {
  const bits: string[] = [];
  if (t.workout_type) bits.push(t.workout_type);
  if (t.kind === 'run' || t.kind === 'bike') {
    if (t.distance) bits.push(`${t.distance} km`);
    // target_pace is free text — some values already carry a unit ("…6:15/km").
    if (t.target_pace) bits.push(t.target_pace.includes('km') ? `@ ${t.target_pace}` : `@ ${t.target_pace}/km`);
  }
  if (t.duration) bits.push(`${t.duration} min`);
  const exs = exercisesByTemplate.value[t.id];
  if ((t.kind ?? 'gym') === 'gym' && exs?.length) {
    bits.push(`${exs.length} exercise${exs.length === 1 ? '' : 's'}`);
  }
  return bits.join(' · ') || 'No details yet';
}

/** "Bench press 3x8-12 · Row 3x10 · +2 more" — enough to recognise the session. */
function exerciseLine(t: WorkoutTemplate): string | null {
  const exs = exercisesByTemplate.value[t.id];
  if (!exs?.length) return null;
  const shown = exs.slice(0, 3).map(ex => {
    const setsReps = [ex.sets ? `${ex.sets}×` : '', ex.reps ?? ''].join('').trim();
    return setsReps ? `${ex.exercise_name} ${setsReps}` : ex.exercise_name;
  });
  const rest = exs.length - shown.length;
  return [...shown, ...(rest > 0 ? [`+${rest} more`] : [])].join(' · ');
}

const createColumns = ({ remove }: { remove: (rowIndex: number) => void }) => [
  {
    // The name is the widest thing in the row and was being squeezed to about
    // ten characters by the number inputs beside it, so every lift read as
    // "Incline du…". Fixed widths on the small columns give it the rest.
    title: 'Exercise', key: 'exercise_name', minWidth: 220,
    render(row: Partial<WorkoutTemplateExercise>, index: number) {
      // Suggest names from the exercise library so the same lift is spelled the same way.
      const q = (row.exercise_name || '').toLowerCase();
      return h(NAutoComplete, {
        value: row.exercise_name,
        options: q.length < 2 ? [] : exerciseNames.value.filter(n => n.toLowerCase().includes(q)).slice(0, 8),
        onUpdateValue(v: string) { newTemplate.value.exercises[index].exercise_name = v; },
        placeholder: 'e.g. Bench press',
      });
    },
  },
  {
    title: 'Sets', key: 'sets', width: 110,
    render(row: Partial<WorkoutTemplateExercise>, index: number) {
      return h(NInputNumber, {
        value: row.sets,
        onUpdateValue(v: number | null) { newTemplate.value.exercises[index].sets = v === null ? undefined : v; },
        placeholder: 'Sets',
      });
    },
  },
  {
    title: 'Reps', key: 'reps', width: 110,
    render(row: Partial<WorkoutTemplateExercise>, index: number) {
      return h(NInput, {
        value: row.reps,
        onUpdateValue(v: string) { newTemplate.value.exercises[index].reps = v; },
        placeholder: 'e.g., 8-12',
      });
    },
  },
  {
    title: 'Notes', key: 'notes',
    render(row: Partial<WorkoutTemplateExercise>, index: number) {
      return h(NInput, {
        value: row.notes,
        onUpdateValue(v: string) { newTemplate.value.exercises[index].notes = v; },
        placeholder: 'Notes',
      });
    },
  },
  {
    title: '', key: 'actions', width: 100,
    render(_: Partial<WorkoutTemplateExercise>, index: number) {
      return h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => remove(index) },
        { default: () => 'Remove' });
    },
  },
];

const columns = createColumns({
  remove: (rowIndex: number) => { newTemplate.value.exercises.splice(rowIndex, 1); },
});

async function loadTemplates() {
  try {
    templates.value = await db.getWorkoutTemplates();
  } catch (e) {
    console.error('Failed to load templates', e);
    message.error("Couldn't load templates. Check your connection and refresh.");
    return;
  } finally {
    loadingTemplates.value = false;
  }
  // One query for every template's exercises rather than one per row. Failing
  // here only costs the exercise preview, so the list still renders.
  try {
    exercisesByTemplate.value = await db.getTemplateExerciseCounts();
  } catch (e) {
    console.warn('Template exercises unavailable', e);
  }
}

/** The shared exercise library: the second tab, and the name suggestions in the editor. */
const exerciseLibrary = ref<Exercise[]>([]);
const loadingExercises = ref(true);
const exercisesFailed = ref(false);
const exerciseNames = computed(() => exerciseLibrary.value.map(e => e.name).sort());
db.getExercises()
  .then(list => { exerciseLibrary.value = list; })
  .catch(e => { console.error('Failed to load exercises', e); exercisesFailed.value = true; })
  .finally(() => { loadingExercises.value = false; });

const scheduleWeeks = ref(1);
const repeatOptions = [
  { label: 'Just this date', value: 1 },
  ...[2, 3, 4, 6, 8, 12].map(n => ({ label: `Weekly for ${n} weeks`, value: n })),
];

function addExercise() {
  newTemplate.value.exercises.push({ exercise_name: '', sets: undefined, reps: '', notes: '' });
}

/** The row shape both create and update take, from whatever the form holds. */
function templatePayload(t: NewTemplate) {
  const distanceKind = t.kind === 'run' || t.kind === 'bike';
  return {
    name: t.name.trim(),
    kind: t.kind,
    workout_type: t.workout_type.trim() || null,
    target_pace: distanceKind ? (t.target_pace.trim() || null) : null,
    distance: distanceKind ? t.distance : null,
    duration: t.duration,
    notes: t.notes.trim() || null,
    // A row left blank in the editor is not an exercise; it used to reach the
    // database as an empty name and then show up as a nameless line.
    exercises: t.kind === 'gym' ? t.exercises.filter(ex => ex.exercise_name?.trim()) : [],
  };
}

async function saveTemplate() {
  const t = newTemplate.value;
  if (!t.name.trim()) { message.error('Please enter a template name.'); return; }
  if (t.kind === 'gym' && t.exercises.some(ex => !ex.exercise_name?.trim())) {
    message.error('All exercises must have a name.'); return;
  }

  saving.value = true;
  const id = editingId.value;
  try {
    if (id === null) await db.addWorkoutTemplate(templatePayload(t));
    else await db.updateWorkoutTemplate(id, templatePayload(t));
    showAddTemplateModal.value = false;
    await loadTemplates();
    message.success(id === null ? 'Template created.' : 'Template updated.');
  } catch (e: any) {
    console.error('Template save failed', e);
    message.error(e?.message === NOT_YOUR_TEMPLATE
      ? "That template belongs to someone else. Copy it to your own library first."
      : "Couldn't save the template. Check your connection and try again.");
  } finally {
    saving.value = false;
  }
}

/** Load an existing row back into the form. */
function openEdit(template: WorkoutTemplate) {
  newTemplate.value = {
    kind: template.kind ?? 'gym',
    name: template.name,
    workout_type: template.workout_type ?? '',
    target_pace: template.target_pace ?? '',
    distance: template.distance ?? null,
    duration: template.duration ?? null,
    notes: template.notes ?? '',
    exercises: (exercisesByTemplate.value[template.id] ?? []).map(ex => ({
      exercise_name: ex.exercise_name, sets: ex.sets, reps: ex.reps ?? '', notes: ex.notes ?? '',
    })),
  };
  editingId.value = template.id;
  showAddTemplateModal.value = true;
}

/**
 * Copy someone else's template into your own library, exercises and all.
 * The library is shared but only the owner may change a row, so copying is the
 * only way to start from a session a friend built and then adjust it.
 */
async function duplicate(template: WorkoutTemplate) {
  duplicatingId.value = template.id;
  try {
    await db.addWorkoutTemplate({
      name: `${template.name} (copy)`,
      kind: template.kind ?? 'gym',
      workout_type: template.workout_type ?? null,
      target_pace: template.target_pace ?? null,
      distance: template.distance ?? null,
      duration: template.duration ?? null,
      notes: template.notes ?? null,
      exercises: (exercisesByTemplate.value[template.id] ?? []).map(ex => ({
        exercise_name: ex.exercise_name, sets: ex.sets, reps: ex.reps, notes: ex.notes,
      })),
    });
    await loadTemplates();
    message.success('Copied to your templates.');
  } catch (e) {
    console.error('Template copy failed', e);
    message.error("Couldn't copy that template. Check your connection and try again.");
  } finally {
    duplicatingId.value = null;
  }
}

async function deleteTemplate(templateId: number) {
  try {
    await db.deleteWorkoutTemplate(templateId);
    await loadTemplates();
    message.success('Template deleted.');
  } catch (e: any) {
    console.error('Template delete failed', e);
    message.error(e?.message === NOT_YOUR_TEMPLATE
      ? 'That template belongs to someone else, so only they can delete it.'
      : "Couldn't delete the template. Check your connection and try again.");
  }
}

// ── schedule a template onto a date → creates a workout ──────────────────────
const showScheduleModal = ref(false);
const scheduleTarget = ref<WorkoutTemplate | null>(null);
const scheduleDate = ref<number>(Date.now());
const scheduling = ref(false);

function openSchedule(template: WorkoutTemplate) {
  scheduleTarget.value = template;
  scheduleDate.value = Date.now();
  scheduleWeeks.value = 1;
  showScheduleModal.value = true;
}

async function confirmSchedule() {
  const template = scheduleTarget.value;
  if (!template) return;
  scheduling.value = true;
  try {
    const start = new Date(scheduleDate.value);
    for (let i = 0; i < scheduleWeeks.value; i++) {
      const date = format(addWeeks(start, i), 'yyyy-MM-dd');
      await db.addWorkout(await buildWorkoutFromTemplate(template, date));
    }
    showScheduleModal.value = false;
    message.success(scheduleWeeks.value === 1
      ? `Added to ${format(start, 'EEE d MMM')}.`
      : `Added every ${format(start, 'EEEE')} for ${scheduleWeeks.value} weeks.`);
  } catch (e: any) {
    console.error('Schedule failed', e);
    message.error("Couldn't add it to the schedule. Check your connection and try again.");
  } finally {
    scheduling.value = false;
  }
}

const route = useRoute();
const router = useRouter();

type Tab = 'templates' | 'exercises';
/** `?tab=exercises` is how the old /exercises page and its links land here. */
const tab = ref<Tab>(route.query.tab === 'exercises' ? 'exercises' : 'templates');
function setTab(next: Tab) {
  tab.value = next;
  const { tab: _drop, ...rest } = route.query;
  router.replace({ query: next === 'exercises' ? { ...rest, tab: 'exercises' } : rest });
}

/** From the library: edit a template that uses an exercise. */
function openTemplateById(id: number) {
  const t = templates.value.find(t => t.id === id);
  if (!t) return;
  if (isOwn(t)) openEdit(t);
  else setTab('templates');
}

function startNewGymTemplate() {
  newTemplate.value.kind = 'gym';
  showAddTemplateModal.value = true;
}

/**
 * `?edit=<id>` opens that template's editor — the Exercises page links here from
 * an exercise to the templates that use it. Someone else's template can't be
 * edited, so for those the link just lands on the list.
 */
onMounted(async () => {
  await loadTemplates();
  const id = Number(route.query.edit);
  if (!route.query.edit || !Number.isFinite(id)) return;
  const { edit: _drop, ...rest } = route.query;
  router.replace({ query: rest });
  const t = templates.value.find(t => t.id === id);
  if (t && isOwn(t)) openEdit(t);
});
</script>

<style scoped>
.templates-view-wrapper { width: 100%; min-height: 100%; }
.templates-content { padding: 24px 28px 40px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .templates-content { padding: 16px 16px 32px; } }

.page-title { margin: 0; }

.tpl-skeletons {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
}
.tpl-skeleton-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}
.tpl-skeleton-row + .tpl-skeleton-row { border-top: 1px solid var(--border-color); }
.tpl-skeleton-main { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.tpl-tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); }
.tpl-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 12px; margin-bottom: -1px;
  border: none; border-bottom: 2px solid transparent; background: none;
  font: inherit; font-size: 0.86rem; color: var(--text-secondary); cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tpl-tab:hover { color: var(--text-color); }
.tpl-tab.on { color: var(--text-color); font-weight: 600; border-bottom-color: var(--primary-color); }
.tpl-tab:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; border-radius: 4px; }
.tpl-tab-count { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); font-weight: 400; }
.hint { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 18px; line-height: 1.5; }

.tpl-kind {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  margin-right: 8px;
  vertical-align: middle;
}
/* One hue per sport, matching the charts and the schedule chips. Green and
   amber stay reserved for the progress verdicts, so they're not used here. */
.kind-gym { background: var(--color-gym-soft); color: var(--color-gym-primary); }
.kind-run { background: var(--color-running-soft); color: var(--color-running-primary); }
.kind-bike { background: var(--color-bike-soft); color: var(--color-bike-primary); }
.kind-other { background: var(--color-other-soft); color: var(--color-other-primary); }
.tpl-meta { font-size: 0.8rem; color: var(--text-muted); display: block; }
.tpl-exercises {
  display: block;
  margin-top: 3px;
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.tpl-shared {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-color);
}
</style>
