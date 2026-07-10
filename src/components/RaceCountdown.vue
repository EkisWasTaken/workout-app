<template>
  <div v-if="upcomingRaces.length > 0" class="race-bar" :class="{ urgent: isUrgent }">
    <div v-if="nextRace" class="next-race">
      <span class="race-flag"><n-icon :component="FlagOutline" /></span>
      <span class="race-label">Next race</span>
      <span class="race-name">{{ nextRace.name }}</span>
      <span class="race-count" :class="{ urgent: isUrgent }">
        in {{ daysRemaining }} day{{ daysRemaining === 1 ? '' : 's' }}
      </span>
    </div>

    <div v-if="followingRaces.length > 0" class="race-chain">
      <span v-for="race in followingRaces" :key="race.id" class="chain-item">
        {{ race.name }} · {{ formatDateShort(race.date) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { NIcon } from 'naive-ui';
import { FlagOutline } from '@vicons/ionicons5';
import { db } from '@/db';
import type { RaceGoal } from '@/types';
import { differenceInSeconds, parseISO, startOfDay, addHours, format } from 'date-fns';

const raceGoals = ref<RaceGoal[]>([]);
const currentTime = ref(new Date());
let timer: any = null;

const fetchRaceGoals = async () => {
  try {
    const goals = await db.getRaceGoals();
    raceGoals.value = goals;
  } catch (error) {
    console.error('Failed to fetch race goals:', error);
  }
};

const upcomingRaces = computed(() => {
  return raceGoals.value
    .filter(goal => {
      const raceDate = addHours(startOfDay(parseISO(goal.date)), 12);
      return raceDate > currentTime.value;
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
});

const nextRace = computed(() => upcomingRaces.value[0]);
const followingRaces = computed(() => upcomingRaces.value.slice(1, 4));

const daysRemaining = computed(() => {
  if (!nextRace.value) return 0;
  const targetDate = addHours(startOfDay(parseISO(nextRace.value.date)), 12);
  const totalSeconds = differenceInSeconds(targetDate, currentTime.value);
  return totalSeconds <= 0 ? 0 : Math.floor(totalSeconds / (3600 * 24));
});

const isUrgent = computed(() => {
  if (!nextRace.value) return false;
  const targetDate = addHours(startOfDay(parseISO(nextRace.value.date)), 12);
  const totalSeconds = differenceInSeconds(targetDate, currentTime.value);
  return totalSeconds > 0 && totalSeconds < (7 * 24 * 3600); // Less than 7 days
});

const formatDateShort = (dateStr: string) => {
  return format(parseISO(dateStr), 'dd/MM');
};

onMounted(() => {
  fetchRaceGoals();
  window.addEventListener('race-goals-updated', fetchRaceGoals);
  // The bar only renders whole days; a minute is fine to catch midnight rollover.
  timer = setInterval(() => {
    currentTime.value = new Date();
  }, 60_000);
});

onUnmounted(() => {
  window.removeEventListener('race-goals-updated', fetchRaceGoals);
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.race-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 28px;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}
.race-bar.urgent { background: var(--danger-soft); }

.next-race { display: flex; align-items: center; gap: 10px; min-width: 0; }
.race-flag { display: flex; align-items: center; color: var(--primary-color); font-size: 1.1rem; }
.race-bar.urgent .race-flag { color: var(--danger-color); }
.race-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.race-name { font-weight: 600; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.race-count {
  font-size: 0.78rem; font-weight: 600; color: var(--primary-color);
  background: var(--primary-soft); padding: 4px 10px; border-radius: 999px; white-space: nowrap;
}
.race-count.urgent { color: var(--danger-color); background: transparent; }

.race-chain { display: flex; gap: 16px; color: var(--text-muted); font-size: 0.76rem; }

@media (max-width: 768px) {
  .race-bar { padding: 8px 16px; }
  .race-chain { display: none; }
  .race-label { display: none; }
}
</style>
