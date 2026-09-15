<template>
	<div class="detail-view">
		<div class="detail-inner">

			<!-- Header -->
			<header class="detail-header">
				<button class="back-btn" @click="handleBack">
					<n-icon :component="ArrowBackOutline" /> Back
				</button>
				<span v-if="workout" class="type-chip" :style="{ color: sportCol, background: sportColSoft }">
					{{ SPORT_LABELS[sport] }}
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

				<!-- Route -->
				<RouteMap v-if="routePolyline" :polyline="routePolyline" :color="sportCol" />

				<!-- Key stats -->
				<div v-if="stravaActivity" class="stats-row">
					<div class="stat-item">
						<span class="stat-label">Distance</span>
						<span class="stat-value mono">{{ (stravaActivity.distance / 1000).toFixed(2) }}<span class="stat-unit"> km</span></span>
					</div>
					<div class="stat-divider"></div>
					<div class="stat-item">
						<span class="stat-label">Moving time</span>
						<span class="stat-value mono">{{ formatDuration(stravaActivity.moving_time) }}</span>
					</div>
					<div class="stat-divider"></div>
					<div class="stat-item">
						<span class="stat-label">{{ isBike ? 'Avg speed' : 'Avg pace' }}</span>
						<span class="stat-value mono">{{ isBike
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
						<span class="stat-label" title="Rate of perceived exertion: how hard it felt, 1 to 10">Effort</span>
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
						<span class="sec-label" title="Your pace adjusted for hills: what it would have been on flat ground">Flat-equivalent pace</span>
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
						<span class="sec-label">Training load</span>
						<span class="effort-value mono">{{ effortScore }}</span>
						<span class="effort-note">duration × heart-rate intensity</span>
					</div>
					<div v-if="vo2maxEstimate" class="effort-card">
						<span class="sec-label">VO₂max estimate</span>
						<span class="effort-value mono">{{ vo2maxEstimate }}</span>
						<span class="effort-note">ml/kg/min · a single run is a rough read</span>
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
								<i :style="{ background: z.color }"></i>{{ z.name }} · {{ z.pct }}% ({{ z.mins }} min)
							</span>
						</div>
					</div>
				</div>

				<!-- HR / pace graph from raw streams -->
				<div v-if="hasStreamChart" class="stream-section">
					<div class="stream-title-row">
						<h2 class="splits-title">{{ isBike ? 'Speed' : 'Pace' }} &amp; heart rate</h2>
						<label v-if="stravaActivity?.streams?.cadence" class="stream-toggle">
							<input v-model="showCadence" type="checkbox" /> Show cadence
						</label>
					</div>
					<div class="stream-chart-card"><StreamTracks :time="stravaActivity.streams.time" :tracks="streamTracks" /></div>
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
							<span>{{ isBike ? 'Speed' : 'Pace' }}</span>
							<span v-if="showSplitGap" title="Pace adjusted for hills">Flat</span>
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

			<div v-else class="empty-state">
				This workout doesn't exist any more. It may have been deleted.
				<router-link to="/schedule" class="empty-link">Back to schedule</router-link>
			</div>

		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, NSpin } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { format, parseISO } from 'date-fns'
import { db } from '@/db'
import { activityApi } from '@/activities'
import { cssColor, getSportColor, SPORT_LABELS } from '@/utils/workouts'
import { buildActivityIndex, effectiveWorkoutType, resolveActivity } from '@/utils/workoutSport'
import RouteMap from '@/components/RouteMap.vue'
import StreamTracks, { type StreamTrack } from '@/components/charts/StreamTracks.vue'
import { PULSE_ZONES, getHRSettings, timeInZones, relativeEffort, fmtSecs, gradeAdjustedPace, estimateVO2max, estimateBikePower } from '@/utils/analysis'
import type { Workout, BestEffort } from '../types'

const route = useRoute()
const router = useRouter()
const workout = ref<Workout | null>(null)
const stravaActivity = ref<any>(null)
const loading = ref(true)
const allActivities = ref<any[]>([])
const latestWeightKg = ref<number | null>(null)

/**
 * The sport as recorded, not as typed. Home already believes the recording over
 * the hand-entered type, so this page must too — otherwise a run typed "Bike"
 * showed km/h here and a pace on Home.
 */
const sport = computed(() => {
	if (!workout.value) return 'other'
	return effectiveWorkoutType(workout.value, buildActivityIndex(stravaActivity.value ? [stravaActivity.value] : []))
})
const isBike = computed(() => sport.value === 'bike')
const isRun = computed(() => sport.value === 'running')

const handleBack = () => router.go(-1)
const formatDate = (d: string) => format(parseISO(d), 'EEEE, d MMMM yyyy')

const sportCol = computed(() => workout.value ? getSportColor(sport.value) : cssColor('--color-other-primary', '#94a3b8'))
const sportColSoft = computed(() => {
	const c = sportCol.value
	return c.startsWith('#')
		? c + '22'
		: 'rgba(159,168,184,0.13)'
})

const routePolyline = computed(() => stravaActivity.value?.map?.polyline || null)

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
	if (isBike.value) return `${(spd * 3.6).toFixed(1)} km/h`
	const s = 1000 / spd
	return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')} /km`
}

/**
 * Split bars scaled within this activity: the fastest split is full, the slowest
 * a quarter. A fixed 2:50–10:00/km scale drew every split of a normal run at
 * almost the same length, so the bars couldn't show which kilometres were quick.
 */
const splitSpeedRange = computed(() => {
	const v = (stravaActivity.value?.splits_metric ?? []).map((sp: any) => sp.average_speed).filter((x: number) => x > 0)
	return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0]
})
const paceBarWidth = (split: any) => {
	if (!split.average_speed) return 0
	const [lo, hi] = splitSpeedRange.value
	if (hi - lo < 1e-6) return 100
	return 25 + ((split.average_speed - lo) / (hi - lo)) * 75
}

// ─── Premium analysis (imported activities carry raw streams) ────────────────
/**
 * Max HR from *every* recording, not just this one. Reading it from this
 * activity alone meant an easy run's own peak became "max", so its zones,
 * effort score and VO₂ were all computed against the wrong ceiling — and
 * disagreed with the same run's numbers on Home.
 */
const hrSettings = computed(() => {
	const a = stravaActivity.value
	return getHRSettings(allActivities.value.length ? allActivities.value : a ? [a] : [])
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
	return estimateVO2max(stravaActivity.value, hrSettings.value.maxHR, hrSettings.value.restHR)
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

const hasStreamChart = computed(() => {
	const st = stravaActivity.value?.streams
	return !!(st?.time?.length && (st.heartrate || st.velocity))
})

/** Mean over a trailing time window, so second-by-second GPS jitter doesn't hide the shape. */
function smoothByTime(time: number[], values: (number | null)[], windowSecs: number): (number | null)[] {
	const out: (number | null)[] = []
	let lo = 0, sum = 0, n = 0
	for (let i = 0; i < values.length; i++) {
		const v = values[i]
		if (v !== null && v !== undefined) { sum += v; n++ }
		while (time[i] - time[lo] > windowSecs) {
			const old = values[lo]
			if (old !== null && old !== undefined) { sum -= old; n-- }
			lo++
		}
		out.push(n && v !== null && v !== undefined ? sum / n : null)
	}
	return out
}

const showCadence = ref(false)

const streamTracks = computed<StreamTrack[]>(() => {
	const st = stravaActivity.value?.streams
	if (!st?.time?.length) return []
	const tracks: StreamTrack[] = []
	const avg = (xs: (number | null)[]) => {
		const v = xs.filter((x): x is number => x !== null && Number.isFinite(x))
		return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
	}
	if (st.velocity) {
		// Stopped samples are gaps, not a pace of 40 min/km.
		const moving = st.velocity.map((v: number | null) => (v === null || v < 0.5 ? null : v))
		const smooth = smoothByTime(st.time, moving, 30)
		if (isBike.value) {
			const kmh = smooth.map(v => (v === null ? null : v * 3.6))
			const a = avg(kmh)
			tracks.push({ key: 'speed', label: 'Speed · 30 s average', unit: 'km/h', color: sportCol.value, values: kmh, format: v => v.toFixed(1), summary: a ? `avg ${a.toFixed(1)} km/h` : undefined })
		} else {
			const pace = smooth.map(v => (v === null ? null : 1000 / v))
			const avgSpeed = stravaActivity.value.average_speed
			tracks.push({
				key: 'pace', label: 'Pace · 30 s average', unit: '/km', color: sportCol.value, values: pace, reverse: true,
				format: v => fmtSecs(Math.round(v)),
				summary: avgSpeed ? `avg ${fmtSecs(Math.round(1000 / avgSpeed))} /km` : undefined,
			})
		}
	}
	if (st.heartrate) {
		const a = avg(st.heartrate)
		tracks.push({ key: 'hr', label: 'Heart rate', unit: 'bpm', color: cssColor('--color-heartrate', '#fb7185'), values: st.heartrate, area: true, format: v => String(Math.round(v)), summary: a ? `avg ${Math.round(a)} bpm` : undefined })
	}
	// Elevation, but only when there's something to see — a flat loop would add
	// a strip of noise magnified by the trimmed y-domain.
	if (st.altitude) {
		const alt = st.altitude.filter((v: number | null): v is number => v !== null && Number.isFinite(v))
		if (alt.length > 10 && Math.max(...alt) - Math.min(...alt) >= 10) {
			const gain = stravaActivity.value?.total_elevation_gain
			tracks.push({
				key: 'alt', label: 'Elevation', unit: 'm', color: cssColor('--color-elevation', '#8ba1c0'),
				values: st.altitude, area: true, format: v => String(Math.round(v)),
				summary: gain ? `+${Math.round(gain)} m gain` : undefined,
			})
		}
	}
	if (st.cadence && showCadence.value) {
		const cad = st.cadence.map((c: number | null) => (c === null || c <= 0 ? null : c))
		const a = avg(cad)
		tracks.push({ key: 'cad', label: 'Cadence', unit: isBike.value ? 'rpm' : 'spm', color: cssColor('--color-cadence', '#c4b5fd'), values: smoothByTime(st.time, cad, 15), format: v => String(Math.round(v)), summary: a ? `avg ${Math.round(a)}` : undefined })
	}
	return tracks
})

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
			// Older workouts carry dead ids from before file import; Home matches
			// those to a recording on the same day, so this page does the same.
			if (workout.value && !stravaActivity.value) {
				const acts = await activityApi.getAllActivities().catch(() => [])
				allActivities.value = acts
				stravaActivity.value = resolveActivity(workout.value, buildActivityIndex(acts))
			}
		}
	} finally {
		loading.value = false
	}
	// Background loads: all activities for PR badges, latest weight for power
	if (stravaActivity.value && !allActivities.value.length) {
		activityApi.getAllActivities()
			.then(acts => { allActivities.value = acts })
			.catch(() => {})
	}
	if (stravaActivity.value && isBike.value) {
		db.getDailyWeights()
			.then(ws => {
				const latest = [...ws].sort((a, b) => b.date.localeCompare(a.date))[0]
				if (latest) latestWeightKg.value = latest.weight
			})
			.catch(() => {})
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
	border-radius: var(--radius); padding: 14px;
}
.stream-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.stream-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--text-secondary); cursor: pointer; }

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
	color: var(--pr-gold); border: 1px solid var(--pr-gold); border-radius: 999px;
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
.empty-state { text-align: center; color: var(--text-muted); padding: 80px 0; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.empty-link { color: var(--primary-color); font-size: 0.88rem; }
</style>
