<script setup lang="ts">
/**
 * Bike progress.
 *
 * Same shape as running — efficiency, volume, climbing, longest ride — because
 * the question is the same and the answer should look the same. Cycling was
 * previously counted into the "distance this week" headline and then ignored by
 * every other statistic on the page.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { BicycleOutline } from '@vicons/ionicons5'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import { baseOpts, useCharts } from '@/utils/chartTheme'
import { getSportColor } from '@/utils/workouts'
import { bike, bikeKmByWeek, hrSettings, today } from '@/stats'
import { weekWindows } from '@/utils/progress'

const { add, destroy } = useCharts()
const volumeCanvas = ref<HTMLCanvasElement | null>(null)

const noHR = computed(() => hrSettings.value.maxHR === null)

function buildVolume() {
	if (!volumeCanvas.value) return
	const weeks = weekWindows(12, today.value)
	add(new Chart(volumeCanvas.value, {
		type: 'bar',
		data: {
			labels: weeks.map(w => w.label),
			datasets: [{
				label: 'Bike',
				data: bikeKmByWeek.value,
				backgroundColor: getSportColor('bike'),
				borderRadius: 4,
				maxBarThickness: 18,
			}],
		},
		options: baseOpts('km'),
	}))
}

async function buildAll() {
	destroy()
	await nextTick()
	buildVolume()
}

onMounted(buildAll)
watch(bike, buildAll)
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
					Record rides with a heart rate monitor, or set your max HR in Profile, and aerobic
					efficiency starts tracking — that's the ride metric that shows fitness improving
					without needing a race or a test.
				</span>
			</div>

			<SectionHead title="Volume" note="last 12 weeks" />
			<section class="stat-panel stat-card">
				<div class="stat-head"><h3>Weekly distance</h3><span class="hint">km</span></div>
				<div class="stat-chart"><canvas ref="volumeCanvas"></canvas></div>
			</section>
		</template>
	</div>
</template>
