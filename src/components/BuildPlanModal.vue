<script setup lang="ts">
/**
 * Generate a training plan and write it onto the schedule.
 *
 * The preview is the point. Nothing is saved until you have seen every week it
 * intends to create, because a generator that silently writes sixty sessions
 * into your calendar is a generator you stop trusting the first time it gets
 * one wrong.
 */
import { computed, ref, watch } from 'vue'
import {
	NButton, NCheckbox, NCheckboxGroup, NDatePicker, NInputNumber, NSelect, NSpace, useMessage,
} from 'naive-ui'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import CustomModal from './CustomModal.vue'
import { db } from '@/db'
import {
	buildPlan, planProblems, planSessions, PHASE_LABELS, WEEKDAYS, dayOfWeek,
	type PlanInput,
} from '@/utils/planBuilder'
import type { RaceGoal, Workout } from '@/types'

const props = defineProps<{
	show: boolean
	races: RaceGoal[]
	existing: Workout[]
	/** Average weekly kilometres recently, to prefill "where you are now". */
	recentWeeklyKm: number
	/** Weekdays the athlete usually lifts on, prefilled from their own history. */
	gymDays: number[]
}>()

const emit = defineEmits<{
	(e: 'update:show', v: boolean): void
	(e: 'created'): void
}>()

const message = useMessage()
const saving = ref(false)
const expanded = ref<number | null>(null)

// ─── form ─────────────────────────────────────────────────────────────────────

const raceId = ref<number | null>(null)
const startTs = ref<number>(Date.now())
const runsPerWeek = ref(4)
const startKm = ref(30)
const peakKm = ref(45)
const longRunDay = ref(6)
const easyOnlyDays = ref<number[]>([])

/** Only races ahead of us can be trained for. */
const raceOptions = computed(() =>
	props.races
		.filter(r => r.date >= format(new Date(), 'yyyy-MM-dd') && r.distance_km)
		.sort((a, b) => a.date.localeCompare(b.date))
		.map(r => ({
			label: `${r.name} · ${r.distance_km} km · ${format(parseISO(r.date), 'd MMM yyyy')}`,
			value: r.id,
		})))

const race = computed(() => props.races.find(r => r.id === raceId.value) ?? null)

/**
 * Long runs go on the race's own weekday when that's a weekend — rehearsing the
 * day as well as the distance. Midweek races are rare and nobody wants a 25 km
 * Tuesday, so those fall back to Saturday.
 */
function defaultLongRunDay(r: RaceGoal | null): number {
	if (!r) return 6
	const d = dayOfWeek(r.date)
	return d === 0 || d === 6 ? d : 6
}

/** Re-prefill whenever the dialog opens, from the athlete's actual history. */
watch(() => props.show, open => {
	if (!open) return
	expanded.value = null
	raceId.value = raceOptions.value[0]?.value ?? null
	startTs.value = Date.now()
	easyOnlyDays.value = [...props.gymDays]
	const base = Math.round(props.recentWeeklyKm)
	if (base > 0) {
		startKm.value = base
		peakKm.value = Math.round(base * 1.5)
	}
	longRunDay.value = defaultLongRunDay(race.value)
})

watch(raceId, () => { longRunDay.value = defaultLongRunDay(race.value) })

const input = computed<PlanInput | null>(() => {
	const r = race.value
	if (!r || !r.distance_km) return null
	return {
		startDate: format(new Date(startTs.value), 'yyyy-MM-dd'),
		raceDate: r.date,
		raceName: r.name,
		distanceM: r.distance_km * 1000,
		runsPerWeek: runsPerWeek.value,
		startKm: startKm.value,
		peakKm: peakKm.value,
		longRunDay: longRunDay.value,
		easyOnlyDays: easyOnlyDays.value,
	}
})

const problems = computed(() => (input.value ? planProblems(input.value) : []))
const plan = computed(() => (input.value ? buildPlan(input.value) : null))
const sessions = computed(() => (plan.value ? planSessions(plan.value) : []))

/**
 * Sessions already on the calendar inside the plan's window. Generating on top
 * of an existing plan is the most likely way to end up with a doubled schedule,
 * so it gets said out loud before anything is written.
 */
const clashes = computed(() => {
	if (!plan.value || !input.value) return 0
	const from = format(startOfWeek(parseISO(input.value.startDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
	return props.existing.filter(w => w.date >= from && w.date <= plan.value!.raceDate).length
})

const weekLabel = (startDate: string) =>
	`${format(parseISO(startDate), 'd MMM')} – ${format(addDays(parseISO(startDate), 6), 'd MMM')}`

const dayLabel = (date: string) => format(parseISO(date), 'EEE d')

// ─── saving ───────────────────────────────────────────────────────────────────

async function create() {
	if (!plan.value || saving.value) return
	saving.value = true
	let added = 0
	try {
		for (const s of sessions.value) {
			await db.addWorkout({
				date: s.date,
				name: s.name,
				type: s.type,
				// The zone, not a pace: the number is derived from fitness at render time.
				targetPace: s.zone,
				distance: s.distanceKm,
				notes: s.notes ?? '',
				isCompleted: 0,
			} as Omit<Workout, 'id'>)
			added++
		}
		message.success(`Plan created — ${added} sessions added.`)
		emit('created')
		emit('update:show', false)
	} catch (e) {
		console.error('Plan creation failed', e)
		message.error(added
			? `Stopped after ${added} sessions. Check your connection and remove the partial plan before retrying.`
			: "Couldn't create the plan. Check your connection and try again.")
	} finally {
		saving.value = false
	}
}
</script>

<template>
	<CustomModal :show="show" title="Build a training plan" @update:show="emit('update:show', $event)">
		<div v-if="!raceOptions.length" class="bp-empty">
			<p>A plan needs a race to aim at, with a date and a distance.</p>
			<router-link to="/profile" class="stat-inline-link">Add a race goal in Profile →</router-link>
		</div>

		<template v-else>
			<div class="bp-form">
				<label class="bp-field bp-wide">
					<span class="bp-lbl">Race</span>
					<n-select v-model:value="raceId" :options="raceOptions" size="small" />
				</label>

				<label class="bp-field">
					<span class="bp-lbl">Start from</span>
					<n-date-picker v-model:value="startTs" type="date" size="small" />
				</label>

				<label class="bp-field">
					<span class="bp-lbl">Long run on</span>
					<n-select
						v-model:value="longRunDay"
						:options="WEEKDAYS.map(d => ({ label: d.label, value: d.value }))"
						size="small"
					/>
				</label>

				<label class="bp-field">
					<span class="bp-lbl">Runs per week</span>
					<n-input-number v-model:value="runsPerWeek" :min="2" :max="7" size="small" />
				</label>

				<label class="bp-field">
					<span class="bp-lbl">Weekly km now</span>
					<n-input-number v-model:value="startKm" :min="5" :max="250" size="small" />
				</label>

				<label class="bp-field">
					<span class="bp-lbl">Peak weekly km</span>
					<n-input-number v-model:value="peakKm" :min="5" :max="250" size="small" />
				</label>

				<div class="bp-field bp-wide">
					<span class="bp-lbl">Keep hard running off these days</span>
					<n-checkbox-group v-model:value="easyOnlyDays">
						<n-space :size="10">
							<n-checkbox v-for="d in WEEKDAYS" :key="d.value" :value="d.value" :label="d.label.slice(0, 3)" />
						</n-space>
					</n-checkbox-group>
					<span class="bp-hint">Prefilled from the days you usually lift. Easy runs still go here.</span>
				</div>
			</div>

			<div v-for="p in problems" :key="p.field" class="bp-problem">{{ p.message }}</div>

			<template v-if="plan">
				<div class="bp-summary">
					<span><strong>{{ plan.weeks.length }}</strong> weeks</span>
					<span><strong>{{ sessions.length }}</strong> sessions</span>
					<span><strong>{{ plan.totalKm }}</strong> km total</span>
					<span>peak <strong>{{ plan.peakKm }}</strong> km</span>
				</div>

				<div v-if="clashes" class="bp-problem warn">
					{{ clashes }} session{{ clashes === 1 ? '' : 's' }} already exist in this date range. This adds to
					them rather than replacing them — delete the old plan first if you don't want both.
				</div>

				<div class="bp-weeks">
					<div v-for="w in plan.weeks" :key="w.index" class="bp-week">
						<button class="bp-week-head" @click="expanded = expanded === w.index ? null : w.index">
							<span class="bp-wk">Wk {{ w.index }}</span>
							<span class="bp-dates">{{ weekLabel(w.startDate) }}</span>
							<span class="bp-phase" :class="w.phase">{{ PHASE_LABELS[w.phase] }}</span>
							<span v-if="w.deload" class="bp-deload">deload</span>
							<span class="bp-km mono">{{ w.targetKm }} km</span>
							<span class="bp-caret">{{ expanded === w.index ? '−' : '+' }}</span>
						</button>
						<div v-if="expanded === w.index" class="bp-sessions">
							<div v-for="s in w.sessions" :key="s.date + s.name" class="bp-session">
								<span class="bp-day mono">{{ dayLabel(s.date) }}</span>
								<span class="bp-name">{{ s.name }}</span>
								<span class="bp-zone">{{ s.zone }}</span>
								<span class="bp-dist mono">{{ s.distanceKm }} km</span>
							</div>
						</div>
					</div>
				</div>

				<p class="bp-note">
					Sessions are saved with a zone, not a pace — the actual numbers come from your current
					fitness every time you look at them, so the plan re-paces itself as you improve.
				</p>
			</template>

			<div class="bp-actions">
				<n-button size="small" @click="emit('update:show', false)">Cancel</n-button>
				<n-button
					type="primary"
					size="small"
					:disabled="!plan || saving"
					:loading="saving"
					@click="create"
				>Add {{ sessions.length }} sessions to schedule</n-button>
			</div>
		</template>
	</CustomModal>
</template>

<style scoped>
.bp-empty { text-align: center; padding: 20px 0; color: var(--text-secondary); font-size: 0.88rem; }

.bp-form {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
	margin-bottom: 14px;
}
.bp-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.bp-wide { grid-column: 1 / -1; }
.bp-lbl {
	font-size: 0.68rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}
.bp-hint { font-size: 0.72rem; color: var(--text-muted); }

.bp-problem {
	font-size: 0.8rem;
	line-height: 1.5;
	padding: 8px 11px;
	border-radius: var(--radius-sm);
	background: var(--danger-soft);
	color: var(--danger-color);
	margin-bottom: 10px;
}
.bp-problem.warn { background: var(--warning-soft); color: var(--warning-color); }

.bp-summary {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
	padding: 10px 12px;
	margin-bottom: 12px;
	border-radius: var(--radius-sm);
	background: var(--surface-2);
	font-size: 0.8rem;
	color: var(--text-secondary);
}
.bp-summary strong { color: var(--text-color); font-family: var(--font-mono); }

.bp-weeks {
	border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
	overflow: hidden;
	max-height: 320px;
	overflow-y: auto;
}
.bp-week + .bp-week { border-top: 1px solid var(--border-subtle); }
.bp-week-head {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 8px 12px;
	background: transparent;
	border: none;
	color: var(--text-color);
	font: inherit;
	font-size: 0.82rem;
	cursor: pointer;
	text-align: left;
}
.bp-week-head:hover { background: var(--surface-hover); }
.bp-wk { color: var(--text-muted); font-size: 0.72rem; width: 38px; flex-shrink: 0; }
.bp-dates { color: var(--text-secondary); font-size: 0.76rem; }
.bp-phase {
	font-size: 0.62rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--surface-2);
	color: var(--text-secondary);
}
.bp-phase.peak { background: var(--primary-soft); color: var(--primary-color); }
.bp-phase.taper { background: var(--color-running-soft); color: var(--color-running-primary); }
.bp-deload { font-size: 0.62rem; color: var(--text-muted); }
.bp-km { margin-left: auto; font-size: 0.78rem; }
.bp-caret { color: var(--text-muted); width: 10px; text-align: center; }

.bp-sessions { padding: 2px 12px 8px 60px; }
.bp-session {
	display: grid;
	grid-template-columns: 60px 1fr auto auto;
	gap: 10px;
	padding: 3px 0;
	font-size: 0.76rem;
	color: var(--text-secondary);
	align-items: baseline;
}
.bp-day { color: var(--text-muted); }
.bp-name { color: var(--text-color); }
.bp-zone { color: var(--primary-color); font-size: 0.72rem; }
.bp-dist { color: var(--text-muted); }

.bp-note { font-size: 0.76rem; line-height: 1.5; color: var(--text-muted); margin: 10px 0 0; }

.bp-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }

@media (max-width: 600px) {
	.bp-form { grid-template-columns: 1fr 1fr; }
	.bp-sessions { padding-left: 12px; }
	.bp-session { grid-template-columns: 52px 1fr auto; }
	.bp-zone { display: none; }
}
</style>
