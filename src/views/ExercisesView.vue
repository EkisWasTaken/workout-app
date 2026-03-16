<template>
  <div class="exercises-view-wrapper">
    <div style="padding: 16px; width: 100%">
      <h1>Exercise Library</h1>
      <n-collapse accordion v-if="groupedExercises.length > 0" style="width: 100%">
        <n-collapse-item v-for="group in groupedExercises" :key="group.body_part" :title="group.body_part">
          <n-list bordered>
            <n-list-item v-for="exercise in group.exercises" :key="exercise.id">
              <div class="exercise-item">
                <n-popover trigger="hover" placement="bottom">
                  <template #trigger>
                    <n-thing :title="exercise.name" />
                  </template>
                  <div class="body-part-icon">
                    {{ exercise.body_part }}
                  </div>
                </n-popover>
              </div>
            </n-list-item>
          </n-list>
        </n-collapse-item>
      </n-collapse>
      <div v-else>
        <p>No exercises found.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { NCollapse, NCollapseItem, NList, NListItem, NThing, NPopover } from 'naive-ui';
import { db } from '@/db';
import type { Exercise } from '../types';

const exercises = ref<Exercise[]>([]);

const groupedExercises = computed(() => {
  const groups: { [key: string]: { body_part: string, exercises: Exercise[] } } = {};
  for (const exercise of exercises.value) {
    if (!groups[exercise.body_part]) {
      groups[exercise.body_part] = {
        body_part: exercise.body_part,
        exercises: [],
      };
    }
    groups[exercise.body_part].exercises.push(exercise);
  }
  return Object.values(groups);
});

async function loadExercises() {
  const data = await db.getExercises();
  console.log('Fetched exercises:', data);
  exercises.value = data;
}

onMounted(loadExercises);
</script>

<style scoped>
.exercise-item {
  width: 100%;
}

.body-part-icon {
  width: 50px;
  height: 50px;
  border: 1px solid #ccc;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
  padding: 2px;
}
</style>
