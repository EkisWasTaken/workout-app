<template>
	<div class="profile-view-wrapper">
		<div class="profile-content">
			<h1 class="page-title">Profile &amp; goals</h1>

			<div v-if="schemaMissing.value" class="schema-warning">
				<n-icon :component="WarningOutline" />
				<div>
					<strong>Goals database not set up yet.</strong>
					Run <code>supabase_goals.sql</code> in the Supabase SQL editor.
					Until then, preferences save to this browser only, and goal times can't be saved at all.
				</div>
			</div>

			<n-space vertical size="large" style="width: 100%">
				<!-- Preferences -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Preferences</span></template>
					<n-space vertical>
						<n-form-item label="Your name">
							<n-input v-model:value="form.userName" placeholder="Enter your name" />
						</n-form-item>
						<n-form-item label="Goal body weight (kg)">
							<n-input v-model:value="form.goalWeight" placeholder="e.g. 75.5" />
						</n-form-item>
						<n-form-item label="Resting heart rate (bpm)">
							<n-input v-model:value="form.restingHR" placeholder="e.g. 55" />
						</n-form-item>
						<n-form-item label="Max heart rate (bpm) — leave empty to use highest recorded">
							<n-input v-model:value="form.maxHR" placeholder="e.g. 195" />
						</n-form-item>
						<n-button @click="savePrefs" type="primary" :loading="saving">Save preferences</n-button>
					</n-space>
				</n-card>

				<!-- Distance goals -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Goal times</span></template>
					<p class="card-hint">
						Set a target for any distance. Each implies a VDOT — the fitness level
						it would take to run it — which is what your training paces come from.
					</p>

					<div class="dg-list">
						<div v-for="d in distanceRows" :key="d.key" class="dg-row">
							<span class="dg-label">{{ d.label }}</span>
							<n-input
								v-model:value="d.input.value"
								:placeholder="d.placeholder"
								class="dg-input"
								@blur="commitDistanceGoal(d.key)"
								@keyup.enter="commitDistanceGoal(d.key)"
							/>
							<span v-if="d.vdot" class="dg-vdot">VDOT {{ d.vdot }}</span>
							<span v-else class="dg-vdot muted">—</span>
							<n-button v-if="d.hasGoal" size="tiny" quaternary @click="removeDistanceGoal(d.key)">Clear</n-button>
							<span v-else class="dg-spacer"></span>
						</div>
					</div>

					<p v-if="badTimeInput" class="dg-error">
						<n-icon :component="WarningOutline" /> Couldn't read that time. Use <code>44:30</code>, <code>1:42:00</code>, or a bare number of minutes.
					</p>

					<div v-if="inconsistentGoals.length" class="dg-inconsistent">
						<n-icon :component="WarningOutline" />
						<div>
							These goals don't imply the same fitness. Paces come from
							<strong>VDOT {{ goalVdot }}</strong>:
							<span v-for="g in inconsistentGoals" :key="g.key" class="dg-chip">
								{{ DISTANCE_LABELS[g.key] }} implies {{ g.vdot }}
								({{ g.delta > 0 ? '+' : '' }}{{ g.delta }})
							</span>
						</div>
					</div>
				</n-card>

				<!-- Derived paces -->
				<n-card v-if="goalVdot !== null" bordered class="settings-card">
					<template #header>
						<span class="card-title">Training paces</span>
						<span class="card-badge">VDOT {{ goalVdot }}</span>
					</template>
					<p class="card-hint">
						Derived from your goal, not overwritten onto your plan. The schedule shows
						these next to a session's own pace when they disagree.
					</p>
					<div class="pace-table">
						<div v-for="z in paces" :key="z.key" class="pace-row">
							<span class="pace-zone">{{ z.label }}</span>
							<span class="pace-val mono">{{ fmtPaceRange(z) }}<span class="pace-unit">/km</span></span>
						</div>
						<div v-if="nextRacePace" class="pace-row pace-row-race">
							<span class="pace-zone">{{ nextRace!.name }} pace</span>
							<span class="pace-val mono">{{ fmtPace(nextRacePace) }}<span class="pace-unit">/km</span></span>
						</div>
					</div>

					<div class="equiv">
						<span class="equiv-title">Equivalent times at this fitness</span>
						<div class="equiv-row">
							<div v-for="(secs, key) in equivalents" :key="key" class="equiv-cell">
								<span class="equiv-lbl">{{ DISTANCE_LABELS[key] }}</span>
								<span class="equiv-val mono">{{ fmtTime(secs) }}</span>
							</div>
						</div>
					</div>
				</n-card>

				<!-- Race goals -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Races</span></template>

					<div class="rg-form">
						<n-input v-model:value="newRace.name" placeholder="Event name" class="rg-name" />
						<input v-model="newRace.date" type="date" class="date-input" />
						<n-input v-model:value="newRace.distanceKm" placeholder="km" class="rg-km" />
						<n-input v-model:value="newRace.time" placeholder="Goal time" class="rg-time" />
						<n-select v-model:value="newRace.priority" :options="priorityOptions" class="rg-prio" />
						<n-button @click="addRace" type="primary" :disabled="!newRace.name || !newRace.date">Add</n-button>
					</div>

					<div v-if="raceGoals.list.length" class="race-goals-list">
						<div v-for="goal in raceGoals.list" :key="goal.id" class="race-goal-item">
							<div class="race-goal-info">
								<span class="rg-prio-tag" :class="'prio-' + (goal.priority || 'A')">{{ goal.priority || 'A' }}</span>
								<n-icon :component="FlagOutline" />
								<span class="rg-goal-name">{{ goal.name }}</span>
								<span class="goal-date">{{ goal.date }}</span>
								<span v-if="goal.distance_km" class="goal-meta">{{ goal.distance_km }} km</span>
								<span v-if="goal.goal_time_secs" class="goal-meta mono">{{ fmtTime(goal.goal_time_secs) }}</span>
								<span v-if="raceVdot(goal)" class="goal-meta vdot-tag">VDOT {{ raceVdot(goal) }}</span>
							</div>
							<n-button @click="removeRace(goal.id)" size="small" type="error" ghost>Delete</n-button>
						</div>
					</div>
					<div v-else class="status-text">No races yet.</div>
				</n-card>
			</n-space>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { NCard, NSpace, NInput, NButton, NFormItem, NSelect, useMessage, NIcon } from 'naive-ui'
import { FlagOutline, WarningOutline } from '@vicons/ionicons5'
import { db } from '@/db'
import {
	settings, distanceGoals, raceGoals, schemaMissing, goalVdot, goalVdots,
	inconsistentGoals, nextRace, saveSettings, setDistanceGoal, clearDistanceGoal,
	refreshRaceGoals, hydrateSettings,
} from '@/settings'
import {
	DISTANCES, DISTANCE_LABELS, paceTable, racePaceSecPerKm, equivalentTimes,
	vdotFromRace, parseTime, fmtTime, fmtPace, fmtPaceRange, type DistanceKey,
} from '@/utils/vdot'
import type { RaceGoal, RacePriority } from '@/types'

const message = useMessage()
const saving = ref(false)
const badTimeInput = ref(false)

// ─── preferences ──────────────────────────────────────────────────────────────
const form = reactive({ userName: '', goalWeight: '', restingHR: '', maxHR: '' })

function loadForm() {
	form.userName = settings.userName
	form.goalWeight = settings.goalWeight?.toString() ?? ''
	form.restingHR = settings.restingHR.toString()
	form.maxHR = settings.maxHR?.toString() ?? ''
}

const num = (s: string) => {
	const n = parseFloat(s)
	return s.trim() !== '' && Number.isFinite(n) ? n : null
}

async function savePrefs() {
	saving.value = true
	try {
		await saveSettings({
			userName: form.userName,
			goalWeight: num(form.goalWeight),
			restingHR: num(form.restingHR) ?? 60,
			maxHR: num(form.maxHR),
		})
		message.success('Preferences saved')
	} catch {
		message.error('Saved locally, but the database write failed')
	} finally {
		saving.value = false
	}
}

// ─── distance goals ───────────────────────────────────────────────────────────
const inputs: Record<DistanceKey, { value: string }> = {
	'5k': reactive({ value: '' }),
	'10k': reactive({ value: '' }),
	half: reactive({ value: '' }),
	marathon: reactive({ value: '' }),
}

const PLACEHOLDERS: Record<DistanceKey, string> = {
	'5k': '21:30', '10k': '44:30', half: '1:42:00', marathon: '3:35:00',
}

function loadDistanceInputs() {
	for (const key of Object.keys(DISTANCES) as DistanceKey[]) {
		const secs = distanceGoals[DISTANCES[key]]
		inputs[key].value = secs ? fmtTime(secs) : ''
	}
}

const distanceRows = computed(() =>
	(Object.keys(DISTANCES) as DistanceKey[]).map(key => ({
		key,
		label: DISTANCE_LABELS[key],
		placeholder: PLACEHOLDERS[key],
		input: inputs[key],
		vdot: goalVdots.value[key] ?? null,
		hasGoal: distanceGoals[DISTANCES[key]] !== undefined,
	})),
)

async function commitDistanceGoal(key: DistanceKey) {
	const raw = inputs[key].value.trim()
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
	if (distanceGoals[m] === secs) return

	try {
		await setDistanceGoal(m, secs)
		inputs[key].value = fmtTime(secs)
	} catch {
		message.error('Failed to save goal')
	}
}

async function removeDistanceGoal(key: DistanceKey) {
	try {
		await clearDistanceGoal(DISTANCES[key])
		inputs[key].value = ''
	} catch {
		message.error('Failed to clear goal')
	}
}

// ─── derived paces ────────────────────────────────────────────────────────────
const paces = computed(() => (goalVdot.value === null ? [] : paceTable(goalVdot.value)))

const equivalents = computed(() =>
	goalVdot.value === null
		? ({} as Record<DistanceKey, number>)
		: equivalentTimes(goalVdot.value))

const nextRacePace = computed(() => {
	const r = nextRace.value
	if (!r?.distance_km || goalVdot.value === null) return null
	return racePaceSecPerKm(goalVdot.value, r.distance_km * 1000)
})

const raceVdot = (g: RaceGoal) =>
	g.distance_km && g.goal_time_secs ? vdotFromRace(g.distance_km * 1000, g.goal_time_secs) : null

// ─── races ────────────────────────────────────────────────────────────────────
const priorityOptions = [
	{ label: 'A race', value: 'A' },
	{ label: 'B race', value: 'B' },
	{ label: 'C race', value: 'C' },
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
		window.dispatchEvent(new CustomEvent('race-goals-updated'))
		message.success('Race added')
	} catch {
		message.error('Failed to save')
	}
}

async function removeRace(id: number) {
	try {
		await db.deleteRaceGoal(id)
		await refreshRaceGoals()
		window.dispatchEvent(new CustomEvent('race-goals-updated'))
		message.success('Race removed')
	} catch {
		message.error('Failed to delete')
	}
}

onMounted(async () => {
	await hydrateSettings()
	loadForm()
	loadDistanceInputs()
})
</script>

<style scoped>
.profile-view-wrapper { width: 100%; min-height: 100%; }
.profile-content { padding: 24px 28px 40px; max-width: 760px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .profile-content { padding: 16px 16px 32px; } }

.page-title { font-size: 1.5rem; font-weight: 400; margin-bottom: 20px; }
.card-title { font-size: 1rem; font-weight: 600; color: var(--text-color); }
.card-badge {
	margin-left: 10px; font-size: 0.72rem; font-weight: 600; color: var(--primary-color);
	background: var(--primary-soft); padding: 2px 8px; border-radius: 999px;
}
.settings-card { border-radius: var(--radius) !important; }
.card-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 14px; line-height: 1.5; }

.schema-warning, .dg-inconsistent {
	display: flex; gap: 10px; align-items: flex-start;
	padding: 12px 14px; margin-bottom: 18px;
	background: var(--danger-soft); border: 1px solid var(--danger-color);
	border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.5;
}
.dg-inconsistent { margin: 14px 0 0; background: var(--surface-2); border-color: var(--border-color); }
.schema-warning code, .dg-error code { font-family: var(--font-mono, monospace); font-size: 0.78rem; }

/* Distance goals */
.dg-list { display: flex; flex-direction: column; gap: 8px; }
.dg-row { display: grid; grid-template-columns: 1.2fr 1fr auto auto; gap: 10px; align-items: center; }
.dg-label { font-size: 0.88rem; color: var(--text-color); }
.dg-vdot { font-size: 0.76rem; font-weight: 600; color: var(--primary-color); min-width: 68px; text-align: right; }
.dg-vdot.muted { color: var(--text-muted); font-weight: 400; }
.dg-spacer { width: 44px; }
.dg-error { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--danger-color); margin: 10px 0 0; }
.dg-chip { display: inline-block; margin-left: 8px; color: var(--text-secondary); }

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
.rg-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
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
.prio-A { background: var(--primary-color); color: #fff; }
.prio-B { background: var(--surface-hover); color: var(--text-secondary); }
.prio-C { background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); }
.goal-date { color: var(--text-muted); font-size: 0.82rem; }
.goal-meta { font-size: 0.78rem; color: var(--text-secondary); }
.vdot-tag { color: var(--primary-color); font-weight: 600; }

.date-input {
	background: var(--surface-2); border: 1px solid var(--border-color);
	color: var(--text-color); padding: 7px 10px; font-family: var(--font-family);
	border-radius: var(--radius-sm); outline: none;
}
.date-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-soft); }
</style>
