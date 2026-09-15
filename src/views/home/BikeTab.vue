<script setup lang="ts">
/**
 * Bike progress.
 *
 * Same shape as running — volume, consistency, longest, and fitness at a fixed
 * heart rate — because the question is the same and the answer should look the
 * same. Fitness is estimated power rather than speed per heartbeat: on a bike,
 * speed mostly reflects the route and the wind.
 */
import { computed } from 'vue'
import { BicycleOutline } from '@vicons/ionicons5'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import WeeklyBarsChart from '@/components/charts/WeeklyBarsChart.vue'
import { bike, bikeKmByWeek, bikeSessions, hrSettings, today } from '@/stats'
import { rollingWeeklyAverage, weekWindows } from '@/utils/progress'

const noHR = computed(() => hrSettings.value.maxHR === null)

const weeks = computed(() => weekWindows(12, today.value))
const rollingKm = computed(() =>
	rollingWeeklyAverage(bikeSessions.value, x => x.date, x => x.km, 12, today.value))
</script>

<template>
	<div class="stat-tab">
		<EmptyState
			v-if="!bike.hasData"
			:icon="BicycleOutline"
			title="No rides logged yet"
			body="Complete a bike session on your schedule, or import a .fit file from a head unit."
			action-label="Go to schedule"
			action-to="/schedule"
		/>

		<template v-else>
			<SectionHead title="Progress" note="last 28 days vs the 28 before" />
			<section class="metric-grid">
				<MetricCard v-for="m in bike.metrics" :key="m.key" :metric="m" />
			</section>

			<div v-if="noHR" class="stat-banner info">
				<span>
					Record rides with a heart rate monitor, or set your max HR in Profile, and power at a
					fixed heart rate starts tracking — the ride metric that shows fitness improving without
					needing a race or a test.
				</span>
			</div>

			<SectionHead title="Volume" note="last 12 weeks" />
			<section class="stat-panel stat-card">
				<div class="stat-head"><h3>Weekly distance</h3><span class="hint">km</span></div>
				<WeeklyBarsChart
					:labels="weeks.map(w => w.label)"
					:totals="bikeKmByWeek"
					:average="rollingKm"
					color="var(--color-bike-primary)"
					unit="km"
				/>
			</section>
		</template>
	</div>
</template>
