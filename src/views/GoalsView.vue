<template>
	<div class="goals-view-wrapper">
		<div class="goals-content">
			<h1 class="page-title">Goals &amp; races</h1>
			<p class="page-hint">
				Your running fitness, the goals you're chasing and the races on your calendar.
				Every pace on the schedule is worked out from what's on this page.
			</p>

			<div v-if="goalsMigration" class="schema-warning">
				<n-icon :component="WarningOutline" />
				<div v-if="isOwner">
					<strong>Database migration pending.</strong>
					Run <code>{{ goalsMigration }}</code> in the Supabase SQL editor.
					<template v-if="goalsMigration === 'supabase_goals_v2.sql'">
						Everything below works, except goal dates, race results and the VDOT override.
					</template>
					<template v-else-if="goalsMigration === 'supabase_goals_v3.sql'">
						Everything below works, except a race's course terrain.
					</template>
					<template v-else>
						Until then, goal times can't be saved at all.
					</template>
				</div>
				<div v-else>
					<strong>Some settings are temporarily unavailable.</strong>
					{{ GENERIC_SCHEMA_MESSAGE }}
				</div>
			</div>

			<!-- Fitness pairs with the paces it produces; goals pair with the paces
			     they demand. Two stacks rather than a plain grid, so a short card
			     never locks its row to a tall neighbour. -->
			<div class="board">
				<div class="board-stack">
				<!-- Running fitness -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Running fitness (VDOT)</span></template>
					<p class="card-hint">
						VDOT is a single number for your current running fitness, worked out from race results
						and hard runs. Every training pace on your schedule comes from it.
						<template v-if="derivedFitness">
							Right now your data suggests <strong>{{ derivedFitness.vdot }}</strong> {{ derivedSourceLabel }}.
						</template>
						<template v-else>
							There isn't enough data to work it out yet — log a race below or import a hard run.
						</template>
					</p>
					<n-form-item label="Set it yourself (optional)">
						<n-input v-model:value="form.vdotOverride" :placeholder="derivedFitness ? `leave empty to use ${derivedFitness.vdot}` : 'e.g. 44'" />
					</n-form-item>
					<p class="card-hint tight">
						Only needed if you know better than your data — say, after a race you didn't log.
						Training runs tend to underestimate it; a logged race result is used automatically.
					</p>
					<n-button @click="saveVdot" type="primary" :loading="saving">Save</n-button>
				</n-card>

				<!-- Training paces, from current fitness -->
				<n-card v-if="currentVdot !== null" bordered class="settings-card">
					<template #header>
						<span class="card-title">Training paces</span>
						<span class="card-badge">VDOT {{ currentVdot }}</span>
					</template>
					<p class="card-hint">
						From your <strong>current fitness</strong>, not your goal — these are the paces
						your body can absorb today. Every easy, threshold and VO₂ session on the schedule
						shows the pace from this table, recalculated as your fitness changes.
					</p>
					<div class="pace-table">
						<div v-for="z in paces" :key="z.key" class="pace-row">
							<span class="pace-zone">{{ z.label }}</span>
							<span class="pace-val mono">{{ fmtPaceRange(z) }}<span class="pace-unit">/km</span></span>
						</div>
					</div>

					<div class="equiv">
						<span class="equiv-title">What you could race today</span>
						<div class="equiv-row">
							<div v-for="(secs, key) in equivalents" :key="key" class="equiv-cell">
								<span class="equiv-lbl">{{ DISTANCE_LABELS[key] }}</span>
								<span class="equiv-val mono">{{ fmtTime(secs) }}</span>
							</div>
						</div>
					</div>
				</n-card>

				</div>

				<div class="board-stack">
				<!-- Distance goals -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Goal times</span></template>
					<p class="card-hint">
						A target time and, optionally, the date you want it by. The soonest dated
						goal is the one you're <em>training for</em>; it sets your race-pace sessions.
						Leave the date blank for a someday goal — it's tracked, but won't touch your paces.
					</p>

					<div class="dg-list">
						<div class="dg-row dg-head">
							<span></span><span>Target time</span><span>By date (optional)</span><span title="The fitness this time requires">Needs</span><span></span>
						</div>
						<div v-for="d in distanceRows" :key="d.key" class="dg-row">
							<span class="dg-label">{{ d.label }}</span>
							<n-input
								v-model:value="d.input.time"
								:placeholder="d.placeholder"
								class="dg-input"
								@blur="commitDistanceGoal(d.key)"
								@keyup.enter="commitDistanceGoal(d.key)"
							/>
							<input v-model="d.input.date" type="date" class="date-input dg-date"
								@change="commitDistanceGoal(d.key)" />
							<span v-if="d.vdot" class="dg-vdot">{{ d.vdot }}</span>
							<span v-else class="dg-vdot muted">—</span>
							<n-button v-if="d.hasGoal" size="tiny" quaternary @click="removeDistanceGoal(d.key)">Clear</n-button>
							<span v-else class="dg-spacer"></span>
						</div>
					</div>

					<p v-if="badTimeInput" class="dg-error">
						<n-icon :component="WarningOutline" /> Couldn't read that time. Use <code>44:30</code>, <code>1:42:00</code>, or a bare number of minutes.
					</p>

					<div v-if="activeTarget" class="dg-active">
						<n-icon :component="FlagOutline" />
						<div>
							Next up: <strong>{{ activeTarget.name }}</strong>
							({{ fmtTime(activeTarget.goalTimeSecs) }}, VDOT {{ activeTarget.neededVdot }})
							<span v-if="activeTarget.date"> on {{ activeTarget.date }}</span>.
							Each race-pace session uses whichever goal comes next after that session's date —
							change a goal and the schedule re-paces itself.
						</div>
					</div>
				</n-card>

				<!-- Race pace for every goal -->
				<n-card v-if="goalPaceRows.length" bordered class="settings-card">
					<template #header><span class="card-title">Goal race paces</span></template>
					<p class="card-hint">
						The pace each goal demands, and what you'd run that distance at today.
						Race-pace sessions on the schedule use these automatically.
					</p>
					<div class="gp-table">
						<div class="gp-row gp-head">
							<span>Goal</span><span>Time</span><span>Pace</span><span>Needs</span><span>You'd run</span>
						</div>
						<div v-for="g in goalPaceRows" :key="g.key" class="gp-row" :class="{ reached: g.reached }">
							<span class="gp-name">
								{{ g.name }}
								<span v-if="g.hilly" class="gp-hilly" title="Terrain-adjusted">⛰</span>
							</span>
							<span class="mono">{{ g.goalTime }}</span>
							<span class="mono gp-pace">{{ g.goalPace }}<span class="pace-unit">/km</span></span>
							<span class="gp-vdot">{{ g.neededVdot }}</span>
							<span class="mono gp-today" :class="g.reached ? 'good' : 'off'">{{ g.todayTime }}</span>
						</div>
					</div>
					<p class="card-hint tight" style="margin-top: 12px">
						<strong>Needs</strong> is the VDOT the goal requires; you're at
						<strong>{{ currentVdot }}</strong>. <strong>You'd run</strong> is your predicted
						finish on that course today. ⛰ marks a course adjusted for terrain.
					</p>
				</n-card>

				</div>

				<!-- Full width: a row per race, each carrying a date, distance, goal,
				     result and terrain. Halved, it wraps into unreadable stacks. -->
				<n-card id="goals-races" bordered class="settings-card board-wide">
					<template #header><span class="card-title">Races</span></template>
					<p class="card-hint">
						Log what you actually ran in the <em>Result</em> field. A race is a maximal
						effort, so it's the most trustworthy read on your current fitness — better
						than anything we can infer from training runs.
					</p>

					<div v-if="racesMissingGoalTime.length" class="dg-inconsistent">
						<n-icon :component="WarningOutline" />
						<div>
							<strong>No goal time set</strong> for
							<span v-for="(r, i) in racesMissingGoalTime" :key="r.id">
								{{ i ? ', ' : '' }}{{ r.name }}
							</span>.
							Without a distance <em>and</em> a goal time, a race can't pace its own sessions —
							they fall through to whichever goal comes next, which may be months away.
						</div>
					</div>

					<div class="rg-form">
						<label class="rg-field rg-name"><span>Race</span><n-input v-model:value="newRace.name" placeholder="e.g. Stockholm Half" /></label>
						<label class="rg-field"><span>Date</span><input v-model="newRace.date" type="date" class="date-input" /></label>
						<label class="rg-field rg-km"><span>Distance (km)</span><n-input v-model:value="newRace.distanceKm" placeholder="21.1" /></label>
						<label class="rg-field rg-time"><span>Goal time</span><n-input v-model:value="newRace.time" placeholder="1:45:00" /></label>
						<label class="rg-field rg-prio"><span title="A = the race you're peaking for; B and C are tune-ups">Priority</span><n-select v-model:value="newRace.priority" :options="priorityOptions" /></label>
						<n-button @click="addRace" type="primary" class="rg-add" :disabled="!newRace.name || !newRace.date">Add race</n-button>
					</div>

					<div v-if="raceGoals.list.length" class="race-goals-list">
						<div v-for="goal in raceGoals.list" :key="goal.id" class="race-goal-item">
							<div class="race-goal-info">
								<span class="rg-prio-tag" :class="'prio-' + (goal.priority || 'A')">{{ goal.priority || 'A' }}</span>
								<n-icon :component="FlagOutline" />
								<span class="rg-goal-name">{{ goal.name }}</span>
								<span class="goal-date">{{ goal.date }}</span>
								<span v-if="goal.distance_km" class="goal-meta">{{ goal.distance_km }} km</span>
								<span v-if="goal.goal_time_secs" class="goal-meta mono">goal {{ fmtTime(goal.goal_time_secs) }}</span>
								<span v-if="goal.result_time_secs" class="goal-meta mono result-tag">ran {{ fmtTime(goal.result_time_secs) }}</span>
								<span v-if="resultVdot(goal)" class="goal-meta vdot-tag">VDOT {{ resultVdot(goal) }}</span>
							</div>
							<div class="rg-actions">
								<n-select
									v-if="goal.distance_km"
									:value="goal.terrain_factor ?? 1"
									:options="TERRAIN_OPTIONS"
									size="small" class="rg-terrain"
									@update:value="f => commitTerrain(goal, f)"
								/>
								<n-input
									v-if="goal.distance_km && isPast(goal)"
									:value="resultInputs[goal.id] ?? ''"
									size="small" placeholder="Your time" class="rg-result"
									@update:value="v => resultInputs[goal.id] = v"
									@blur="commitResult(goal)"
									@keyup.enter="commitResult(goal)"
								/>
								<n-button @click="removeRace(goal.id)" size="small" type="error" ghost>Delete</n-button>
							</div>
						</div>
					</div>
					<div v-else class="status-text">No races yet. Add one above and it shows as a countdown across the app.</div>
				</n-card>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NInput, NButton, NFormItem, NSelect, useMessage, NIcon } from 'naive-ui'
import { FlagOutline, WarningOutline } from '@vicons/ionicons5'
import { db, MISSING_GOALS_COLUMNS } from '@/db'
import {
	settings, distanceGoals, raceGoals, pendingMigration, activeTarget, targets, racesMissingGoalTime,
	saveSettings, setDistanceGoal, clearDistanceGoal, refreshRaceGoals, hydrateSettings,
} from '@/settings'
import { currentVdot, derivedFitness, hydrateFitness } from '@/fitness'
import { isOwner, GENERIC_SCHEMA_MESSAGE } from '@/owner'
import {
	DISTANCES, DISTANCE_LABELS, paceTable, equivalentTimes, vdotFromRace,
	raceTimeOnCourse, coursePaceSecPerKm, TERRAIN_PRESETS,
	parseTime, fmtTime, fmtPace, fmtPaceRange, type DistanceKey,
} from '@/utils/vdot'
import type { RaceGoal, RacePriority } from '@/types'

const message = useMessage()
const route = useRoute()
const router = useRouter()
const saving = ref(false)
const badTimeInput = ref(false)

/** Only the migrations that touch this page; body stats belong to Profile. */
const GOALS_MIGRATIONS = ['supabase_goals.sql', 'supabase_goals_v2.sql', 'supabase_goals_v3.sql']
const goalsMigration = computed(() =>
	GOALS_MIGRATIONS.includes(pendingMigration.script ?? '') ? pendingMigration.script : null)

/**
 * Turn a migration sentinel into something actionable — for whoever can act on
 * it. A friend can't run SQL, so they get told what happened, not what to type.
 */
const failed = (e: any, fallback: string) => {
	if (e?.message !== MISSING_GOALS_COLUMNS) return message.error(fallback)
	// Name the migration that is actually outstanding. This used to always say
	// supabase_goals_v2.sql, which sent people to run a file they had already
	// applied while the one they needed went unmentioned.
	return message.error(isOwner.value
		? `Saved to this browser only — run ${pendingMigration.script ?? 'the pending migration'} in Supabase to store it on your account.`
		: GENERIC_SCHEMA_MESSAGE)
}

const num = (s: string) => {
	const n = parseFloat(s)
	return s.trim() !== '' && Number.isFinite(n) ? n : null
}

// ─── running fitness ──────────────────────────────────────────────────────────
const form = reactive({ vdotOverride: '' })

const derivedSourceLabel = computed(() => {
	const d = derivedFitness.value
	if (!d) return ''
	return d.source === 'race' ? `from ${d.label}` : `from ${d.label}${d.stale ? ', stale' : ''}`
})

async function saveVdot() {
	const vdot = num(form.vdotOverride)
	if (vdot !== null && (vdot < 20 || vdot > 90)) {
		message.error('VDOT should be between 20 and 90')
		return
	}
	saving.value = true
	try {
		await saveSettings({ vdotOverride: vdot })
		message.success('Saved')
	} catch (e) {
		failed(e, 'Saved locally, but the database write failed')
	} finally {
		saving.value = false
	}
}

// ─── distance goals ───────────────────────────────────────────────────────────
const inputs: Record<DistanceKey, { time: string; date: string }> = {
	'5k': reactive({ time: '', date: '' }),
	'10k': reactive({ time: '', date: '' }),
	half: reactive({ time: '', date: '' }),
	marathon: reactive({ time: '', date: '' }),
}

const PLACEHOLDERS: Record<DistanceKey, string> = {
	'5k': '20:00', '10k': '44:30', half: '1:30:00', marathon: '3:35:00',
}

function loadDistanceInputs() {
	for (const key of Object.keys(DISTANCES) as DistanceKey[]) {
		const g = distanceGoals[DISTANCES[key]]
		inputs[key].time = g ? fmtTime(g.secs) : ''
		inputs[key].date = g?.date ?? ''
	}
}

const goalVdotFor = (key: DistanceKey) => {
	const g = distanceGoals[DISTANCES[key]]
	return g ? vdotFromRace(DISTANCES[key], g.secs) : null
}

const distanceRows = computed(() =>
	(Object.keys(DISTANCES) as DistanceKey[]).map(key => ({
		key,
		label: DISTANCE_LABELS[key],
		placeholder: PLACEHOLDERS[key],
		input: inputs[key],
		vdot: goalVdotFor(key),
		hasGoal: distanceGoals[DISTANCES[key]] !== undefined,
	})),
)

async function commitDistanceGoal(key: DistanceKey) {
	const raw = inputs[key].time.trim()
	const m = DISTANCES[key]

	if (raw === '') {
		badTimeInput.value = false
		if (distanceGoals[m] !== undefined) await removeDistanceGoal(key)
		return
	}

	const secs = parseTime(raw)
	if (secs === null || vdotFromRace(m, secs) === null) {
		badTimeInput.value = true
		return
	}
	badTimeInput.value = false

	const date = inputs[key].date.trim() || null
	const existing = distanceGoals[m]
	if (existing && existing.secs === secs && existing.date === date) return

	try {
		await setDistanceGoal(m, secs, date)
		inputs[key].time = fmtTime(secs)
	} catch (e) {
		failed(e, 'Failed to save goal')
	}
}

async function removeDistanceGoal(key: DistanceKey) {
	try {
		await clearDistanceGoal(DISTANCES[key])
		inputs[key].time = ''
		inputs[key].date = ''
	} catch {
		message.error('Failed to clear goal')
	}
}

// ─── paces, from CURRENT fitness (not the goal) ───────────────────────────────
const paces = computed(() => (currentVdot.value === null ? [] : paceTable(currentVdot.value)))

const equivalents = computed(() =>
	currentVdot.value === null
		? ({} as Record<DistanceKey, number>)
		: equivalentTimes(currentVdot.value))

/**
 * Race pace for every goal, plus what you'd run that distance at today. These
 * are the paces race-pace sessions on the schedule resolve to.
 */
const goalPaceRows = computed(() => {
	const cur = currentVdot.value
	return targets.value
		.slice()
		.sort((a, b) => a.distanceM - b.distanceM)
		.map(t => ({
			key: t.key,
			name: t.name,
			goalTime: fmtTime(t.goalTimeSecs),
			// The pace you actually hold on the day, hills included.
			goalPace: fmtPace(Math.round((t.goalTimeSecs / t.distanceM) * 1000)),
			neededVdot: t.neededVdot,
			hilly: t.terrainFactor !== 1,
			todayTime: cur === null ? '—' : fmtTime(raceTimeOnCourse(cur, t.distanceM, t.terrainFactor)),
			todayPace: cur === null ? '—' : fmtPace(coursePaceSecPerKm(cur, t.distanceM, t.terrainFactor)),
			reached: cur !== null && cur >= t.neededVdot,
		}))
})

const TERRAIN_OPTIONS = TERRAIN_PRESETS.map(t => ({ label: `${t.label} (${t.factor.toFixed(2)}×)`, value: t.factor }))

async function commitTerrain(goal: RaceGoal, factor: number) {
	if ((goal.terrain_factor ?? 1) === factor) return
	try {
		await db.updateRaceGoal({ ...goal, terrain_factor: factor })
		await refreshRaceGoals()
		message.success('Course updated')
	} catch (e) {
		failed(e, 'Failed to save course')
	}
}

// ─── race results ─────────────────────────────────────────────────────────────
const resultInputs = reactive<Record<number, string>>({})

const isPast = (g: RaceGoal) => g.date <= new Date().toISOString().slice(0, 10)

const resultVdot = (g: RaceGoal) =>
	g.distance_km && g.result_time_secs ? vdotFromRace(g.distance_km * 1000, g.result_time_secs) : null

function loadResultInputs() {
	for (const g of raceGoals.list) {
		resultInputs[g.id] = g.result_time_secs ? fmtTime(g.result_time_secs) : ''
	}
}

async function commitResult(goal: RaceGoal) {
	const raw = (resultInputs[goal.id] ?? '').trim()
	const secs = raw === '' ? null : parseTime(raw)

	if (raw !== '' && secs === null) {
		message.error("Couldn't read that time")
		return
	}
	if (secs === (goal.result_time_secs ?? null)) return

	try {
		await db.updateRaceGoal({ ...goal, result_time_secs: secs })
		await refreshRaceGoals()
		loadResultInputs()
		message.success(secs === null ? 'Result cleared' : 'Result saved')
	} catch (e) {
		failed(e, 'Failed to save result')
	}
}

// ─── races ────────────────────────────────────────────────────────────────────
const priorityOptions = [
	{ label: 'A — main goal', value: 'A' },
	{ label: 'B — important', value: 'B' },
	{ label: 'C — tune-up', value: 'C' },
]

const newRace = reactive({ name: '', date: '', distanceKm: '', time: '', priority: 'A' as RacePriority })

async function addRace() {
	if (!newRace.name || !newRace.date) return
	const secs = newRace.time.trim() ? parseTime(newRace.time) : null
	if (newRace.time.trim() && secs === null) {
		message.error('Couldn\'t read that goal time')
		return
	}
	try {
		await db.addRaceGoal({
			name: newRace.name,
			date: newRace.date,
			distance_km: num(newRace.distanceKm),
			goal_time_secs: secs,
			priority: newRace.priority,
		})
		Object.assign(newRace, { name: '', date: '', distanceKm: '', time: '', priority: 'A' })
		await refreshRaceGoals()
		loadResultInputs()
		window.dispatchEvent(new CustomEvent('race-goals-updated'))
		message.success('Race added')
	} catch {
		message.error("Couldn't save that race. Check your connection and try again.")
	}
}

async function removeRace(id: number) {
	try {
		await db.deleteRaceGoal(id)
		await refreshRaceGoals()
		window.dispatchEvent(new CustomEvent('race-goals-updated'))
		message.success('Race removed')
	} catch {
		message.error("Couldn't delete that race. Check your connection and try again.")
	}
}

onMounted(async () => {
	await Promise.all([hydrateSettings(), hydrateFitness()])
	form.vdotOverride = settings.vdotOverride?.toString() ?? ''
	loadDistanceInputs()
	loadResultInputs()
	focusFromQuery()
})

/**
 * `?focus=races` scrolls to the Races card and highlights it for a moment. The
 * Home checklist and the plan builder link here to add a race, and the card sits
 * below the fold.
 */
async function focusFromQuery() {
	if (route.query.focus !== 'races') return
	const { focus: _drop, ...rest } = route.query
	router.replace({ query: rest })
	await nextTick()
	const el = document.getElementById('goals-races')
	if (!el) return
	el.scrollIntoView({ behavior: 'smooth', block: 'start' })
	el.classList.add('focus-flash')
	setTimeout(() => el.classList.remove('focus-flash'), 1800)
}
</script>

<style scoped>
.goals-view-wrapper { width: 100%; min-height: 100%; }
#goals-races { scroll-margin-top: 16px; transition: box-shadow 0.4s; }
#goals-races.focus-flash { box-shadow: 0 0 0 2px var(--primary-color); }
.goals-content { padding: 24px 28px 40px; max-width: 1180px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .goals-content { padding: 16px 16px 32px; } }

.page-title { margin-bottom: 6px; }
.page-hint { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 18px; line-height: 1.5; max-width: 620px; }
.card-title { font-size: 1rem; font-weight: 600; color: var(--text-color); }
.card-badge {
	margin-left: 10px; font-size: 0.72rem; font-weight: 600; color: var(--primary-color);
	background: var(--primary-soft); padding: 2px 8px; border-radius: 999px;
}
.settings-card { border-radius: var(--radius) !important; }
/* Naive's default 24px card gutter costs a seventh of a 375px screen. */
@media (max-width: 620px) {
	.settings-card :deep(.n-card__content),
	.settings-card :deep(.n-card-header) { padding-left: 14px; padding-right: 14px; }
}

.card-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 14px; line-height: 1.5; }

.schema-warning, .dg-inconsistent {
	display: flex; gap: 10px; align-items: flex-start;
	padding: 12px 14px; margin-bottom: 18px;
	background: var(--danger-soft); border: 1px solid var(--danger-color);
	border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.5;
}
.dg-inconsistent { margin: 14px 0 0; background: var(--surface-2); border-color: var(--border-color); }
.schema-warning code, .dg-error code { font-family: var(--font-mono, monospace); font-size: 0.78rem; }

/* Naive pins form labels to `white-space: nowrap`; the longer ones here ("Max
   heart rate — leave empty to use highest recorded") then run off a phone. */
.settings-card :deep(.n-form-item-label) { white-space: normal; line-height: 1.4; }

.card-hint.tight { margin: -4px 0 10px; }

.rg-field { display: flex; flex-direction: column; gap: 4px; }
.rg-field > span { font-size: 0.7rem; color: var(--text-muted); }
.rg-add { align-self: flex-end; }
.derived-hint { color: var(--text-muted); font-weight: 400; }
.derived-hint strong { color: var(--primary-color); }

/* Distance goals */
.dg-list { display: flex; flex-direction: column; gap: 8px; }
.dg-row { display: grid; grid-template-columns: 1.15fr 1fr 150px 52px 60px; gap: 10px; align-items: center; }
.dg-head { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.dg-label { font-size: 0.88rem; color: var(--text-color); }
.dg-date { width: 100%; }
.dg-vdot { font-size: 0.8rem; font-weight: 600; color: var(--primary-color); text-align: right; }
.dg-vdot.muted { color: var(--text-muted); font-weight: 400; }
.dg-spacer { width: 44px; }
.dg-error { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--danger-color); margin: 10px 0 0; }

.dg-active {
	display: flex; gap: 10px; align-items: flex-start;
	margin-top: 14px; padding: 11px 13px;
	background: var(--primary-soft); border-radius: var(--radius-sm);
	font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);
}
.dg-active strong { color: var(--text-color); }

/* On a phone the five columns can't survive as columns. Each goal becomes its
   own small card: name and VDOT on top, then the time, then the date and Clear.
   The header row is dropped, so the VDOT figure labels itself. */
@media (max-width: 620px) {
	.dg-list { gap: 10px; }
	.dg-row {
		grid-template-columns: 1fr auto;
		grid-template-areas: "label vdot" "time time" "date clear";
		gap: 8px 10px;
		padding: 12px; background: var(--surface-2);
		border: 1px solid var(--border-color); border-radius: var(--radius-sm);
	}
	.dg-head { display: none; }
	.dg-row > :nth-child(1) { grid-area: label; }
	.dg-row > :nth-child(2) { grid-area: time; }
	.dg-row > :nth-child(3) { grid-area: date; }
	.dg-row > :nth-child(4) { grid-area: vdot; }
	.dg-row > :nth-child(5) { grid-area: clear; justify-self: end; align-self: center; }
	.dg-label { font-weight: 600; }
	.dg-vdot::before { content: 'VDOT '; font-weight: 400; color: var(--text-muted); }
	.dg-vdot.muted::before { content: 'VDOT '; }
	.dg-spacer { display: none; }
}

/* Pace table */
.pace-table { display: flex; flex-direction: column; gap: 2px; }
.pace-row {
	display: flex; justify-content: space-between; align-items: baseline;
	padding: 9px 12px; background: var(--surface-2);
	border-radius: var(--radius-sm);
}
.pace-row-race { background: var(--primary-soft); }
.pace-zone { font-size: 0.86rem; color: var(--text-secondary); }
.pace-val { font-size: 0.95rem; font-weight: 600; color: var(--text-color); }
.pace-unit { font-size: 0.72rem; color: var(--text-muted); margin-left: 2px; font-weight: 400; }

.equiv { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-color); }
.equiv-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.equiv-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
.equiv-cell { display: flex; flex-direction: column; gap: 3px; }
.equiv-lbl { font-size: 0.68rem; color: var(--text-muted); }
.equiv-val { font-size: 0.88rem; font-weight: 600; color: var(--text-color); }
@media (max-width: 560px) { .equiv-row { grid-template-columns: repeat(2, 1fr); } }

/* Races */
.rg-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin-bottom: 14px; }
.rg-name { flex: 2 1 160px; }
.rg-km { flex: 0 1 80px; }
.rg-time { flex: 0 1 110px; }
.rg-prio { flex: 0 1 110px; }

.status-text { font-size: 0.8rem; color: var(--text-muted); }
.race-goals-list { display: flex; flex-direction: column; gap: 8px; }
.race-goal-item {
	display: flex; justify-content: space-between; align-items: center; gap: 10px;
	padding: 10px 14px; background: var(--surface-2);
	border: 1px solid var(--border-color); border-radius: var(--radius-sm);
}
.race-goal-info { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-color); flex-wrap: wrap; min-width: 0; }
.rg-goal-name { font-weight: 500; }
.rg-prio-tag {
	font-size: 0.66rem; font-weight: 700; width: 18px; height: 18px;
	display: inline-flex; align-items: center; justify-content: center;
	border-radius: 4px; flex-shrink: 0;
}
.prio-A { background: var(--primary-fill); color: var(--on-primary); }
.prio-B { background: var(--surface-hover); color: var(--text-secondary); }
.prio-C { background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); }
.goal-date { color: var(--text-muted); font-size: 0.82rem; }
.goal-meta { font-size: 0.78rem; color: var(--text-secondary); }
.vdot-tag { color: var(--primary-color); font-weight: 600; }
.result-tag { color: var(--success-color); font-weight: 600; }
.rg-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.rg-result { width: 96px; }
.rg-terrain { width: 168px; }
.gp-hilly { margin-left: 4px; opacity: 0.7; cursor: help; }

/* A race row is info on the left and three controls on the right. At 375px the
   controls alone are wider than the screen, so the row stacks and the controls
   share a line of their own. */
@media (max-width: 620px) {
	.rg-form { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.rg-form > * { min-width: 0; }
	.rg-name, .rg-prio, .rg-form > button { grid-column: 1 / -1; }
	.rg-form .date-input { width: 100%; }

	.race-goal-item { flex-direction: column; align-items: stretch; gap: 12px; }
	.rg-actions { flex-wrap: wrap; }
	.rg-terrain { flex: 1 1 100%; width: auto; }
	.rg-result { flex: 1 1 0; width: auto; }
	.rg-actions > button { flex: 0 0 auto; }
}

/* Goal race paces */
.gp-table { display: flex; flex-direction: column; gap: 2px; }
.gp-row {
	display: grid; grid-template-columns: 1.4fr 0.9fr 0.9fr 0.6fr 0.9fr;
	gap: 8px; align-items: baseline;
	padding: 9px 12px; background: var(--surface-2); border-radius: var(--radius-sm);
	font-size: 0.85rem;
}
.gp-head {
	background: transparent; padding-top: 0; padding-bottom: 4px;
	font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);
}
.gp-row.reached { background: var(--success-soft); }
.gp-name { font-weight: 500; color: var(--text-color); }
.gp-pace { font-weight: 700; color: var(--text-color); }
.gp-vdot { color: var(--text-muted); font-size: 0.78rem; }
.gp-today.good { color: var(--success-color); }
.gp-today.off { color: var(--text-secondary); }
@media (max-width: 560px) {
	.gp-row { grid-template-columns: 1.2fr 0.9fr 0.9fr; }
	.gp-vdot, .gp-head span:nth-child(4), .gp-head span:nth-child(5), .gp-today { display: none; }
}

/* Safari gives date inputs an intrinsic width they won't shrink below unless
   appearance is cleared, which is enough to push a whole row off a phone.
   16px keeps iOS from zooming the page in when the field takes focus. */
.date-input {
	background: var(--surface-2); border: 1px solid var(--border-color);
	color: var(--text-color); padding: 7px 10px; font-family: var(--font-family);
	font-size: 0.88rem; border-radius: var(--radius-sm); outline: none;
	-webkit-appearance: none; appearance: none;
	box-sizing: border-box; min-width: 0; min-height: 34px;
}
@media (max-width: 768px) { .date-input { font-size: 16px; min-height: 38px; } }
.date-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-soft); }
</style>
