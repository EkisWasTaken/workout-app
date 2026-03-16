<template>
	<n-card class="workout-card" hoverable>
		<template #header>
			<div class="card-header" @click="navigateToDetail">
				<n-text strong>{{ workout.name }}</n-text>
				<n-tag :type="workout.type?.toLowerCase() === 'running' ? 'success' : 'default'" size="small">
					{{ workout.type }}
				</n-tag>
			</div>
		</template>

		<div v-if="loading" class="loading-container">
			<n-spin size="small" />
		</div>

		<div v-if="workout.type?.toLowerCase() === 'running' && stravaActivity && !stravaActivity.error">
			<div ref="mapContainer" class="map-container"></div>
			<n-space justify="space-around" class="stats-container">
				<n-statistic label="Duration" :value="formatDuration(stravaActivity.moving_time)" />
				<n-statistic label="Distance" :value="`${(stravaActivity.distance / 1000).toFixed(2)} km`" />
				<n-statistic label="Pace" :value="calculatePace(stravaActivity.moving_time, stravaActivity.distance)" />
			</n-space>
			<n-space justify="space-around" class="stats-container"
				v-if="stravaActivity.calories || stravaActivity.average_heartrate || stravaActivity.total_elevation_gain">
				<n-statistic v-if="stravaActivity.calories" label="Calories"
					:value="stravaActivity.calories.toFixed(0)" />
				<n-statistic v-if="stravaActivity.average_heartrate" label="Avg HR"
					:value="stravaActivity.average_heartrate.toFixed(0)" />
				<n-statistic v-if="stravaActivity.total_elevation_gain" label="Elevation"
					:value="`${stravaActivity.total_elevation_gain.toFixed(0)} m`" />
			</n-space>
		</div>

        <div v-else-if="stravaActivity && stravaActivity.error" class="error-container">
            <n-alert title="STRAVA_SYNC_ISSUE" type="warning" size="small">
                {{ stravaActivity.details?.message || 'FAILED_TO_LOAD_DATA' }}
            </n-alert>
        </div>

		<div v-else-if="workout.type === 'gym'">
			<n-text><strong>Date:</strong> {{ workout.date }}</n-text>
			<br>
			<n-text><strong>Gym Type:</strong> {{ workout.gymType }}</n-text>
		</div>

		<template #footer>
			<n-text :depth="3" style="font-size: 0.8rem;">Completed on: {{ new Date(workout.date).toLocaleDateString()
				}}</n-text>
		</template>
	</n-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, PropType } from 'vue'
import { useRouter } from 'router' // Note: This might need adjustment if your router import is different, but following local convention
import { useRouter as useVueRouter } from 'vue-router'
const router = useVueRouter()

import { NCard, NTag, NText, NSpace, NStatistic, NSpin, NAlert } from 'naive-ui'
import L from 'leaflet'
import 'leaflet-polylinedecorator'
import { decode } from '@mapbox/polyline'
import type { Workout, StravaActivity } from '../types' // Import shared types


const props = defineProps({
	workout: {
		type: Object as PropType<Workout>,
		required: true
	}
})

const stravaActivity = ref<any>(null)
const loading = ref(false)
const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null;

const navigateToDetail = () => {
	router.push({ name: 'WorkoutDetail', params: { id: props.workout.id } })
}

const initMap = async () => {
    const polylineStr = stravaActivity.value?.map?.polyline || stravaActivity.value?.map?.summary_polyline;
	if (polylineStr) {
		await nextTick();

		if (mapContainer.value) {
			const decodedPolyline = decode(polylineStr);
			if (decodedPolyline.length > 0) {
				if (map) map.remove();
				map = L.map(mapContainer.value);
				map.scrollWheelZoom.disable(); // Disable scroll wheel zoom
				L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
				}).addTo(map);

				const polyline = L.polyline(decodedPolyline, { color: '#fc5100', smoothFactor: 3, weight: 4 }).addTo(map);

				const decorator = L.polylineDecorator(polyline, {
					patterns: [
						{
							offset: '5%',
							repeat: '15%',
							symbol: L.Symbol.arrowHead({
								pixelSize: 12,
								polygon: false,
								pathOptions: {
									stroke: true,
									color: '#FF8C00',
									weight: 2
								}
							})
						}
					]
				});

				const zoomThreshold = 13;
				const updateDecoratorVisibility = () => {
					if (map && map.getZoom() > zoomThreshold) {
						if (!map.hasLayer(decorator)) {
							decorator.addTo(map);
						}
					} else {
						if (map && map.hasLayer(decorator)) {
							decorator.removeFrom(map);
						}
					}
				};

				map.on('zoomend', updateDecoratorVisibility);
				updateDecoratorVisibility(); // Initial check

				map.fitBounds(polyline.getBounds());
			}
		}
	}
};

const formatDuration = (seconds: number): string => {
    if (!seconds) return '0s';
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
};

const calculatePace = (time: number, distance: number): string => {
	if (!distance || distance === 0) return '0:00 /km';
	const pace = time / (distance / 1000);
	const minutes = Math.floor(pace / 60);
	const seconds = Math.floor(pace % 60);
	return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

onMounted(async () => {
	if (props.workout.type?.toLowerCase() === 'running' && props.workout.stravaActivityId) {
		loading.value = true;
		try {
			const result = await window.stravaApi.getStravaActivityById(props.workout.stravaActivityId.toString());
            stravaActivity.value = result;
            if (result && !result.error) {
			    await initMap();
            }
		} catch (error) {
			console.error('Failed to fetch Strava data for workout card:', error);
		} finally {
			loading.value = false;
		}
	}
})

onUnmounted(() => {
	if (map) {
		map.remove();
	}
});
</script>

<style scoped>
.workout-card {
	margin-bottom: 16px;
	width: 100%;
}

@media (min-width: 769px) {
	.workout-card {
		max-width: 500px;
	}
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	cursor: pointer;
}

.map-container {
	height: 200px;
	margin-bottom: 12px;
	border-radius: 4px;
}

.stats-container {
	padding-top: 8px;
	flex-wrap: wrap;
}

/* Adjust Naive UI Statistic for smaller screens */
:deep(.n-statistic .n-statistic-value) {
	font-size: 1.1rem !important;
}

:deep(.n-statistic .n-statistic-label) {
	font-size: 0.7rem !important;
}

.loading-container {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100px;
}

.error-container {
    margin: 12px 0;
}
</style>
