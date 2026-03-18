<template>
  <div v-if="nextRace" class="race-countdown glitch-alive">
    <div class="countdown-label">NEXT_EVENT:</div>
    <div class="race-info">
      <span class="race-name">{{ nextRace.name.toUpperCase() }}</span>
      <span class="countdown-days" :class="{ 'urgent': daysRemaining <= 7 }">
        T-MINUS {{ daysRemaining }} DAYS
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { db } from '@/db';
import type { RaceGoal } from '@/types';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

const raceGoals = ref<RaceGoal[]>([]);

const fetchRaceGoals = async () => {
  try {
    const goals = await db.getRaceGoals();
    raceGoals.value = goals;
  } catch (error) {
    console.error('Failed to fetch race goals:', error);
  }
};

const nextRace = computed(() => {
  const today = startOfDay(new Date());
  return raceGoals.value
    .filter(goal => startOfDay(parseISO(goal.date)) >= today)
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0];
});

const daysRemaining = computed(() => {
  if (!nextRace.value) return 0;
  const today = startOfDay(new Date());
  const raceDate = startOfDay(parseISO(nextRace.value.date));
  return differenceInDays(raceDate, today);
});

onMounted(() => {
  fetchRaceGoals();
  window.addEventListener('race-goals-updated', fetchRaceGoals);
});

onUnmounted(() => {
  window.removeEventListener('race-goals-updated', fetchRaceGoals);
});
</script>

<style scoped>
.race-countdown {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 5px 15px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid var(--border-color);
  margin: 10px;
  font-family: 'Courier New', Courier, monospace;
}

.countdown-label {
  color: var(--accent-color);
  font-weight: bold;
  font-size: 0.8rem;
}

.race-info {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.race-name {
  color: #fff;
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.countdown-days {
  color: var(--accent-color);
  font-size: 1rem;
  font-weight: bold;
  text-shadow: 0 0 5px var(--glow-color);
}

.countdown-days.urgent {
  color: #ff3e3e;
  text-shadow: 0 0 8px rgba(255, 62, 62, 0.6);
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 1; }
  to { opacity: 0.7; }
}

@media (max-width: 768px) {
  .race-countdown {
    margin: 5px;
    padding: 3px 10px;
    font-size: 0.7rem;
  }
  .countdown-days {
    font-size: 0.8rem;
  }
}
</style>
