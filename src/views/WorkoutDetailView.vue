<template>
	<div class="workout-detail-wrapper">
		<div class="container">
			<n-page-header @back="handleBack">
				<template #title>
					Workout Details
				</template>
			</n-page-header>
			<n-spin :show="loading">
				<n-space vertical v-if="workout" class="workout-details-space" style="width: 100%">
					<n-card class="card" :title="workout.name" style="width: 100%">

						<n-grid :x-gap="24" :y-gap="24" :cols="4">
							<n-gi>
								<n-statistic label="Type" :value="workout.type" />
							</n-gi>
							<n-gi>
								<n-statistic label="Date" :value="workout.date" />
							</n-gi>
							<n-gi>
								<n-statistic label="Status">
									<n-tag :type="workout.isCompleted ? 'success' : 'error'">
										{{ workout.isCompleted ? 'Completed' : 'Incomplete' }}
									</n-tag>
								</n-statistic>
							</n-gi>
							<n-gi v-if="workout.duration">
								<n-statistic label="Planned Duration" :value="`${workout.duration} min`" />
							</n-gi>
							<n-gi v-if="workout.gymType">
								<n-statistic label="Gym Type" :value="workout.gymType" />
							</n-gi>
							<n-gi v-if="workout.targetPace">
								<n-statistic label="Target Pace" :value="workout.targetPace" />
							</n-gi>
							<n-gi v-if="workout.distance">
								<n-statistic label="Distance" :value="`${workout.distance} km`" />
							</n-gi>
						</n-grid>
					</n-card>

					<n-card class="card" v-if="workout.isCompleted" title="Completion Stats">
						<n-grid :x-gap="24" :y-gap="24" :cols="4">
							<n-gi v-if="workout.actualDuration">
								<n-statistic label="Actual Duration" :value="`${workout.actualDuration} min`" />
							</n-gi>
							<n-gi v-if="workout.totalWeightLifted">
								<n-statistic label="Total Weight Lifted" :value="`${workout.totalWeightLifted} kg`" />
							</n-gi>
							<n-gi v-if="workout.rpe">
								<n-statistic label="RPE" :value="workout.rpe" />
							</n-gi>
							<n-gi v-if="workout.notes">
								<n-statistic label="Notes" :value="workout.notes" />
							</n-gi>
						</n-grid>
					</n-card>
					
					<n-card class="card" v-if="stravaActivity" :title="stravaActivity.name" size="large">
						<template #header-extra>
							{{ new
								Date(stravaActivity.start_date_local).toLocaleString() }}
						</template>
						<div v-if="stravaActivity.map?.polyline" ref="mapContainer"
							style="height: 400px; margin-top: 16px; border-radius: 10px;"></div>

						<n-grid :x-gap="24" :y-gap="24" :cols="3" class="stats-container">
							<n-gi>
								<n-statistic label="Distance" :value="`${(stravaActivity.distance / 1000).toFixed(2)} km`" />
							</n-gi>
							<n-gi>
								<n-statistic label="Duration" :value="formatDuration(stravaActivity.moving_time)" />
							</n-gi>
							<n-gi>
								<n-statistic label="Pace"
									:value="calculatePace(stravaActivity.moving_time, stravaActivity.distance)" />
							</n-gi>
							<n-gi v-if="stravaActivity.calories">
								<n-statistic label="Calories Burned" :value="stravaActivity.calories.toFixed(0)" />
							</n-gi>
							<n-gi v-if="stravaActivity.average_heartrate">
								<n-statistic label="Avg Heart Rate"
									:value="`${stravaActivity.average_heartrate.toFixed(0)} bpm`" />
							</n-gi>
							<n-gi v-if="stravaActivity.total_elevation_gain">
								<n-statistic label="Elevation Gain"
									:value="`${stravaActivity.total_elevation_gain.toFixed(0)} m`" />
							</n-gi>
						</n-grid>
						<div class="splits-list-container"
							v-if="stravaActivity.splits_metric && stravaActivity.splits_metric.length > 0">
							<h3>Splits Analysis</h3>
							<n-list class="slimmer-list">
								<n-list-item class="split-headers">
									<n-grid x-gap="12" :cols="10">
										<n-gi :span="2"><strong>KM</strong></n-gi>
										<n-gi :span="4"><strong>Pace</strong></n-gi>
										<n-gi :span="2"><strong>Elev (m)</strong></n-gi>
										<n-gi :span="2"><strong>HR (bpm)</strong></n-gi>
									</n-grid>
								</n-list-item>
								<n-list-item v-for="(split, index) in stravaActivity.splits_metric" :key="index">
									<n-grid x-gap="12" :cols="10" class="split-row">
										<n-gi :span="2">
											{{ split.split }}
										</n-gi>
										<n-gi :span="4">
											<div class="pace-display">
												<span class="pace-value">{{ formatPaceFromSpeed(split.average_speed)
												}}</span>
												<n-progress type="line" status="success" :show-indicator="false"
													:percentage="(1000 / split.average_speed / maxPaceInSeconds) * 100"
													:height="6" processing />
											</div>
										</n-gi>
										<n-gi :span="2">
											{{ split.elevation_difference.toFixed(0) }}
										</n-gi>
										<n-gi :span="2">
											{{ split.average_heartrate?.toFixed(0) || 'N/A' }}
										</n-gi>
									</n-grid>
								</n-list-item>
							</n-list>
						</div>
					</n-card>

				</n-space>
				<n-empty v-else description="Workout not found or loading..."></n-empty>
			</n-spin>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watchEffect, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NPageHeader, NSpace, NCard, NEmpty, NSpin, NList, NListItem, NGrid, NGi, NStatistic, NProgress, NTag } from 'naive-ui'
import L from 'leaflet'
import 'leaflet-polylinedecorator'
import { decode } from '@mapbox/polyline'
import { db } from '@/db'
import type { Workout, StravaActivity } from '../types'

const route = useRoute()
const router = useRouter()
const workout = ref<Workout | null>(null)
const stravaActivity = ref<any>(null)
const loading = ref(true);
const mapContainer = ref<HTMLElement | null>(null)

const handleBack = () => {
	router.go(-1)
}

const formatDuration = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	let result = '';
	if (hours > 0) result += `${hours}h `;
	if (minutes > 0 || hours > 0) result += `${minutes}m `;
	result += `${remainingSeconds}s`;
	return result.trim();
};

const calculatePace = (time: number, distance: number): string => {
	if (distance === 0) return '0:00 /km';
	const pace = time / (distance / 1000);
	const minutes = Math.floor(pace / 60);
	const seconds = Math.floor(pace % 60);
	return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

const formatPaceFromSpeed = (average_speed: number): string => {
    if (average_speed === 0) return '0:00 /km';
    const pace_in_seconds_per_km = 1000 / average_speed;
    const minutes = Math.floor(pace_in_seconds_per_km / 60);
    const seconds = Math.floor(pace_in_seconds_per_km % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

const maxPaceInSeconds = computed(() => {
    if (!stravaActivity.value?.splits_metric || stravaActivity.value.splits_metric.length === 0) {
        return 1; 
    }
    const paces = stravaActivity.value.splits_metric.map(split => 1000 / split.average_speed);
    return Math.max(...paces);
});

watchEffect((onInvalidate) => {
	let map: L.Map | null = null;
	let decorator: L.PolylineDecorator | null = null;

	const updateDecoratorVisibility = () => {
		if (map && decorator) {
			const zoomThreshold = 13;
			if (map.getZoom() > zoomThreshold) {
				if (!map.hasLayer(decorator)) {
					decorator.addTo(map);
				}
			} else {
				if (map.hasLayer(decorator)) {
					decorator.removeFrom(map);
				}
			}
		}
	};

	if (stravaActivity.value?.map?.polyline && mapContainer.value) {
		const decodedPolyline = decode(stravaActivity.value.map.polyline);

		if (decodedPolyline.length > 0) {
			mapContainer.value.innerHTML = '';
			map = L.map(mapContainer.value);
			L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			}).addTo(map);

			const polyline = L.polyline(decodedPolyline, { color: '#FF8C00', smoothFactor: 3, weight: 3 }).addTo(map);

			decorator = L.polylineDecorator(polyline, {
				patterns: [
					{
						offset: '10%',
						repeat: '30%',
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

			map.on('zoomend', updateDecoratorVisibility);
			updateDecoratorVisibility();

			map.fitBounds(polyline.getBounds());
		}
	}
	onInvalidate(() => {
		if (map) {
			map.off('zoomend', updateDecoratorVisibility);
			map.remove();
		}
	});
});

onMounted(async () => {
	try {
		const workoutId = parseInt(route.params.id as string)
		if (!isNaN(workoutId)) {
			workout.value = await db.getWorkoutById(workoutId)
			if (workout.value?.stravaActivityId) {
				try {
					stravaActivity.value = await window.stravaApi.getStravaActivityById(workout.value.stravaActivityId.toString());
				} catch (error) {
					console.error('Failed to fetch Strava activity:', error);
				}
			}
		}
	} finally {
		loading.value = false;
	}
})
</script>

<style scoped>
.workout-detail-wrapper {
	width: 100%;
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 24px;
	width: 100%;
}

.grid {
	display: grid;
	grid-template-columns: 1fr;
	width: 100%;
}

@media (min-width: 768px) {
	.grid {
		grid-template-columns: 1fr 1fr;
		width: 100%;
	}
}

.card {
	border-radius: 15px;
	width: 100%;
	display: grid;
	gap: 16px;
	padding: 16px;
}

.stats-container {
	padding-top: 20px;
}

.splits-list-container {
	margin-top: 20px;
}

.slimmer-list .n-list-item {
	padding: 4px 12px;
}

.slimmer-list .split-headers {
    font-weight: bold;
    background-color: transparent;
    padding-top: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--n-border-color); 
}

.slimmer-list .n-list-item:not(.split-headers) {
    border-bottom: none !important;
}

.split-row {
	align-items: center;
	font-size: 0.85em;
}

.pace-display {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

.pace-value {
	min-width: 60px;
	text-align: right;
	flex-shrink: 0;
	font-variant-numeric: tabular-nums;
}
</style>
