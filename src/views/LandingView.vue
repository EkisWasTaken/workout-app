<template>
	<div class="landing-view-container">
		<n-page-header>
			<template #title>
				<typewriter-header text="WORKOUT FEED" tag="h1" />
			</template>
		</n-page-header>
		<div class="feed-scroll-area">
			<n-spin :show="loading && workouts.length === 0">
				<div v-if="workouts.length > 0" class="feed-container two-column-feed">
					<div class="feed-column running-column">
						<typewriter-header text="RUNNING WORKOUTS" tag="h2" :delay="500" />
						<workout-feed-card v-for="workout in runningWorkouts" :key="workout.id" :workout="workout" />
						<n-empty v-if="runningWorkouts.length === 0" description="No running workouts." />
					</div>
					<div class="feed-column other-column">
						<typewriter-header text="OTHER WORKOUTS" tag="h2" :delay="800" />
						<workout-feed-card v-for="workout in otherWorkouts" :key="workout.id" :workout="workout" />
						<n-empty v-if="otherWorkouts.length === 0" description="No other workouts." />
					</div>
				</div>
				<n-empty v-else-if="!loading" description="No completed workouts yet. Go get one done!" />

                <div v-if="workouts.length > 0" class="load-more-container">
                    <n-button 
                        @click="loadMore" 
                        :loading="loading" 
                        :disabled="noMoreWorkouts"
                        ghost
                        type="primary"
                        class="load-more-btn"
                    >
                        {{ noMoreWorkouts ? 'END_OF_STREAM' : 'LOAD_MORE_ACTIVITIES' }}
                    </n-button>
                </div>
			</n-spin>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NPageHeader, NSpin, NEmpty, NButton } from 'naive-ui'
import { db } from '@/db'
import WorkoutFeedCard from '../components/WorkoutFeedCard.vue'
import TypewriterHeader from '../components/TypewriterHeader.vue'
import type { Workout } from '../types'; // Import Workout from shared types

const workouts = ref<Workout[]>([])
const loading = ref(false)
const limit = 10
const offset = ref(0)
const noMoreWorkouts = ref(false)

const getWorkoutType = (workout: Workout): 'gym' | 'running' | 'rest' | 'other' => {
	if (workout.type) {
		const typeLower = workout.type.toLowerCase();
		if (typeLower === 'gym') return 'gym';
		if (typeLower === 'running') return 'running';
		if (typeLower === 'rest day' || typeLower === 'rest') return 'rest';
		if (typeLower === 'other') return 'other';
	}
	const nameLower = workout.name.toLowerCase();
	if (nameLower.includes('gym') || nameLower.includes('strength') || nameLower.includes('weights')) {
		return 'gym';
	} else if (nameLower.includes('run') || nameLower.includes('running') || nameLower.includes('jog')) {
		return 'running';
	} else if (nameLower.includes('rest')) {
		return 'rest';
	}
	return 'other';
};

const runningWorkouts = computed(() => {
	return workouts.value.filter(workout => getWorkoutType(workout) === 'running');
});

const otherWorkouts = computed(() => {
	return workouts.value.filter(workout => getWorkoutType(workout) !== 'running');
});

async function loadWorkouts() {
    if (loading.value || noMoreWorkouts.value) return;
    
    loading.value = true;
    try {
        const newWorkouts = await db.getCompletedWorkouts(limit, offset.value);
        if (newWorkouts && newWorkouts.length > 0) {
            workouts.value.push(...newWorkouts);
            offset.value += limit;
            if (newWorkouts.length < limit) {
                noMoreWorkouts.value = true;
            }
        } else {
            noMoreWorkouts.value = true;
        }
    } catch (error) {
        console.error('Failed to load workout feed:', error);
    } finally {
        loading.value = false;
    }
}

async function loadMore() {
    await loadWorkouts();
}

onMounted(async () => {
    await loadWorkouts();
});
</script>

<style scoped>
.landing-view-container {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	padding: 16px;
	box-sizing: border-box;
}

@media (min-width: 769px) {
	.landing-view-container {
		padding: 24px;
	}
}

:deep(.n-page-header-header) {
	flex-wrap: wrap;
}

.load-more-container {
    display: flex;
    justify-content: center;
    padding: 24px 0;
    width: 100%;
}

.load-more-btn {
    font-family: var(--font-family);
    letter-spacing: 2px;
}

.feed-container.two-column-feed {
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;
	padding: 8px 0;
}

@media (min-width: 768px) {
	.feed-container.two-column-feed {
		grid-template-columns: 1fr 1fr;
		width: 100%;
		padding: 16px;
	}
}

.feed-column {
	display: flex;
	flex-direction: column;
	gap: 16px;
}
</style>
