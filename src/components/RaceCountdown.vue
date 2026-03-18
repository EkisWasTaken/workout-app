<template>
  <div v-if="upcomingRaces.length > 0" class="race-countdown-container glitch-alive">
    <!-- Next Event (Main Highlight) -->
    <div v-if="nextRace" class="next-race-detailed">
      <div class="countdown-label">NEXT_EVENT:</div>
      <div class="race-info">
        <span class="race-name">{{ nextRace.name.toUpperCase() }}</span>
        <div class="countdown-precision" :class="{ 'urgent': isUrgent }">
          T-MINUS {{ countdown.days }}D:{{ countdown.hours }}H:{{ countdown.minutes }}M:{{ countdown.seconds }}S
        </div>
      </div>
    </div>

    <!-- Event Chain (Following 3) -->
    <div v-if="followingRaces.length > 0" class="race-chain">
      <div v-for="race in followingRaces" :key="race.id" class="chain-item">
        <span class="chain-prompt">>></span>
        <span class="chain-name">{{ race.name.toUpperCase() }}</span>
        <span class="chain-date">{{ formatDateShort(race.date) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
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

const countdown = computed(() => {
  if (!nextRace.value) return { days: '00', hours: '00', minutes: '00', seconds: '00' };
  
  const targetDate = addHours(startOfDay(parseISO(nextRace.value.date)), 12);
  const totalSeconds = differenceInSeconds(targetDate, currentTime.value);
  
  if (totalSeconds <= 0) return { days: '00', hours: '00', minutes: '00', seconds: '00' };

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0')
  };
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
  timer = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  window.removeEventListener('race-goals-updated', fetchRaceGoals);
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.race-countdown-container {
  display: flex;
  flex-direction: column;
  padding: 8px 15px;
  background: rgba(0, 0, 0, 0.9);
  border-bottom: 1px solid var(--border-color);
  font-family: 'Courier New', Courier, monospace;
}

.next-race-detailed {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 4px;
}

.countdown-label {
  color: var(--accent-color);
  font-weight: bold;
  font-size: 0.75rem;
  opacity: 0.8;
}

.race-info {
  display: flex;
  gap: 15px;
  align-items: center;
  flex: 1;
}

.race-name {
  color: #fff;
  font-size: 1rem;
  letter-spacing: 1px;
  font-weight: bold;
}

.countdown-precision {
  color: var(--accent-color);
  font-size: 1.1rem;
  font-weight: bold;
  text-shadow: 0 0 8px var(--glow-color);
  letter-spacing: 1.5px;
}

.countdown-precision.urgent {
  color: #ff3e3e;
  text-shadow: 0 0 10px rgba(255, 62, 62, 0.8);
  animation: flicker-urgent 1.5s infinite;
}

.race-chain {
  display: flex;
  gap: 20px;
  margin-left: 100px;
  opacity: 0.6;
}

.chain-item {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: 0.75rem;
  color: #aaa;
}

.chain-prompt {
  color: var(--accent-color);
}

.chain-name {
  color: #eee;
}

.chain-date {
  color: #888;
  font-size: 0.65rem;
}

@keyframes flicker-urgent {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@media (max-width: 1024px) {
  .race-chain {
    margin-left: 0;
    flex-wrap: wrap;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .race-countdown-container {
    padding: 5px 10px;
  }
  .next-race-detailed {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .race-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .countdown-precision {
    font-size: 0.9rem;
  }
  .race-chain {
    display: none; /* Hide chain on mobile to save space */
  }
}
</style>
