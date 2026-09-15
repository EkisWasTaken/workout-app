<template>
  <div class="templates-view-wrapper">
    <div class="templates-content">
      <n-space justify="space-between" align="center" style="margin-bottom: 16px; width: 100%">
        <h1 class="page-title">Templates</h1>
        <n-button type="primary" @click="showAddTemplateModal = true">New template</n-button>
      </n-space>

      <p class="hint">
        A template is a session you do again and again — a push day, a threshold run. Build it once,
        then add it to any date from here or with "Add session" on the schedule.
        Templates are shared with everyone using the app: you can use anyone's, but only delete your own.
      </p>

      <n-list v-if="templates.length" bordered style="width: 100%">
        <n-list-item v-for="template in templates" :key="template.id">
          <n-thing>
            <template #header>
              <span class="tpl-kind" :class="`kind-${template.kind || 'gym'}`">{{ kindLabel(template.kind) }}</span>
              {{ template.name }}
              <span v-if="!isOwn(template)" class="tpl-shared" title="Created by someone else">Shared</span>
            </template>
            <template #description>
              <span class="tpl-meta">{{ templateSummary(template) }}</span>
            </template>
          </n-thing>
          <template #suffix>
            <n-space align="center" :size="8">
              <n-button size="small" type="primary" ghost @click="openSchedule(template)">
                Add to schedule
              </n-button>
              <!-- Only the owner may delete. The library is shared, and a friend
                   wiping your templates is not a feature. -->
              <n-popconfirm v-if="isOwn(template)" @positive-click="deleteTemplate(template.id)" placement="left">
                <template #trigger>
                  <n-button size="small" type="error" ghost>Delete</n-button>
                </template>
                Delete this template?
              </n-popconfirm>
            </n-space>
          </template>
        </n-list-item>
      </n-list>
      <n-empty v-else description="No templates yet. Create one for a session you repeat every week." style="margin-top: 40px">
        <template #extra>
          <n-button size="small" @click="showAddTemplateModal = true">New template</n-button>
        </template>
      </n-empty>

      <!-- Create template -->
      <n-modal v-model:show="showAddTemplateModal" preset="card" :style="{ width: '800px', maxWidth: '95vw' }"
        title="New template" @after-leave="resetNewTemplate">
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

          <n-button type="primary" @click="saveNewTemplate" block :loading="saving">Save template</n-button>
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
import {
  NButton, NList, NListItem, NThing, NModal, NSpace, NInput, NInputNumber,
  useMessage, NDataTable, NPopconfirm, NFormItem, NRadioGroup, NRadioButton, NEmpty,
  NDatePicker, NSelect, NAutoComplete,
} from 'naive-ui';
import { addWeeks, format } from 'date-fns';
import type { WorkoutTemplate, WorkoutTemplateExercise, TemplateKind } from '../types';
import { db } from '@/db';
import { auth } from '@/auth';
import { buildWorkoutFromTemplate } from '@/utils/templateSession';

/** Templates are a shared library; only the creator gets the destructive actions. */
const isOwn = (t: WorkoutTemplate) => !t.user_id || t.user_id === auth.user?.id;

const message = useMessage();
const templates = ref<WorkoutTemplate[]>([]);
const showAddTemplateModal = ref(false);
const saving = ref(false);

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

const resetNewTemplate = () => { newTemplate.value = blankTemplate(); };

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
  return bits.join(' · ') || 'No details yet';
}

const createColumns = ({ remove }: { remove: (rowIndex: number) => void }) => [
  {
    title: 'Exercise', key: 'exercise_name',
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
    title: 'Sets', key: 'sets',
    render(row: Partial<WorkoutTemplateExercise>, index: number) {
      return h(NInputNumber, {
        value: row.sets,
        onUpdateValue(v: number | null) { newTemplate.value.exercises[index].sets = v === null ? undefined : v; },
        placeholder: 'Sets',
      });
    },
  },
  {
    title: 'Reps', key: 'reps',
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
    title: '', key: 'actions',
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
  }
}

const exerciseNames = ref<string[]>([]);
db.getExercises().then(list => { exerciseNames.value = list.map(e => e.name).sort(); }).catch(() => {});

const scheduleWeeks = ref(1);
const repeatOptions = [
  { label: 'Just this date', value: 1 },
  ...[2, 3, 4, 6, 8, 12].map(n => ({ label: `Weekly for ${n} weeks`, value: n })),
];

function addExercise() {
  newTemplate.value.exercises.push({ exercise_name: '', sets: undefined, reps: '', notes: '' });
}

async function saveNewTemplate() {
  const t = newTemplate.value;
  if (!t.name.trim()) { message.error('Please enter a template name.'); return; }
  if (t.kind === 'gym' && t.exercises.some(ex => !ex.exercise_name?.trim())) {
    message.error('All exercises must have a name.'); return;
  }

  saving.value = true;
  try {
    const distanceKind = t.kind === 'run' || t.kind === 'bike';
    await db.addWorkoutTemplate({
      name: t.name.trim(),
      kind: t.kind,
      workout_type: t.workout_type.trim() || null,
      target_pace: distanceKind ? (t.target_pace.trim() || null) : null,
      distance: distanceKind ? t.distance : null,
      duration: t.duration,
      notes: t.notes.trim() || null,
      exercises: t.kind === 'gym' ? t.exercises : [],
    });
    showAddTemplateModal.value = false;
    await loadTemplates();
    message.success('Template created.');
  } catch (e: any) {
    console.error('Template create failed', e);
    message.error("Couldn't save the template. Check your connection and try again.");
  } finally {
    saving.value = false;
  }
}

async function deleteTemplate(templateId: number) {
  try {
    await db.deleteWorkoutTemplate(templateId);
    await loadTemplates();
    message.success('Template deleted.');
  } catch (e) {
    console.error('Template delete failed', e);
    message.error("Couldn't delete the template. Check your connection and try again.");
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

onMounted(loadTemplates);
</script>

<style scoped>
.templates-view-wrapper { width: 100%; min-height: 100%; }
.templates-content { padding: 24px 28px 40px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .templates-content { padding: 16px 16px 32px; } }

.page-title { font-size: 1.5rem; font-weight: 400; margin: 0; }
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
.kind-gym { background: var(--primary-soft); color: var(--primary-color); }
.kind-run { background: var(--success-soft); color: var(--success-color); }
.kind-bike { background: var(--warning-soft, var(--surface-2)); color: var(--warning-color, var(--text-secondary)); }
.kind-other { background: var(--surface-2); color: var(--text-secondary); }
.tpl-meta { font-size: 0.8rem; color: var(--text-muted); }

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
