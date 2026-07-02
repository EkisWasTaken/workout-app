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
				<div v-if="stravaActivity" class="secondary-stats">
					<div v-if="stravaActivity.average_heartrate" class="sec-stat">
						<span class="sec-label">Avg HR</span>
						<span class="sec-value mono">{{ Math.round(stravaActivity.average_heartrate) }} <span class="sec-unit">bpm</span></span>
					</div>
					<div v-if="gapPace" class="sec-stat">
						<span class="sec-label">Grade adj. pace</span>
						<span class="sec-value mono">{{ gapPace }} <span class="sec-unit">/km</span></span>
					</div>
					<div v-if="avgCadence" class="sec-stat">
						<span class="sec-label">Avg cadence</span>
						<span class="sec-value mono">{{ avgCadence }} <span class="sec-unit">{{ isBike ? 'rpm' : 'spm' }}</span></span>
					</div>
					<div v-if="estPower" class="sec-stat">
						<span class="sec-label">Est. power</span>
						<span class="sec-value mono">{{ estPower }} <span class="sec-unit">W</span></span>
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

				<!-- Effort & zones (from raw HR stream) -->
				<div v-if="effortScore || zoneTimes" class="effort-section">
					<div v-if="effortScore" class="effort-card">
						<span class="sec-label">Relative effort</span>
						<span class="effort-value mono">{{ effortScore }}</span>
						<span class="effort-note">TRIMP · from heart rate</span>
					</div>
					<div v-if="vo2maxEstimate" class="effort-card">
						<span class="sec-label">VO₂ max</span>
						<span class="effort-value mono">{{ vo2maxEstimate }}</span>
						<span class="effort-note">ml/kg/min · pace + HR estimate</span>
					</div>
					<div v-if="zoneTimes" class="zone-bar-card">
						<span class="sec-label">Time in zones</span>
						<div class="zone-bar">
							<div v-for="(z, i) in zoneSegments" :key="i" class="zone-seg"
								:style="{ width: z.pct + '%', background: z.color }"
								:title="`${z.name}: ${z.mins} min (${z.pct}%)`"></div>
						</div>
						<div class="zone-legend">
							<span v-for="(z, i) in zoneSegments.filter(s => s.pct > 0)" :key="i" class="zone-legend-item">
								<i :style="{ background: z.color }"></i>{{ z.name.split(' ')[0] }} {{ z.pct }}%
							</span>
						</div>
					</div>
				</div>

				<!-- HR / pace graph from raw streams -->
				<div v-if="hasStreamChart" class="stream-section">
					<h2 class="splits-title">Heart rate &amp; pace</h2>
					<div class="stream-chart-card"><canvas ref="streamCanvas"></canvas></div>
				</div>

				<!-- Best efforts -->
				<div v-if="bestEfforts.length" class="best-efforts-section">
					<h2 class="splits-title">Best efforts</h2>
					<div class="be-grid">
						<div v-for="be in bestEfforts" :key="be.name" class="be-card">
							<span class="be-name">{{ be.name }}
								<span v-if="prNames.has(be.name)" class="pr-chip">PR</span>
							</span>
							<span class="be-time mono">{{ fmtSecs(be.elapsed_time) }}</span>
							<span class="be-pace mono">{{ effortPace(be) }}</span>
						</div>
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
					<div class="splits-table" :class="{ 'has-gap': showSplitGap }">
						<div class="split-head">
							<span>KM</span>
							<span>{{ workout.type?.toLowerCase() === 'bike' ? 'Speed' : 'Pace' }}</span>
							<span v-if="showSplitGap">GAP</span>
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
							<span v-if="showSplitGap" class="mono gap-cell">{{ splitGap(i) }}</span>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, NSpin } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { decode } from '@mapbox/polyline'
import { format, parseISO } from 'date-fns'
import Chart from 'chart.js/auto'
import { db } from '@/db'
import { activityApi } from '@/activities'
import { getWorkoutType, getSportColor } from '@/utils/workouts'
import { PULSE_ZONES, getHRSettings, timeInZones, relativeEffort, fmtSecs, gradeAdjustedPace, estimateVO2max, estimateBikePower } from '@/utils/analysis'
import type { Workout, BestEffort } from '../types'

const route = useRoute()
const router = useRouter()
const workout = ref<Workout | null>(null)
const stravaActivity = ref<any>(null)
const loading = ref(true)
const allActivities = ref<any[]>([])
const latestWeightKg = ref<number | null>(null)

const isBike = computed(() => workout.value?.type?.toLowerCase() === 'bike')
const isRun = computed(() => workout.value?.type?.toLowerCase() === 'running')

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
	// Scale X and Y independently so the route fills the canvas regardless of orientation
	const scaleX = (VW - pad * 2) / rangeX
	const scaleY = (VH - pad * 2) / rangeY

	const svgPts = pts.map(p => ({
		x: pad + (p.x - minX) * scaleX,
		y: pad + (p.y - minY) * scaleY,
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

const paceBarWidth = (split: any) => {
	if (!split.average_speed) return 0
	if (workout.value?.type?.toLowerCase() === 'bike') {
		// 45 km/h = full bar, 10 km/h = empty
		const kmh = split.average_speed * 3.6
		return Math.max(0, Math.min(100, (kmh - 10) / (45 - 10) * 100))
	}
	// Running: 2:50 min/km (170 s/km) = full, 10:00 min/km (600 s/km) = empty
	const pace = 1000 / split.average_speed
	return Math.max(0, Math.min(100, (600 - pace) / (600 - 170) * 100))
}

// ─── Premium analysis (imported activities carry raw streams) ────────────────
const hrSettings = computed(() => {
	const a = stravaActivity.value
	return getHRSettings(a ? [a] : [])
})

const effortScore = computed(() => {
	const a = stravaActivity.value
	if (!a || !hrSettings.value.maxHR) return null
	return relativeEffort(a, hrSettings.value.maxHR, hrSettings.value.restHR)
})

const zoneTimes = computed(() => {
	const a = stravaActivity.value
	// Only meaningful with real streams; avg-HR-only puts 100% in one zone
	if (!a?.streams?.heartrate || !hrSettings.value.maxHR) return null
	return timeInZones(a, hrSettings.value.maxHR, hrSettings.value.restHR)
})

const zoneSegments = computed(() => {
	const times = zoneTimes.value
	if (!times) return []
	const total = times.reduce((s, t) => s + t, 0)
	if (!total) return []
	return PULSE_ZONES.map((z, i) => ({
		name: z.name,
		color: z.color,
		pct: Math.round((times[i] / total) * 100),
		mins: Math.round(times[i] / 60),
	}))
})

// Grade Adjusted Pace (runs only — Minetti terrain correction)
const gapResult = computed(() => {
	if (!isRun.value || !stravaActivity.value) return null
	return gradeAdjustedPace(stravaActivity.value)
})
const gapPace = computed(() => {
	const g = gapResult.value
	if (!g) return null
	const secs = 1000 / g.speed
	// Hide when it matches raw pace within a second — flat route, no signal
	const raw = stravaActivity.value.average_speed ? 1000 / stravaActivity.value.average_speed : null
	if (raw !== null && Math.abs(secs - raw) < 1) return null
	return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
})
const showSplitGap = computed(() => !!gapResult.value && gapResult.value.perKm.some(v => v !== null))
const splitGap = (i: number) => {
	const v = gapResult.value?.perKm[i]
	if (!v) return '—'
	const secs = 1000 / v
	return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

const avgCadence = computed(() => {
	const c = stravaActivity.value?.average_cadence
	return c ? Math.round(c) : null
})

const vo2maxEstimate = computed(() => {
	if (!isRun.value || !stravaActivity.value || !hrSettings.value.maxHR) return null
	return estimateVO2max(stravaActivity.value, hrSettings.value.maxHR)
})

const estPower = computed(() => {
	if (!isBike.value || !stravaActivity.value || !latestWeightKg.value) return null
	return estimateBikePower(stravaActivity.value, latestWeightKg.value)
})

// All-time PRs: which of this activity's best efforts beat every other run
const prNames = computed<Set<string>>(() => {
	const out = new Set<string>()
	const mine: BestEffort[] = stravaActivity.value?.best_efforts || []
	if (!mine.length || !allActivities.value.length) return out
	const myId = stravaActivity.value.id
	for (const be of mine) {
		let isBest = true
		for (const a of allActivities.value) {
			if (a.id === myId) continue
			const other = a.best_efforts?.find((b: any) => b.name === be.name)
			if (other && other.elapsed_time < be.elapsed_time) { isBest = false; break }
		}
		if (isBest) out.add(be.name)
	}
	return out
})

const bestEfforts = computed<BestEffort[]>(() => stravaActivity.value?.best_efforts || [])
const effortPace = (be: BestEffort) => {
	const p = be.elapsed_time / (be.distance / 1000)
	return `${Math.floor(p / 60)}:${String(Math.floor(p % 60)).padStart(2, '0')} /km`
}

const streamCanvas = ref<HTMLCanvasElement | null>(null)
let streamChart: Chart | null = null
const hasStreamChart = computed(() => {
	const s = stravaActivity.value?.streams
	return !!(s?.time?.length && (s.heartrate || s.velocity))
})

function buildStreamChart() {
	const s = stravaActivity.value?.streams
	if (!streamCanvas.value || !s) return
	const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
	const labels = s.time.map((t: number) => fmtSecs(t))
	const isBike = workout.value?.type?.toLowerCase() === 'bike'

	const datasets: any[] = []
	if (s.heartrate) {
		datasets.push({
			label: 'Heart rate (bpm)', data: s.heartrate, yAxisID: 'yHr',
			borderColor: '#e53935', backgroundColor: 'rgba(229,57,53,0.08)',
			borderWidth: 1.5, pointRadius: 0, tension: 0.3, spanGaps: true, fill: true,
		})
	}
	if (s.velocity) {
		datasets.push({
			label: isBike ? 'Speed (km/h)' : 'Pace (min/km)',
			data: s.velocity.map((v: number | null) =>
				v === null || v < 0.4 ? null : isBike ? Math.round(v * 36) / 10 : Math.round((1000 / v / 60) * 100) / 100),
			yAxisID: 'yPace',
			borderColor: sportCol.value, borderWidth: 1.5, pointRadius: 0, tension: 0.3, spanGaps: true,
		})
	}
	if (s.cadence) {
		datasets.push({
			label: isBike ? 'Cadence (rpm)' : 'Cadence (spm)',
			data: s.cadence.map((c: number | null) => (c === null || c <= 0 ? null : Math.round(c))),
			yAxisID: 'yCad', hidden: true, // toggle via legend, off by default
			borderColor: '#a06ee1', borderWidth: 1, pointRadius: 0, tension: 0.3, spanGaps: true,
		})
	}

	streamChart = new Chart(streamCanvas.value, {
		type: 'line',
		data: { labels, datasets },
		options: {
			responsive: true, maintainAspectRatio: false, animation: false,
			interaction: { mode: 'index', intersect: false },
			plugins: {
				legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } },
				tooltip: { backgroundColor: css('--surface-2'), borderColor: css('--border-strong'), borderWidth: 1, titleColor: css('--text-color'), bodyColor: css('--text-secondary'), padding: 10, cornerRadius: 8 },
			},
			scales: {
				x: { ticks: { color: css('--text-muted'), font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false }, border: { display: false } },
				yHr: { display: !!s.heartrate, position: 'left', ticks: { color: '#e53935', font: { size: 10 } }, grid: { color: css('--border-color') }, border: { display: false } },
				yPace: {
					display: !!s.velocity, position: 'right',
					reverse: !isBike, // lower pace number = faster, plot it upward
					ticks: { color: sportCol.value, font: { size: 10 } }, grid: { display: false }, border: { display: false },
				},
				yCad: { display: false },
			},
		} as any,
	})
}

onMounted(async () => {
	try {
		const id = parseInt(route.params.id as string)
		if (!isNaN(id)) {
			workout.value = await db.getWorkoutById(id)
			if (workout.value?.stravaActivityId) {
				try {
					stravaActivity.value = await activityApi.getActivityById(
						workout.value.stravaActivityId
					)
				} catch {}
			}
		}
	} finally {
		loading.value = false
	}
	await nextTick()
	if (hasStreamChart.value) buildStreamChart()

	// Background loads: all activities for PR badges, latest weight for power
	if (stravaActivity.value) {
		activityApi.getAllActivities()
			.then(acts => { allActivities.value = acts })
			.catch(() => {})
		if (isBike.value) {
			db.getDailyWeights()
				.then(ws => {
					const latest = [...ws].sort((a, b) => b.date.localeCompare(a.date))[0]
					if (latest) latestWeightKg.value = latest.weight
				})
				.catch(() => {})
		}
	}
})

onUnmounted(() => { streamChart?.destroy() })
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
	box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 4px rgba(0,0,0,0.25);
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

/* Effort & zones */
.effort-section { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.effort-card {
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); padding: 14px 18px;
	display: flex; flex-direction: column; gap: 3px; min-width: 130px;
}
.effort-value { font-size: 1.6rem; font-weight: 700; line-height: 1.2; }
.effort-note { font-size: 0.7rem; color: var(--text-muted); }
.zone-bar-card {
	flex: 1; min-width: 240px;
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); padding: 14px 18px;
	display: flex; flex-direction: column; gap: 10px;
}
.zone-bar { display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: var(--surface-2); }
.zone-seg { height: 100%; min-width: 0; }
.zone-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.72rem; color: var(--text-secondary); }
.zone-legend-item { display: inline-flex; align-items: center; gap: 5px; }
.zone-legend-item i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }

/* Stream chart */
.stream-section { margin-top: 24px; }
.stream-chart-card {
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); padding: 14px; height: 260px;
}

/* Best efforts */
.best-efforts-section { margin-top: 24px; }
.be-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
.be-card {
	background: var(--surface-color); border: 1px solid var(--border-color);
	border-radius: var(--radius); padding: 12px 14px;
	display: flex; flex-direction: column; gap: 3px;
}
.be-name { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.pr-chip {
	display: inline-block; margin-left: 6px; padding: 1px 6px;
	font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em;
	color: #f0b429; border: 1px solid #f0b429; border-radius: 999px;
}
.be-time { font-size: 1.15rem; font-weight: 700; }
.be-pace { font-size: 0.74rem; color: var(--text-secondary); }

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
.splits-table.has-gap .split-head,
.splits-table.has-gap .split-row {
	grid-template-columns: 40px 1fr 52px 52px 52px;
}
.gap-cell { color: var(--text-secondary); }
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
