<template>
  <div class="exercises-view">
    <header class="ex-head">
      <div>
        <h1 class="page-title">Exercises</h1>
        <p class="hint">
          The exercise library, grouped by body part. These names are suggested when you add
          exercises to a gym template, so the same lift is always logged the same way.
        </p>
      </div>
      <n-input v-model:value="query" placeholder="Search exercises" clearable class="ex-search" />
    </header>

    <div v-if="loading" class="ex-state">Loading…</div>
    <div v-else-if="failed" class="ex-state">Couldn't load the exercise library. Check your connection and refresh.</div>
    <div v-else-if="!exercises.length" class="ex-state">The exercise library is empty.</div>
    <div v-else-if="!groups.length" class="ex-state">No exercises match "{{ query }}".</div>

    <section v-else class="ex-grid">
      <div v-for="group in groups" :key="group.bodyPart" class="ex-group">
        <div class="ex-group-head">
          <h2>{{ group.bodyPart }}</h2>
          <span class="ex-count">{{ group.exercises.length }}</span>
        </div>
        <ul>
          <li v-for="exercise in group.exercises" :key="exercise.id">{{ exercise.name }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NInput } from 'naive-ui';
import { db } from '@/db';
import type { Exercise } from '../types';

const exercises = ref<Exercise[]>([]);
const loading = ref(true);
const failed = ref(false);
const query = ref('');

const groups = computed(() => {
  const q = query.value.trim().toLowerCase();
  const map = new Map<string, Exercise[]>();
  for (const e of exercises.value) {
    if (q && !e.name.toLowerCase().includes(q) && !e.body_part.toLowerCase().includes(q)) continue;
    const key = e.body_part || 'Other';
    const list = map.get(key);
    if (list) list.push(e);
    else map.set(key, [e]);
  }
  return [...map.entries()]
    .map(([bodyPart, list]) => ({ bodyPart, exercises: list.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.bodyPart.localeCompare(b.bodyPart));
});

onMounted(async () => {
  try {
    exercises.value = await db.getExercises();
  } catch (e) {
    console.error('Failed to load exercises', e);
    failed.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.exercises-view { padding: 24px 28px 40px; max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .exercises-view { padding: 16px 16px 32px; } }

.ex-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.page-title { margin: 0; }
.hint { font-size: 0.82rem; color: var(--text-muted); margin: 6px 0 0; line-height: 1.5; max-width: 560px; }
.ex-search { width: 240px; }
@media (max-width: 600px) { .ex-search { width: 100%; } }

.ex-state { padding: 48px 0; text-align: center; color: var(--text-muted); font-size: 0.88rem; }

.ex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; align-items: start; }
.ex-group {
  background: var(--surface-color); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 12px 14px;
}
.ex-group-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.ex-group-head h2 { font-size: 0.9rem; font-weight: 600; font-family: var(--font-family); margin: 0; text-transform: capitalize; }
.ex-count { font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); }
.ex-group ul { list-style: none; margin: 0; padding: 0; }
.ex-group li { font-size: 0.84rem; color: var(--text-secondary); padding: 5px 0; border-top: 1px solid var(--border-subtle, var(--border-color)); }
.ex-group li:first-child { border-top: none; }
</style>
