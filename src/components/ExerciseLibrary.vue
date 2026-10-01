<template>
  <div class="exercise-library">
    <header class="ex-head">
      <p class="hint">
        Exercise names, grouped by body part. They're suggested when you add exercises to a
        gym template, so the same lift is always written the same way. Open one to see which
        of your templates use it.
      </p>
      <n-input v-model:value="query" placeholder="Search exercises" clearable class="ex-search" />
    </header>

    <div v-if="loading" class="ex-state">Loading…</div>
    <div v-else-if="failed" class="ex-state">Couldn't load the exercise library. Check your connection and refresh.</div>
    <div v-else-if="!exercises.length && !customNames.length" class="ex-state">The exercise library is empty.</div>

    <template v-else>
      <!-- Filters: body part chips, plus "only the ones I use". -->
      <div class="ex-filters">
        <div class="ex-chips" role="radiogroup" aria-label="Body part">
          <button
            v-for="part in partOptions"
            :key="part.value"
            class="ex-chip"
            :class="{ on: bodyPart === part.value }"
            role="radio"
            :aria-checked="bodyPart === part.value"
            @click="bodyPart = part.value"
          >
            {{ part.label }}<span class="ex-chip-count">{{ part.count }}</span>
          </button>
        </div>
        <label class="ex-toggle">
          <n-switch v-model:value="onlyUsed" size="small" />
          <span>Only in my templates</span>
        </label>
      </div>

      <p class="ex-summary">
        {{ exercises.length }} in the library ·
        <strong>{{ usedCount }}</strong> used in your templates
        <template v-if="customNames.length">
          · {{ customNames.length }} of your own
        </template>
      </p>

      <div v-if="!groups.length" class="ex-state">
        <template v-if="query">No exercises match "{{ query }}".</template>
        <template v-else-if="onlyUsed">
          None of your templates use an exercise from this group yet.
          <button class="ex-link" @click="emit('new-template')">Build a gym template</button>
        </template>
        <template v-else>Nothing here.</template>
      </div>

      <section v-else class="ex-grid">
        <div v-for="group in groups" :key="group.bodyPart" class="ex-group" :class="{ custom: group.custom }">
          <div class="ex-group-head">
            <h2>{{ group.bodyPart }}</h2>
            <span class="ex-count">{{ group.items.length }}</span>
          </div>
          <p v-if="group.custom" class="ex-custom-note">
            Names in your templates that aren't in the library. A typo here splits one lift
            into two — rename it in the template to match the library.
          </p>
          <ul>
            <li v-for="item in group.items" :key="item.key">
              <button
                class="ex-row"
                :class="{ open: openKey === item.key, used: item.uses.length }"
                :aria-expanded="openKey === item.key"
                @click="toggle(item.key)"
              >
                <span class="ex-name">{{ item.name }}</span>
                <span v-if="item.uses.length" class="ex-uses" :title="`In ${item.uses.length} of your templates`">
                  {{ item.uses.length }}
                </span>
              </button>
              <div v-if="openKey === item.key" class="ex-detail">
                <template v-if="item.uses.length">
                  <button
                    v-for="use in item.uses"
                    :key="use.templateId"
                    class="ex-use"
                    title="Edit this template"
                    @click="emit('open-template', use.templateId)"
                  >
                    <span class="ex-use-name">{{ use.templateName }}</span>
                    <span v-if="use.prescription" class="ex-use-rx mono">{{ use.prescription }}</span>
                  </button>
                </template>
                <span v-else class="ex-none">
                  Not in any of your templates.
                  <button class="ex-link" @click="emit('show-templates')">Add it to one</button>
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * The exercise library, as the second tab of Templates. Templates already loads
 * the library, the templates and their exercise lists, so they come in as props
 * rather than being fetched twice.
 */
import { computed, ref } from 'vue';
import { NInput, NSwitch } from 'naive-ui';
import { auth } from '@/auth';
import type { Exercise, WorkoutTemplate, WorkoutTemplateExercise } from '@/types';

const props = defineProps<{
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  templateExercises: Record<number, WorkoutTemplateExercise[]>;
  loading: boolean;
  failed: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-template', id: number): void;
  (e: 'new-template'): void;
  (e: 'show-templates'): void;
}>();

interface Use { templateId: number; templateName: string; prescription: string }
interface Item { key: string; name: string; uses: Use[] }

const ALL = '__all__';
const CUSTOM = 'Your own';

const query = ref('');
const bodyPart = ref(ALL);
const onlyUsed = ref(false);
const openKey = ref<string | null>(null);

/** Names compare loosely, so "Bench press" in a template matches "Bench Press". */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Your own templates' uses of each exercise, keyed by normalised name. */
const usesByName = computed(() => {
  const mine = new Map(
    props.templates
      .filter(t => (t.kind ?? 'gym') === 'gym' && (!t.user_id || t.user_id === auth.user?.id))
      .map(t => [t.id, t]),
  );
  const map = new Map<string, { name: string; uses: Use[] }>();
  for (const [id, rows] of Object.entries(props.templateExercises)) {
    const t = mine.get(Number(id));
    if (!t) continue;
    for (const row of rows) {
      const key = norm(row.exercise_name || '');
      if (!key) continue;
      const entry = map.get(key) ?? { name: row.exercise_name.trim(), uses: [] };
      // One template listing a lift twice (warm-up + working sets) still counts once.
      if (!entry.uses.some(u => u.templateId === t.id)) {
        const rx = [row.sets ? `${row.sets}×` : '', row.reps ?? ''].join('').trim();
        entry.uses.push({ templateId: t.id, templateName: t.name, prescription: rx === '×' ? '' : rx });
      }
      map.set(key, entry);
    }
  }
  return map;
});

const libraryKeys = computed(() => new Set(props.exercises.map(e => norm(e.name))));

/** Exercises your templates use that the library doesn't know. */
const customNames = computed(() =>
  [...usesByName.value.entries()].filter(([key]) => !libraryKeys.value.has(key)));

/** Everything, grouped by body part, before the filters. */
const allGroups = computed(() => {
  const map = new Map<string, Item[]>();
  for (const e of props.exercises) {
    const part = e.body_part || 'Other';
    const item: Item = { key: `lib-${e.id}`, name: e.name, uses: usesByName.value.get(norm(e.name))?.uses ?? [] };
    const list = map.get(part);
    if (list) list.push(item);
    else map.set(part, [item]);
  }
  const groups = [...map.entries()]
    .map(([part, items]) => ({ bodyPart: part, custom: false, items }))
    .sort((a, b) => a.bodyPart.localeCompare(b.bodyPart));
  if (customNames.value.length) {
    groups.push({
      bodyPart: CUSTOM,
      custom: true,
      items: customNames.value.map(([key, v]) => ({ key: `own-${key}`, name: v.name, uses: v.uses })),
    });
  }
  for (const g of groups) g.items.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
});

const usedCount = computed(() =>
  props.exercises.filter(e => usesByName.value.has(norm(e.name))).length);

const partOptions = computed(() => [
  { value: ALL, label: 'All', count: allGroups.value.reduce((n, g) => n + g.items.length, 0) },
  ...allGroups.value.map(g => ({ value: g.bodyPart, label: g.bodyPart, count: g.items.length })),
]);

const groups = computed(() => {
  const q = query.value.trim().toLowerCase();
  return allGroups.value
    .filter(g => bodyPart.value === ALL || g.bodyPart === bodyPart.value)
    .map(g => ({
      ...g,
      items: g.items.filter(item =>
        (!onlyUsed.value || item.uses.length) &&
        (!q || item.name.toLowerCase().includes(q) || g.bodyPart.toLowerCase().includes(q))),
    }))
    .filter(g => g.items.length);
});

function toggle(key: string) {
  openKey.value = openKey.value === key ? null : key;
}
</script>

<style scoped>

.ex-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.hint { font-size: 0.82rem; color: var(--text-muted); margin: 0; line-height: 1.5; max-width: 560px; }
.ex-search { width: 240px; }
@media (max-width: 600px) { .ex-search { width: 100%; } }

.ex-state { padding: 48px 0; text-align: center; color: var(--text-muted); font-size: 0.88rem; line-height: 1.6; }
.ex-link {
  border: none; background: none; padding: 0; margin-left: 4px; cursor: pointer;
  font: inherit; color: var(--primary-color); text-decoration: underline; text-underline-offset: 2px;
}

.ex-filters { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.ex-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.ex-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: 999px;
  border: 1px solid var(--border-color); background: var(--surface-color);
  color: var(--text-secondary); font: inherit; font-size: 0.8rem;
  text-transform: capitalize; cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.ex-chip:hover { color: var(--text-color); }
.ex-chip.on { background: var(--primary-soft); border-color: var(--primary-color); color: var(--primary-color); font-weight: 600; }
.ex-chip-count { font-family: var(--font-mono); font-size: 0.7rem; opacity: 0.7; }
.ex-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; }

.ex-summary { font-size: 0.78rem; color: var(--text-muted); margin: 0 0 14px; }
.ex-summary strong { color: var(--primary-color); }

.ex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; align-items: start; }
.ex-group {
  background: var(--surface-color); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 12px 14px;
}
.ex-group.custom { border-style: dashed; }
.ex-group-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.ex-group-head h2 { font-size: 0.9rem; font-weight: 600; font-family: var(--font-family); margin: 0; text-transform: capitalize; }
.ex-count { font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); }
.ex-custom-note { font-size: 0.74rem; color: var(--text-muted); line-height: 1.45; margin: 0 0 6px; }

.ex-group ul { list-style: none; margin: 0; padding: 0; }
.ex-group li { border-top: 1px solid var(--border-subtle, var(--border-color)); }
.ex-group li:first-child { border-top: none; }

.ex-row {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  width: 100%; padding: 6px 0; border: none; background: none;
  font: inherit; font-size: 0.84rem; color: var(--text-secondary);
  text-align: left; cursor: pointer;
}
.ex-row:hover, .ex-row.open { color: var(--text-color); }
.ex-row.used .ex-name { color: var(--text-color); }
.ex-row:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
.ex-uses {
  flex-shrink: 0; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; background: var(--primary-soft); color: var(--primary-color);
  font-size: 0.68rem; font-weight: 700; font-family: var(--font-mono);
}

.ex-detail { display: flex; flex-direction: column; gap: 2px; padding: 0 0 8px; }
.ex-use {
  display: flex; justify-content: space-between; gap: 8px; width: 100%;
  padding: 5px 8px; border: none; border-radius: var(--radius-sm);
  background: var(--surface-2); color: var(--text-color);
  font: inherit; font-size: 0.78rem; text-align: left; cursor: pointer;
}
.ex-use:hover { background: var(--surface-hover); }
.ex-use-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ex-use-rx { flex-shrink: 0; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.72rem; }
.ex-none { font-size: 0.76rem; color: var(--text-muted); }
</style>
