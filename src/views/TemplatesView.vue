<template>
  <div class="templates-view-wrapper">
    <div class="templates-content">
      <n-space justify="space-between" align="center" style="margin-bottom: 16px; width: 100%">
        <h1 class="page-title">Workout Templates</h1>
        <n-button type="primary" @click="showAddTemplateModal = true">Create New Template</n-button>
      </n-space>

      <p class="hint">
        A template is a reusable session — a gym split or a run — that you can drop onto
        any date. Build it once, schedule it whenever.
      </p>

      <n-list v-if="templates.length" bordered style="width: 100%">
        <n-list-item v-for="template in templates" :key="template.id">
          <n-thing>
            <template #header>
              <span class="tpl-kind" :class="template.kind === 'run' ? 'kind-run' : 'kind-gym'">
                {{ template.kind === 'run' ? 'Run' : 'Gym' }}
              </span>
              {{ template.name }}
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
              <n-popconfirm @positive-click="deleteTemplate(template.id)" placement="left">
                <template #trigger>
                  <n-button size="small" type="error" ghost>Delete</n-button>
                </template>
                Delete this template?
              </n-popconfirm>
            </n-space>
          </template>
        </n-list-item>
      </n-list>
      <n-empty v-else description="No templates yet." style="margin-top: 40px" />

      <!-- Create template -->
      <n-modal v-model:show="showAddTemplateModal" preset="card" :style="{ width: '800px', maxWidth: '95vw' }"
        title="Create New Template" @after-leave="resetNewTemplate">
        <n-space vertical size="large">
          <n-radio-group v-model:value="newTemplate.kind">
            <n-radio-button value="gym">Gym session</n-radio-button>
            <n-radio-button value="run">Run</n-radio-button>
          </n-radio-group>

          <n-form-item label="Template name" :show-feedback="false">
            <n-input v-model:value="newTemplate.name" placeholder="e.g. Push day, Threshold 5×1k" />
          </n-form-item>

          <n-form-item :label="newTemplate.kind === 'run' ? 'Run type' : 'Split'" :show-feedback="false">
            <n-input v-model:value="newTemplate.workout_type"
              :placeholder="newTemplate.kind === 'run' ? 'e.g. Easy, Threshold, Long' : 'e.g. Push, Pull, Legs'" />
          </n-form-item>

          <!-- Run-specific -->
          <template v-if="newTemplate.kind === 'run'">
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
          <template v-else>
            <n-form-item label="Duration (min)" :show-feedback="false">
              <n-input-number v-model:value="newTemplate.duration" :min="0" placeholder="e.g. 60"
                style="width: 200px" />
            </n-form-item>
            <n-data-table :columns="columns" :data="newTemplate.exercises" :pagination="false" :bordered="false" />
            <n-button @click="addExercise" block dashed>Add Exercise</n-button>
          </template>

          <n-form-item label="Notes" :show-feedback="false">
            <n-input v-model:value="newTemplate.notes" type="textarea" :autosize="{ minRows: 2 }"
              placeholder="Anything to copy onto the scheduled session" />
          </n-form-item>

          <n-button type="primary" @click="saveNewTemplate" block :loading="saving">Save Template</n-button>
        </n-space>
      </n-modal>

      <!-- Schedule a template onto a date -->
      <n-modal v-model:show="showScheduleModal" preset="card" :style="{ width: '420px', maxWidth: '95vw' }"
        :title="`Schedule: ${scheduleTarget?.name ?? ''}`">
        <n-space vertical size="large">
          <n-form-item label="Date" :show-feedback="false">
            <n-date-picker v-model:value="scheduleDate" type="date" style="width: 100%" />
          </n-form-item>
          <n-button type="primary" block :loading="scheduling" @click="confirmSchedule">Add to schedule</n-button>
        </n-space>
      </n-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import {
  NButton, NList, NListItem, NThing, NModal, NSpace, NInput, NInputNumber,
  useMessage, NDataTable, NPopconfirm, NFormItem, NRadioGroup, NRadioButton, NEmpty,
  NDatePicker,
} from 'naive-ui';
import { format } from 'date-fns';
import type { WorkoutTemplate, WorkoutTemplateExercise, TemplateKind } from '../types';
import { db } from '@/db';
import { buildWorkoutFromTemplate } from '@/utils/templateSession';

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

function templateSummary(t: WorkoutTemplate): string {
  const bits: string[] = [];
  if (t.workout_type) bits.push(t.workout_type);
  if (t.kind === 'run') {
    if (t.distance) bits.push(`${t.distance} km`);
    if (t.target_pace) bits.push(`@ ${t.target_pace}/km`);
  }
  if (t.duration) bits.push(`${t.duration} min`);
  return bits.join(' · ') || '—';
}

const createColumns = ({ remove }: { remove: (rowIndex: number) => void }) => [
  {
    title: 'Exercise Name', key: 'exercise_name',
    render(row: Partial<WorkoutTemplateExercise>, index: number) {
      return h(NInput, {
        value: row.exercise_name,
        onUpdateValue(v: string) { newTemplate.value.exercises[index].exercise_name = v; },
        placeholder: 'Exercise Name',
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
    title: 'Actions', key: 'actions',
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
  templates.value = await db.getWorkoutTemplates();
}

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
    await db.addWorkoutTemplate({
      name: t.name.trim(),
      kind: t.kind,
      workout_type: t.workout_type.trim() || null,
      target_pace: t.kind === 'run' ? (t.target_pace.trim() || null) : null,
      distance: t.kind === 'run' ? t.distance : null,
      duration: t.duration,
      notes: t.notes.trim() || null,
      exercises: t.kind === 'gym' ? t.exercises : [],
    });
    showAddTemplateModal.value = false;
    await loadTemplates();
    message.success('Template created.');
  } catch (e: any) {
    message.error(e?.message || 'Failed to create template.');
  } finally {
    saving.value = false;
  }
}

async function deleteTemplate(templateId: number) {
  await db.deleteWorkoutTemplate(templateId);
  await loadTemplates();
  message.success('Template deleted.');
}

// ── schedule a template onto a date → creates a workout ──────────────────────
const showScheduleModal = ref(false);
const scheduleTarget = ref<WorkoutTemplate | null>(null);
const scheduleDate = ref<number>(Date.now());
const scheduling = ref(false);

function openSchedule(template: WorkoutTemplate) {
  scheduleTarget.value = template;
  scheduleDate.value = Date.now();
  showScheduleModal.value = true;
}

async function confirmSchedule() {
  const template = scheduleTarget.value;
  if (!template) return;
  scheduling.value = true;
  try {
    const date = format(new Date(scheduleDate.value), 'yyyy-MM-dd');
    await db.addWorkout(await buildWorkoutFromTemplate(template, date));
    showScheduleModal.value = false;
    message.success(`Added to ${date}.`);
  } catch (e: any) {
    message.error(e?.message || 'Failed to schedule.');
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
.tpl-meta { font-size: 0.8rem; color: var(--text-muted); }
</style>
