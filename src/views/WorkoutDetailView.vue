<template>
	<div class="detail-view">
		<div class="detail-inner">

			<!-- Header -->
			<header class="detail-header">
				<button class="back-btn" @click="handleBack">
					<n-icon :component="ArrowBackOutline" /> Back
				</button>
				<span v-if="workout" class="type-chip" :style="{ color: sportCol, background: sportColSoft }">
					{{ workout.type }}
				</span>
			</header>

			<div v-if="loading" class="loading-state">
				<n-spin size="large" />
			</div>

			<template v-else-if="workout">

				<!-- Workout title -->
				<div class="detail-title-row">
					<h1 class="detail-title">{{ workout.name }}</h1>
					<span class="detail-date">{{ formatDate(workout.date) }}</span>
				</div>

				<!-- Route art -->
				<div v-if="routeData" class="route-art-wrap">
					<svg :viewBox="`0 0 ${routeData.vw} ${routeData.vh}`"
						xmlns="http://www.w3.org/2000/svg"
						class="route-svg"
						preserveAspectRatio="xMidYMid meet">
						<defs>
							<filter id="lineGlow" x="-40%" y="-40%" width="180%" height="180%">
								<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1"/>
								<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2"/>
								<feMerge>
									<feMergeNode in="blur1"/>
									<feMergeNode in="blur2"/>
									<feMergeNode in="SourceGraphic"/>
								</feMerge>
							</filter>
						</defs>
						<!-- Wide soft halo -->
						<polyline :points="routeData.points" fill="none"
							:stroke="sportCol" stroke-width="14" stroke-opacity="0.1"
							stroke-linecap="round" stroke-linejoin="round"/>
						<!-- Medium glow -->
						<polyline :points="routeData.points" fill="none"
							:stroke="sportCol" stroke-width="6" stroke-opacity="0.2"
							stroke-linecap="round" stroke-linejoin="round"/>
						<!-- Sharp line -->
						<polyline :points="routeData.points" fill="none"
							:stroke="sportCol" stroke-width="2"
							stroke-linecap="round" stroke-linejoin="round"
							filter="url(#lineGlow)"/>
						<!-- Start marker -->
						<circle :cx="routeData.start.x" :cy="routeData.start.y" r="7" :fill="sportCol" opacity="0.9"/>
						<circle :cx="routeData.start.x" :cy="routeData.start.y" r="13" fill="none" :stroke="sportCol" stroke-width="1.5" opacity="0.35"/>
						<!-- End marker -->
						<circle :cx="routeData.end.x" :cy="routeData.end.y" r="7" fill="var(--text-secondary)" opacity="0.7"/>
						<circle :cx="routeData.end.x" :cy="routeData.end.y" r="13" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" opacity="0.25"/>
					</svg>
					<div class="route-legend">
						<span class="legend-dot" :style="{ background: sportCol }"></span> Start
						<span class="legend-dot" style="background: var(--text-secondary); margin-left: 12px"></span> Finish
					</div>
				</div>

				<!-- Key stats -->
				<div v-if="stravaActivity" class="stats-row">
					<div class="stat-item">
						<span class="stat-label">Distance</span>
						<span class="stat-value mono">{{ (stravaActivity.distance / 1000).toFixed(2) }}<span class="stat-unit"> km</span></span>
					</div>
					<div class="stat-divider"></div>
					<div class="stat-item">
						<span class="stat-label">Duration</span>
						<span class="stat-value mono">{{ formatDuration(stravaActivity.moving_time) }}</span>
					</div>
					<div class="stat-divider"></div>
					<div class="stat-item">
						<span class="stat-label">{{ workout.type?.toLowerCase() === 'bike' ? 'Speed' : 'Pace' }}</span>
						<span class="stat-value mono">{{ workout.type?.toLowerCase() === 'bike'
							? calculateSpeed(stravaActivity.moving_time, stravaActivity.distance)
							: calculatePace(stravaActivity.moving_time, stravaActivity.distance) }}</span>
					</div>
				</div>

				<!-- Non-strava completion stats -->
				<div v-else-if="workout.isCompleted" class="stats-row">
					<div class="stat-item" v-if="workout.actualDuration">
						<span class="stat-label">Duration</span>
						<span class="stat-value mono">{{ workout.actualDuration }}<span class="stat-unit"> min</span></span>
					</div>
					<div class="stat-divider" v-if="workout.actualDuration && workout.totalWeightLifted"></div>
					<div class="stat-item" v-if="workout.totalWeightLifted">
						<span class="stat-label">Load</span>
						<span class="stat-value mono">{{ (workout.totalWeightLifted / 1000).toFixed(1) }}<span class="stat-unit"> t</span></span>
					</div>
					<div class="stat-divider" v-if="workout.rpe"></div>
					<div class="stat-item" v-if="workout.rpe">
						<span class="stat-label">RPE</span>
						<span class="stat-value mono">{{ workout.rpe }}<span class="stat-unit"> /10</span></span>
					</div>
				</div>

				<!-- Secondary stats -->
				<div v-if="stravaActivity && (stravaActivity.average_heartrate || stravaActivity.calories || stravaActivity.total_elevation_gain)" class="secondary-stats">
					<div v-if="stravaActivity.average_heartrate" class="sec-stat">
						<span class="sec-label">Avg HR</span>
						<span class="sec-value mono">{{ Math.round(stravaActivity.average_heartrate) }} <span class="sec-unit">bpm</span></span>
					</div>
					<div v-if="stravaActivity.calories" class="sec-stat">
						<span class="sec-label">Calories</span>
						<span class="sec-value mono">{{ Math.round(stravaActivity.calories) }} <span class="sec-unit">kcal</span></span>
					</div>
					<div v-if="stravaActivity.total_elevation_gain" class="sec-stat">
						<span class="sec-label">Elevation</span>
						<span class="sec-value mono">{{ Math.round(stravaActivity.total_elevation_gain) }} <span class="sec-unit">m</span></span>
					</div>
				</div>

				<!-- Notes -->
				<div v-if="workout.notes" class="notes-block">
					<span class="notes-label">Notes</span>
					<p class="notes-text">{{ workout.notes }}</p>
				</div>

				<!-- Splits -->
				<div v-if="stravaActivity?.splits_metric?.length" class="splits-section">
					<h2 class="splits-title">Splits</h2>
					<div class="splits-table">
						<div class="split-head">
							<span>KM</span>
							<span>{{ workout.type?.toLowerCase() === 'bike' ? 'Speed' : 'Pace' }}</span>
							<span>Elev</span>
							<span>HR</span>
						</div>
						<div v-for="(split, i) in stravaActivity.splits_metric" :key="i" class="split-row">
							<span class="mono">{{ split.split }}</span>
							<span class="split-pace-cell">
								<span class="mono">{{ formatPaceOrSpeedFromSpeed(split.average_speed) }}</span>
								<div class="pace-bar-track">
									<div class="pace-bar-fill" :style="{
										width: paceBarWidth(split) + '%',
										background: sportCol
									}"></div>
								</div>
							</span>
							<span class="mono">{{ split.elevation_difference >= 0 ? '+' : '' }}{{ split.elevation_difference.toFixed(0) }}</span>
							<span class="mono">{{ split.average_heartrate?.toFixed(0) ?? '—' }}</span>
						</div>
					</div>
				</div>

			</template>

			<div v-else class="empty-state">Workout not found.</div>

		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, NSpin } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { decode } from '@mapbox/polyline'
import { format, parseISO } from 'date-fns'
import { db } from '@/db'
import { stravaApi } from '@/stravaBridge'
import { getWorkoutType, getSportColor } from '@/utils/workouts'
import type { Workout } from '../types'

const route = useRoute()
const router = useRouter()
const workout = ref<Workout | null>(null)
const stravaActivity = ref<any>(null)
const loading = ref(true)

const handleBack = () => router.go(-1)
const formatDate = (d: string) => format(parseISO(d), 'EEEE, d MMMM yyyy')

const sportCol = computed(() => workout.value ? getSportColor(getWorkoutType(workout.value)) : '#9aa7b8')
const sportColSoft = computed(() => {
	const c = sportCol.value
	return c.startsWith('#')
		? c + '22'
		: 'rgba(159,168,184,0.13)'
})

// ─── Route art ────────────────────────────────────────────────────────────────
const routeData = computed(() => {
	const poly = stravaActivity.value?.map?.polyline
	if (!poly) return null
	const raw: [number, number][] = decode(poly)
	if (raw.length < 2) return null

	const toMercY = (lat: number) =>
		-Math.log(Math.tan((lat * Math.PI / 360) + (Math.PI / 4)))

	const pts = raw.map(([lat, lng]) => ({ x: lng, y: toMercY(lat) }))

	let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y
	for (const p of pts) {
		if (p.x < minX) minX = p.x
		if (p.x > maxX) maxX = p.x
		if (p.y < minY) minY = p.y
		if (p.y > maxY) maxY = p.y
	}

	const VW = 900, VH = 480, pad = 56
	const rangeX = maxX - minX || 0.00001
	const rangeY = maxY - minY || 0.00001
	const scale = Math.min((VW - pad * 2) / rangeX, (VH - pad * 2) / rangeY)
	const ox = (VW - rangeX * scale) / 2
	const oy = (VH - rangeY * scale) / 2

	const svgPts = pts.map(p => ({
		x: ox + (p.x - minX) * scale,
		y: oy + (p.y - minY) * scale,
	}))

	return {
		points: svgPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
		start: svgPts[0],
		end: svgPts[svgPts.length - 1],
		vw: VW,
		vh: VH,
	}
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDuration = (s: number) => {
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	const sec = s % 60
	return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`
}

const calculatePace = (time: number, dist: number) => {
	if (!dist) return '—'
	const p = time / (dist / 1000)
	return `${Math.floor(p / 60)}:${String(Math.floor(p % 60)).padStart(2, '0')} /km`
}

const calculateSpeed = (time: number, dist: number) => {
	if (!time) return '—'
	return `${((dist / 1000) / (time / 3600)).toFixed(1)} km/h`
}

const formatPaceOrSpeedFromSpeed = (spd: number) => {
	if (!spd) return '—'
	if (workout.value?.type?.toLowerCase() === 'bike') return `${(spd * 3.6).toFixed(1)} km/h`
	const s = 1000 / spd
	return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')} /km`
}

const maxRef = computed(() => {
	const splits: any[] = stravaActivity.value?.splits_metric ?? []
	if (!splits.length) return 1
	if (workout.value?.type?.toLowerCase() === 'bike')
		return Math.max(...splits.map((s: any) => s.average_speed * 3.6))
	return Math.max(...splits.map((s: any) => 1000 / (s.average_speed || 0.001)))
}
)

const paceBarWidth = (split: any) => {
	if (!split.average_speed) return 0
	if (workout.value?.type?.toLowerCase() === 'bike') {
		return Math.min(100, ((split.average_speed * 3.6) / maxRef.value) * 100)
	}
	const pace = 1000 / split.average_speed
	return Math.min(100, (maxRef.value / pace) * 100)
}

onMounted(async () => {
	try {
		const id = parseInt(route.params.id as string)
		if (!isNaN(id)) {
			workout.value = await db.getWorkoutById(id)
			if (workout.value?.stravaActivityId) {
				try {
					stravaActivity.value = await stravaApi.getStravaActivityById(
						workout.value.stravaActivityId.toString()
					)
				} catch {}
			}
		}
	} finally {
		loading.value = false
	}
})
</script>

<style scoped>
.detail-view { width: 100%; min-height: 100vh; }
.detail-inner { max-width: 820px; margin: 0 auto; padding: 24px 28px 64px; }
@media (max-width: 600px) { .detail-inner { padding: 16px 16px 48px; } }

/* Header */
.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.back-btn {
	display: inline-flex; align-items: center; gap: 6px;
	background: var(--surface-color); border: 1px solid var(--border-color);
	color: var(--text-secondary); padding: 7px 14px; border-radius: var(--radius-sm);
	cursor: pointer; font-size: 0.85rem; font-family: var(--font-family);
	transition: border-color 0.15s, color 0.15s;
}
.back-btn:hover { border-color: var(--border-strong); color: var(--text-color); }
.type-chip { font-size: 0.78rem; font-weight: 600; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; }

/* Title */
.detail-title-row { margin-bottom: 24px; }
.detail-title { font-size: 1.8rem; font-weight: 400; font-family: var(--font-serif); margin: 0 0 4px; }
.detail-date { color: var(--text-muted); font-size: 0.85rem; }

/* Route art */
.route-art-wrap {
	background: var(--background-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	margin-bottom: 20px;
	overflow: hidden;
}
.route-svg { width: 100%; height: auto; display: block; max-height: 420px; }
.route-legend {
	display: flex; align-items: center; gap: 6px;
	padding: 10px 16px; font-size: 0.75rem; color: var(--text-muted);
	border-top: 1px solid var(--border-color);
}
.legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

/* Key stats */
.stats-row {
	display: flex; align-items: stretch;
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); margin-bottom: 12px; overflow: hidden;
}
.stat-item { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 18px 20px; }
.stat-divider { width: 1px; background: var(--border-color); flex-shrink: 0; }
.stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.stat-value { font-size: 1.6rem; font-weight: 700; line-height: 1; }
.stat-unit { font-size: 0.85rem; font-weight: 400; color: var(--text-secondary); }

/* Secondary stats */
.secondary-stats {
	display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
}
.sec-stat {
	flex: 1; min-width: 100px;
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); padding: 14px 16px;
	display: flex; flex-direction: column; gap: 3px;
}
.sec-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.sec-value { font-size: 1.15rem; font-weight: 600; }
.sec-unit { font-size: 0.78rem; font-weight: 400; color: var(--text-secondary); }

/* Notes */
.notes-block {
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); padding: 16px 18px; margin-bottom: 12px;
}
.notes-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 6px; }
.notes-text { margin: 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; }

/* Splits */
.splits-section { margin-top: 24px; }
.splits-title { font-size: 1rem; font-weight: 400; font-family: var(--font-serif); margin: 0 0 12px; color: var(--text-color); }
.splits-table {
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); overflow: hidden;
}
.split-head, .split-row {
	display: grid;
	grid-template-columns: 40px 1fr 56px 56px;
	gap: 12px; padding: 10px 16px; align-items: center;
}
.split-head {
	font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;
	letter-spacing: 0.04em; border-bottom: 1px solid var(--border-color);
}
.split-row { font-size: 0.85rem; }
.split-row + .split-row { border-top: 1px solid var(--border-color); }
.split-pace-cell { display: flex; align-items: center; gap: 8px; }
.pace-bar-track { flex: 1; height: 3px; background: var(--surface-2); border-radius: 2px; overflow: hidden; }
.pace-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }

/* States */
.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.empty-state { text-align: center; color: var(--text-muted); padding: 80px 0; }
</style>
