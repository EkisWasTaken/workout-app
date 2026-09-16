<script setup lang="ts">
/**
 * Body weight progress, on a trend weight.
 *
 * A single morning reading moves a kilo on hydration alone, so the headline is
 * a time-aware moving average and the rate is fitted through every weigh-in of
 * the last four weeks. The chart uses a real time axis: the old one spaced
 * weigh-ins evenly, so a three-week gap looked like a day.
 */
import { computed, onMounted } from 'vue'
import { NIcon } from 'naive-ui'
import { BodyOutline, CameraOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import AlignedPhoto from '@/components/AlignedPhoto.vue'
import { loadPhotos, photos, photosError, photosLoaded } from '@/photos'
import { MISSING_PHOTOS } from '@/db'
import { isOwner } from '@/owner'
import {
	POSES, compare, dueLabel, frameLabel, framesFor, nextPhotoDue, timelapseReadiness,
	MIN_TIMELAPSE_PHOTOS, MIN_TIMELAPSE_SPAN_DAYS,
} from '@/utils/progressPhotos'
import { format, parseISO } from 'date-fns'
import MetricCard from '@/components/stats/MetricCard.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import TimeSeriesChart, { type ChartSeries, type GoalLine } from '@/components/charts/TimeSeriesChart.vue'
import { body, dailyWeights, today } from '@/stats'
import { settings } from '@/settings'

const goalWeight = computed(() => settings.goalWeight)

const t = (d: string) => parseISO(d).getTime()

const weightSeries = computed<ChartSeries[]>(() => [
	{
		key: 'weighin', label: 'Weigh-in', kind: 'dots', color: 'var(--text-muted)', size: 5,
		points: [...dailyWeights.value]
			.sort((a, b) => a.date.localeCompare(b.date))
			.map(w => ({ x: t(w.date), y: w.weight })),
	},
	{
		key: 'trend', label: 'Trend weight', kind: 'line', color: 'var(--primary-color)', width: 2.5, connectGaps: true,
		points: body.value.smoothed.map(p => ({ x: t(p.date), y: p.weight })),
	},
])

const weightGoals = computed<GoalLine[]>(() =>
	goalWeight.value === null ? [] : [{ label: `Goal ${goalWeight.value.toFixed(1)} kg`, value: goalWeight.value, color: 'var(--success-color)' }])

const kg = (v: number) => v.toFixed(1)

// ─── progress photos ──────────────────────────────────────────────────────────

onMounted(() => loadPhotos())

const photosMissing = computed(() => (photosError.value as Error | null)?.message === MISSING_PHOTOS)

/** Preview the pose with the most photos — that's the timelapse with the most to show. */
const previewFrames = computed(() => {
	const byPose = POSES.map(p => framesFor(photos.value, p.key))
	return byPose.sort((a, b) => b.length - a.length)[0] ?? []
})
const firstPhoto = computed(() => previewFrames.value[0] ?? null)
const lastPhoto = computed(() => previewFrames.value[previewFrames.value.length - 1] ?? null)
const photoNote = computed(() => {
	const n = photos.value.length
	return n ? `${n} photo${n === 1 ? '' : 's'}` : "what the scale can't show"
})
const previewPose = computed(() => previewFrames.value[0]?.pose ?? 'front')
const readiness = computed(() => timelapseReadiness(previewFrames.value, today.value))
const photoDue = computed(() => nextPhotoDue(previewFrames.value, today.value))
const readyPct = computed(() => {
	const r = readiness.value
	// Both conditions count equally; the bar is full only when both are met.
	const photos = Math.min(1, r.count / MIN_TIMELAPSE_PHOTOS)
	const span = Math.min(1, r.spanDays / MIN_TIMELAPSE_SPAN_DAYS)
	return Math.round(((photos + span) / 2) * 100)
})
const photoGap = computed(() =>
	firstPhoto.value && lastPhoto.value && previewFrames.value.length > 1
		? compare(firstPhoto.value, lastPhoto.value)
		: null)
const goalDate = computed(() =>
	body.value.weeksToGoal === null ? null : format(new Date(today.value.getTime() + body.value.weeksToGoal * 7 * 86_400_000), 'MMMM yyyy'))
</script>

<template>
	<div class="stat-tab">
		<EmptyState
			v-if="!body.hasData"
			:icon="BodyOutline"
			title="No weigh-ins yet"
			body="Log your weight from the schedule page. A few readings a week is plenty — the trend smooths out day-to-day noise so you see the real direction."
			action-label="Go to schedule"
			action-to="/schedule"
		/>

		<template v-else>
			<SectionHead title="Progress" note="trend weight, today vs 28 days ago" />
			<section class="metric-grid">
				<MetricCard v-for="m in body.metrics" :key="m.key" :metric="m" />

				<div v-if="goalWeight !== null" class="stat-panel goal-card">
					<span class="gc-lbl">Goal</span>
					<span class="gc-val mono">{{ goalWeight.toFixed(1) }}<span class="gc-unit"> kg</span></span>
					<p class="gc-note">
						<template v-if="body.atGoal">You're there. Now it's about holding it.</template>
						<template v-else-if="body.weeksToGoal !== null">
							At the current rate you'd reach it in about
							{{ body.weeksToGoal }} week{{ body.weeksToGoal === 1 ? '' : 's' }}
							(around {{ goalDate }}).
						</template>
						<template v-else-if="body.ratePerWeek === null">
							Needs a few more weigh-ins in the last four weeks to project a date.
						</template>
						<template v-else>
							Your recent trend isn't heading toward this goal yet.
						</template>
					</p>
				</div>
			</section>

			<SectionHead title="Trend" note="every weigh-in, and the trend through them" />
			<section class="stat-panel stat-card">
				<div class="stat-head">
					<h3>Body weight</h3>
					<span class="hint">{{ dailyWeights.length }} weigh-in{{ dailyWeights.length === 1 ? '' : 's' }}</span>
				</div>
				<TimeSeriesChart :series="weightSeries" :goals="weightGoals" :y-format="kg" y-label="kg" />
				<p class="stat-note">
					The dots are individual weigh-ins and the line is your trend weight — a moving average that
					accounts for the days between readings, so it means the same whether you weigh in daily or
					twice a week. Judge progress from the line; a heavy dot after a salty dinner isn't a setback.
				</p>
			</section>
		</template>

		<!-- Photos stand on their own: plenty of people take them without ever weighing in.
		     Hidden for non-owners while the database is behind — there's nothing they can do. -->
		<template v-if="photosLoaded && (!photosError || (photosMissing && isOwner))">
			<SectionHead title="Progress photos" :note="photoNote" />

			<div v-if="photosMissing" class="stat-panel photo-cta">
				<p class="pc-text">
					Progress photos need a one-off database update — run
					<code>supabase_progress_photos.sql</code> in the Supabase SQL editor.
				</p>
			</div>

			<router-link v-else-if="!photos.length" :to="{ name: 'ProgressPhotos' }" class="stat-panel photo-cta">
				<span class="pc-icon"><n-icon :component="CameraOutline" /></span>
				<span class="pc-body">
					<span class="pc-title">Start a progress timelapse</span>
					<span class="pc-text">
						One photo a week, lined up frame by frame, becomes a video of your body changing.
						{{ MIN_TIMELAPSE_PHOTOS }} photos over {{ MIN_TIMELAPSE_SPAN_DAYS / 7 }} weeks is enough to
						see it. Private to you.
					</span>
				</span>
				<n-icon :component="ChevronForwardOutline" class="pc-chev" />
			</router-link>

			<router-link v-else :to="{ name: 'ProgressPhotos' }" class="stat-panel photo-preview">
				<div class="pp-pair">
					<figure v-if="firstPhoto">
						<AlignedPhoto :photo="firstPhoto" alt="Earliest progress photo" />
						<figcaption>{{ frameLabel(firstPhoto) }}</figcaption>
					</figure>
					<figure v-if="lastPhoto && lastPhoto !== firstPhoto">
						<AlignedPhoto :photo="lastPhoto" alt="Latest progress photo" />
						<figcaption>{{ frameLabel(lastPhoto) }}</figcaption>
					</figure>
				</div>
				<div class="pp-side">
					<span v-if="photoGap" class="pp-gap">{{ photoGap.summary }}</span>
					<span v-else class="pp-gap">One photo so far</span>

					<span v-if="readiness.ready" class="pp-ready done">✓ {{ previewPose }} timelapse ready</span>
					<span v-else class="pp-ready">
						<span class="pp-bar"><i :style="{ width: readyPct + '%' }"></i></span>
						<span>{{ readiness.message }}</span>
					</span>

					<span class="pp-due" :class="{ now: photoDue && photoDue.inDays <= 0 }">{{ dueLabel(photoDue) }}</span>
					<span class="pp-open">Open timelapse <n-icon :component="ChevronForwardOutline" /></span>
				</div>
			</router-link>
		</template>
	</div>
</template>

<style scoped>
.goal-card {
	padding: 14px 16px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	border-left: 2px solid var(--success-color);
}
.gc-lbl {
	font-size: 0.78rem;
	font-weight: 600;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: var(--text-secondary);
}
.gc-val { font-size: 1.6rem; font-weight: 600; line-height: 1.1; color: var(--text-color); }
.gc-unit { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
.gc-note { margin: 2px 0 0; font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary); }

.photo-cta {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px 18px;
	color: inherit;
	text-decoration: none;
}
a.photo-cta:hover, .photo-preview:hover { border-color: var(--primary-color); }
.pc-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 42px;
	height: 42px;
	border-radius: 50%;
	background: var(--primary-soft);
	color: var(--primary-color);
	font-size: 1.3rem;
}
.pc-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.pc-title { font-weight: 600; color: var(--text-color); }
.pc-text { margin: 0; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary); }
.pc-text code { font-size: 0.76rem; }
.pc-chev { color: var(--text-muted); flex-shrink: 0; }

.photo-preview {
	display: flex;
	align-items: center;
	gap: 18px;
	padding: 14px;
	color: inherit;
	text-decoration: none;
}
.pp-pair { display: flex; gap: 8px; flex-shrink: 0; }
.pp-pair figure { margin: 0; width: 110px; }
.pp-pair :deep(.aligned-photo) { border-radius: var(--radius-sm); }
.pp-pair figcaption { margin-top: 5px; font-size: 0.68rem; color: var(--text-muted); text-align: center; }
.pp-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pp-gap { font-size: 0.95rem; font-weight: 600; color: var(--text-color); }
.pp-ready { display: flex; flex-direction: column; gap: 5px; font-size: 0.78rem; line-height: 1.45; color: var(--text-secondary); }
.pp-ready.done { color: var(--success-color); font-weight: 600; text-transform: none; }
.pp-bar { display: block; width: 100%; max-width: 220px; height: 5px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.pp-bar i { display: block; height: 100%; background: var(--primary-color); border-radius: inherit; }
.pp-due { font-size: 0.76rem; color: var(--text-muted); }
.pp-due.now { color: var(--primary-color); font-weight: 600; }
.pp-open { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--primary-color); }

@media (max-width: 560px) {
	.photo-preview { flex-direction: column; align-items: stretch; }
	.pp-pair { justify-content: center; }
	.pp-pair figure { width: 46%; }
}
</style>
