<script setup lang="ts">
/**
 * Race day, turned into instructions.
 *
 * The hero above this already says how many days are left. This says what to do
 * with them: whether the goal is the right goal, what to run in the opening
 * kilometres, and what the watch should read at each checkpoint.
 */
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { FlagOutline, SpeedometerOutline } from '@vicons/ionicons5'
import {
	racePlan, checkGoal, defaultSegmentM, raceWeekNote, fmtBand, fmtKm,
	type RaceStrategy,
} from '@/utils/racePlan'
import { fmtPace, fmtTime, raceTimeOnCourse } from '@/utils/vdot'
import type { RaceGoal } from '@/types'

const props = defineProps<{
	race: RaceGoal
	currentVdot: number | null
	daysOut: number
}>()

const STRATEGIES: { key: RaceStrategy; label: string; note: string }[] = [
	{ key: 'negative', label: 'Negative split', note: 'Start controlled, finish faster. The one that works.' },
	{ key: 'even', label: 'Even', note: 'Same pace throughout. Simple to execute.' },
	{ key: 'positive', label: 'Front-loaded', note: 'Bank time early. Usually a mistake — but yours to make.' },
]

const strategy = ref<RaceStrategy>('negative')
const distanceM = computed(() => (props.race.distance_km ?? 0) * 1000)

/** What today's fitness says this course is worth. */
const predictedSecs = computed(() =>
	props.currentVdot !== null && distanceM.value > 0
		? raceTimeOnCourse(props.currentVdot, distanceM.value, props.race.terrain_factor)
		: null)

/**
 * Pace to the goal when there is one; otherwise to what today's fitness
 * predicts, so a race with no goal time still gets a plan.
 */
const targetSecs = computed(() => props.race.goal_time_secs || predictedSecs.value)

const goal = computed(() =>
	checkGoal(distanceM.value, props.race.goal_time_secs ?? 0, props.currentVdot, props.race.terrain_factor))

const plan = computed(() =>
	targetSecs.value ? racePlan(distanceM.value, targetSecs.value, strategy.value) : null)

const usingPrediction = computed(() => !props.race.goal_time_secs)
const segmentLabel = computed(() => fmtKm(defaultSegmentM(distanceM.value)))
const note = computed(() => raceWeekNote(props.daysOut))

const verdictClass = computed(() => {
	if (goal.value.verdict === 'ahead' || goal.value.verdict === 'on-track') return 'good'
	if (goal.value.verdict === 'stretch') return 'warn'
	if (goal.value.verdict === 'unrealistic') return 'bad'
	return ''
})
</script>

<template>
	<section v-if="plan" class="panel race-plan">
		<div class="panel-head">
			<h2><n-icon :component="SpeedometerOutline" /> Race plan</h2>
			<span class="rp-sub">{{ race.name }} · {{ fmtKm(distanceM) }}</span>
		</div>

		<!-- Is this the right number to chase? -->
		<div v-if="race.goal_time_secs && goal.verdict !== 'unknown'" class="rp-verdict" :class="verdictClass">
			{{ goal.message }}
		</div>
		<div v-else-if="usingPrediction" class="rp-verdict">
			No goal time set, so this is paced to what your current fitness predicts.
			Set a goal in <router-link to="/profile" class="stat-inline-link">Profile</router-link> to pace it differently.
		</div>

		<!-- The two numbers that decide the race. -->
		<div class="rp-keys">
			<div class="rp-key">
				<span class="rp-lbl">Open at</span>
				<span class="rp-val mono">{{ fmtBand(plan.openingBand) }}</span>
				<span class="rp-unit">/km for the first 2 km</span>
			</div>
			<div class="rp-key">
				<span class="rp-lbl">Halfway</span>
				<span class="rp-val mono">{{ fmtTime(Math.round(plan.halfwaySecs)) }}</span>
				<span class="rp-unit">at {{ fmtKm(distanceM / 2) }}</span>
			</div>
			<div class="rp-key">
				<span class="rp-lbl">Finish</span>
				<span class="rp-val mono">{{ fmtTime(Math.round(plan.goalSecs)) }}</span>
				<span class="rp-unit">{{ fmtPace(plan.avgPaceSecPerKm) }}/km average</span>
			</div>
		</div>

		<div class="rp-strategy">
			<button
				v-for="s in STRATEGIES"
				:key="s.key"
				class="rp-tab"
				:class="{ active: strategy === s.key }"
				:title="s.note"
				@click="strategy = s.key"
			>{{ s.label }}</button>
		</div>

		<div class="rp-splits">
			<div class="rp-row rp-head">
				<span>{{ segmentLabel === '1 km' ? 'KM' : 'AT' }}</span>
				<span>Pace</span>
				<span>Split</span>
				<span>Elapsed</span>
			</div>
			<div v-for="s in plan.segments" :key="s.index" class="rp-row">
				<span class="mono">{{ fmtKm(s.atM) }}</span>
				<span class="mono">{{ fmtPace(s.paceSecPerKm) }}</span>
				<span class="mono rp-dim">{{ fmtTime(Math.round(s.splitSecs)) }}</span>
				<span class="mono">{{ fmtTime(Math.round(s.elapsedSecs)) }}</span>
			</div>
		</div>

		<p class="stat-note">
			Splits assume every kilometre is equally hard. On a course with real hills,
			run the effort and let the pace move around it —
			<template v-if="race.terrain_factor && race.terrain_factor !== 1">
				the {{ Math.round((race.terrain_factor - 1) * 100) }}% terrain penalty on this race is already
				in the finish time, not spread across the splits.
			</template>
			<template v-else>the finish time is what matters.</template>
		</p>

		<div v-if="note" class="rp-note">
			<span class="rp-note-title"><n-icon :component="FlagOutline" /> {{ note.title }}</span>
			<span>{{ note.body }}</span>
		</div>
	</section>
</template>

<style scoped>
.race-plan { padding: 15px 17px; }
.panel-head h2 { display: flex; align-items: center; gap: 7px; }
.rp-sub { font-size: 0.8rem; color: var(--text-muted); margin-left: auto; }

.rp-verdict {
	font-size: 0.82rem;
	line-height: 1.5;
	color: var(--text-secondary);
	background: var(--surface-2);
	border-left: 2px solid var(--border-strong);
	border-radius: var(--radius-sm);
	padding: 9px 12px;
	margin-bottom: 14px;
}
.rp-verdict.good { border-left-color: var(--success-color); }
.rp-verdict.warn { border-left-color: var(--warning-color); }
.rp-verdict.bad { border-left-color: var(--danger-color); }

.rp-keys {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
	margin-bottom: 14px;
}
.rp-key {
	display: flex;
	flex-direction: column;
	gap: 2px;
	background: var(--surface-2);
	border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
	padding: 10px 12px;
}
.rp-lbl {
	font-size: 0.66rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}
.rp-val { font-size: 1.35rem; font-weight: 700; line-height: 1.1; }
.rp-unit { font-size: 0.7rem; color: var(--text-muted); }

.rp-strategy { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.rp-tab {
	font: inherit;
	font-size: 0.75rem;
	padding: 5px 11px;
	border-radius: 999px;
	border: 1px solid var(--border-color);
	background: transparent;
	color: var(--text-secondary);
	cursor: pointer;
}
.rp-tab:hover { background: var(--surface-hover); color: var(--text-color); }
.rp-tab.active {
	background: var(--primary-soft);
	border-color: var(--primary-color);
	color: var(--primary-color);
}

.rp-splits {
	border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
	overflow: hidden;
}
.rp-row {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr 1fr;
	gap: 8px;
	padding: 7px 12px;
	font-size: 0.85rem;
	align-items: center;
}
.rp-row + .rp-row { border-top: 1px solid var(--border-subtle); }
.rp-head {
	background: var(--surface-2);
	font-size: 0.66rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}
.rp-dim { color: var(--text-muted); }

.rp-note {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-top: 12px;
	padding: 10px 12px;
	border-radius: var(--radius-sm);
	background: var(--primary-soft);
	font-size: 0.8rem;
	line-height: 1.5;
	color: var(--text-secondary);
}
.rp-note-title {
	display: flex;
	align-items: center;
	gap: 6px;
	font-weight: 600;
	color: var(--primary-color);
}

@media (max-width: 560px) {
	.rp-keys { grid-template-columns: 1fr; }
	.rp-row { grid-template-columns: 0.8fr 1fr 1fr 1fr; font-size: 0.8rem; padding: 7px 9px; }
}
</style>
