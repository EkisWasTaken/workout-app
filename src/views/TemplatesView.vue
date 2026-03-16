<template>
  <div class="templates-view-wrapper">
    <div style="padding: 16px; width: 100%">
      <n-space justify="space-between" align="center" style="margin-bottom: 16px; width: 100%">
        <h1>Workout Templates</h1>
        <n-button @click="showAddTemplateModal = true">Create New Template</n-button>
      </n-space>

      <n-list bordered style="width: 100%">
        <n-list-item v-for="template in templates" :key="template.id">
          <n-thing :title="template.name" />
          <template #suffix>
            <n-popconfirm @positive-click="deleteTemplate(template.id)" placement="left">
              <template #trigger>
                <n-button type="error">Delete</n-button>
              </template>
              Are you sure you want to delete this template?
            </n-popconfirm>
          </template>
        </n-list-item>
      </n-list>

      <n-modal v-model:show="showAddTemplateModal" preset="card" :style="{ width: '800px' }" title="Create New Template"
        @after-leave="resetNewTemplate">
        <n-space vertical>
          <n-input v-model:value="newTemplate.name" placeholder="Template Name" />
          <n-data-table :columns="columns" :data="newTemplate.exercises" :pagination="false" :bordered="false" />
          <n-button @click="addExercise" block dashed>Add Exercise</n-button>
          <n-button type="primary" @click="saveNewTemplate" block>Save Template</n-button>
        </n-space>
      </n-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { NButton, NList, NListItem, NThing, NModal, NSpace, NInput, NInputNumber, useMessage, NDataTable, NPopconfirm } from 'naive-ui';
import type { WorkoutTemplate, WorkoutTemplateExercise } from '../types';

const message = useMessage();
const templates = ref<WorkoutTemplate[]>([]);
const showAddTemplateModal = ref(false);

const newTemplate = ref<{
  name: string;
  exercises: Partial<WorkoutTemplateExercise>[];
}>({
  name: '',
  exercises: [],
});

const resetNewTemplate = () => {
  newTemplate.value = { name: '', exercises: [] };
};

const createColumns = ({ remove }: { remove: (rowIndex: number) => void }) => {
  return [
    {
      title: 'Exercise Name',
      key: 'exercise_name',
      render(row: Partial<WorkoutTemplateExercise>, index: number) {
        return h(NInput, {
          value: row.exercise_name,
          onUpdateValue(v: string) {
            newTemplate.value.exercises[index].exercise_name = v;
          },
          placeholder: 'Exercise Name'
        });
      },
    },
    {
      title: 'Sets',
      key: 'sets',
      render(row: Partial<WorkoutTemplateExercise>, index: number) {
        return h(NInputNumber, {
          value: row.sets,
          onUpdateValue(v: number | null) {
            newTemplate.value.exercises[index].sets = v === null ? undefined : v;
          },
          placeholder: 'Sets'
        });
      },
    },
    {
      title: 'Reps',
      key: 'reps',
      render(row: Partial<WorkoutTemplateExercise>, index: number) {
        return h(NInput, {
          value: row.reps,
          onUpdateValue(v: string) {
            newTemplate.value.exercises[index].reps = v;
          },
          placeholder: 'e.g., 8-12'
        });
      },
    },
    {
      title: 'Notes',
      key: 'notes',
      render(row: Partial<WorkoutTemplateExercise>, index: number) {
        return h(NInput, {
          value: row.notes,
          onUpdateValue(v: string) {
            newTemplate.value.exercises[index].notes = v;
          },
          placeholder: 'Notes'
        });
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render(_: Partial<WorkoutTemplateExercise>, index: number) {
        return h(
          NButton,
          {
            strong: true,
            tertiary: true,
            size: 'small',
            type: 'error',
            onClick: () => remove(index),
          },
          { default: () => 'Remove' }
        );
      },
    },
  ];
};

const columns = createColumns({
  remove: (rowIndex: number) => {
    newTemplate.value.exercises.splice(rowIndex, 1);
  },
});

import { db } from '@/db';

async function loadTemplates() {
  templates.value = await db.getWorkoutTemplates();
}

function addExercise() {
  newTemplate.value.exercises.push({ exercise_name: '', sets: undefined, reps: '', notes: '' });
}

async function saveNewTemplate() {
  if (!newTemplate.value.name.trim()) {
    message.error('Please enter a template name.');
    return;
  }
  if (newTemplate.value.exercises.some(ex => !ex.exercise_name?.trim())) {
    message.error('All exercises must have a name.');
    return;
  }

  await db.addWorkoutTemplate(newTemplate.value);
  showAddTemplateModal.value = false;
  loadTemplates();
  message.success('Template created successfully!');
}

async function deleteTemplate(templateId: number) {
  await db.deleteWorkoutTemplate(templateId);
  loadTemplates();
  message.success('Template deleted successfully!');
}

onMounted(loadTemplates);
</script>
