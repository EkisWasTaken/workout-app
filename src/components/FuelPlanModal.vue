<script setup lang="ts">
/**
 * Turn a goal weight into daily calorie and macro targets.
 *
 * The training plan says what to run. This says what to eat while running it,
 * and — the part people actually want — whether the goal weight and the date
 * they've picked are compatible at all.
 *
 * Two things make it different from the calculator on every fitness site:
 *
 *   1. It reads the *schedule*. A 30 km Saturday and a rest Sunday get
 *      different targets, because they are different days. Nothing here
 *      multiplies BMR by a vague "very active" factor and calls it a plan.
 *
 *   2. It projects week by week rather than dividing once. Losing weight makes
 *      you cheaper to run and cheaper to keep alive, so the same deficit buys
 *      less each month — which is exactly why people stall in month three and
 *      conclude the maths was a lie.
 *
 * Nothing is saved to the schedule: this is a readout, not a writer. The only
 * thing it can persist is the handful of body stats it needs, and only when you
 * press the button.
 */
import { computed, ref, watch } from 'vue'
import { NButton, NInputNumber, NSelect, useMessage } from 'naive-ui'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import CustomModal from './CustomModal.vue'
import { settings, saveSettings, bodyStats, ageFromBirthYear, pendingMigration } from '@/settings'
import { MISSING_GOALS_COLUMNS } from '@/db'
import { isOwner, GENERIC_SCHEMA_MESSAGE } from '@/owner'
import { currentWeightKg as storedWeightKg } from '@/stats'
import {
	ACTIVITY_LEVELS, SPORT_LABELS, buildEnergyPlan, energyProblems,
	type ActivityLevel, type EnergyPlanInput, type EnergySession, type Sex,
} from '@/utils/energy'

const props = withDefaults(defineProps<{
	show: boolean
	/** Everything on the calendar that costs energy, in the window being planned. */
	sessions: EnergySession[]
	/** Where those sessions came from, so the numbers are attributable. */
	sourceLabel?: string
	/** Plan through this date. Defaults to the last session, or twelve weeks out. */
	endDate?: string | null
	/**
	 * Today's trend weight, when the caller already has the weigh-ins loaded.
	 * The Home statistics store is the usual source, but the schedule page
	 * doesn't load it — and opening this there must not show an empty field.
	 */
	currentWeightKg?: number | null
}>(), {
	sourceLabel: 'your schedule',
	endDate: null,
	currentWeightKg: null,
})

const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>()

const message = useMessage()
const saving = ref(false)
const expanded = ref<number | null>(null)

const todayISO = () => format(new Date(), 'yyyy-MM-dd')

// ─── form ─────────────────────────────────────────────────────────────────────

const weightKg = ref<number | null>(null)
const goalKg = ref<number | null>(null)
const throughDate = ref('')

// Body stats are edited here as well as in Profile, because being sent to
// another page to type your height and back again to see a number is the
// quickest way to lose someone halfway through.
const heightCm = ref<number | null>(null)
const birthYear = ref<number | null>(null)
const sex = ref<Sex | null>(null)
const activityLevel = ref<ActivityLevel | null>(null)
const showStats = ref(false)

const SEX_OPTIONS = [
	{ label: 'Male', value: 'male' },
	{ label: 'Female', value: 'female' },
]
const ACTIVITY_OPTIONS = ACTIVITY_LEVELS.map(a => ({ label: a.label, value: a.value }))

/** The last date anything is scheduled on — the natural end of the window. */
const lastSessionDate = computed(() =>
	props.sessions.reduce((latest, s) => (s.date > latest ? s.date : latest), ''))

function defaultEnd(): string {
	if (props.endDate) return props.endDate
	const last = lastSessionDate.value
	if (last && last > todayISO()) return last
	return format(addDays(new Date(), 12 * 7), 'yyyy-MM-dd')
}

/** Re-prefill every time it opens, from the profile and the latest trend weight. */
watch(() => props.show, open => {
	if (!open) return
	expanded.value = null
	// One decimal: the trend carries two, and a scale that reads 79.97 implies a
	// precision body weight does not have.
	const trend = props.currentWeightKg ?? storedWeightKg.value
	weightKg.value = trend === null ? null : Math.round(trend * 10) / 10
	goalKg.value = settings.goalWeight
	throughDate.value = defaultEnd()
	heightCm.value = settings.heightCm
	birthYear.value = settings.birthYear
	sex.value = settings.sex
	activityLevel.value = settings.activityLevel
	// Open the stats section only when it's the thing standing in the way.
	showStats.value = !bodyStats.value
}, { immediate: true })

const age = computed(() => ageFromBirthYear(birthYear.value))

/** True once every field the equations need has a usable value. */
const statsReady = computed(() =>
	age.value !== null && !!heightCm.value && !!sex.value)

const statsChanged = computed(() =>
	heightCm.value !== settings.heightCm ||
	birthYear.value !== settings.birthYear ||
	sex.value !== settings.sex ||
	activityLevel.value !== settings.activityLevel)

const input = computed<EnergyPlanInput | null>(() => {
	if (!statsReady.value || !weightKg.value || !goalKg.value || !throughDate.value) return null
	return {
		startWeightKg: weightKg.value,
		goalWeightKg: goalKg.value,
		heightCm: heightCm.value!,
		age: age.value!,
		sex: sex.value!,
		activityLevel: activityLevel.value ?? 'sedentary',
		startDate: todayISO(),
		endDate: throughDate.value,
		sessions: props.sessions,
	}
})

const problems = computed(() => (input.value ? energyProblems(input.value) : []))
const plan = computed(() => (input.value ? buildEnergyPlan(input.value) : null))

/**
 * The week you are in right now, which is the only one that changes what you do
 * today. Everything after it is a projection and can wait until it arrives.
 */
const thisWeek = computed(() => {
	if (!plan.value) return null
	const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
	return plan.value.weeks.find(w => w.startDate === monday) ?? plan.value.weeks[0]
})

const today = computed(() => thisWeek.value?.days.find(d => d.date === todayISO()) ?? null)

// ─── formatting ───────────────────────────────────────────────────────────────

const kcal = (n: number) => Math.round(n).toLocaleString()
const kg = (n: number) => n.toFixed(1)
const signed = (n: number) => `${n > 0 ? '−' : n < 0 ? '+' : ''}${Math.abs(Math.round(n)).toLocaleString()}`
const weekLabel = (startDate: string) =>
	`${format(parseISO(startDate), 'd MMM')} – ${format(addDays(parseISO(startDate), 6), 'd MMM')}`
const dayLabel = (date: string) => format(parseISO(date), 'EEE d')
const prettyDate = (date: string) => format(parseISO(date), 'd MMM yyyy')
const sportsLabel = (sports: string[]) =>
	sports.length ? sports.map(s => SPORT_LABELS[s as keyof typeof SPORT_LABELS] ?? s).join(' + ') : 'Rest'

// ─── saving the stats ─────────────────────────────────────────────────────────

async function saveStats() {
	saving.value = true
	try {
		await saveSettings({
			heightCm: heightCm.value,
			birthYear: birthYear.value === null ? null : Math.round(birthYear.value),
			sex: sex.value,
			activityLevel: activityLevel.value,
			// The goal weight belongs to the profile too, so changing it here is
			// the same edit as changing it there rather than a second copy of it.
			goalWeight: goalKg.value,
		})
		message.success('Saved to your profile')
	} catch (e: any) {
		console.error('Could not save body stats', e)
		// A missing migration is not a failed connection, and saying so sends
		// people to check their wifi over something only SQL can fix.
		if (e?.message === MISSING_GOALS_COLUMNS) {
			message.warning(isOwner.value
				? `Saved to this browser only — run ${pendingMigration.script ?? 'the pending migration'} in Supabase to store it on your account.`
				: GENERIC_SCHEMA_MESSAGE)
		} else {
			message.error('Saved to this browser, but the database write failed')
		}
	} finally {
		saving.value = false
	}
}
</script>

<template>
	<CustomModal :show="show" title="Fuel plan" @update:show="emit('update:show', $event)">
		<div class="fp-form">
			<label class="fp-field">
				<span class="fp-lbl">Weight now (kg)</span>
				<n-input-number v-model:value="weightKg" :min="30" :max="250" :step="0.1" size="small" />
			</label>
			<label class="fp-field">
				<span class="fp-lbl">Goal weight (kg)</span>
				<n-input-number v-model:value="goalKg" :min="30" :max="250" :step="0.1" size="small" />
			</label>
			<label class="fp-field">
				<span class="fp-lbl">Through</span>
				<input v-model="throughDate" type="date" class="date-input" />
			</label>
		</div>
		<p class="fp-hint">
			Weight now is prefilled with your <strong>trend</strong> weight, not this morning's reading —
			one weigh-in moves a kilo on hydration alone. Training energy is read from
			{{ sourceLabel }}: {{ sessions.length }} session{{ sessions.length === 1 ? '' : 's' }} in range.
		</p>

		<!-- Body stats. Shown open when they're what's missing, tucked away once set. -->
		<div class="fp-stats">
			<button class="fp-stats-head" @click="showStats = !showStats">
				<span>About you</span>
				<span v-if="!statsReady" class="fp-needed">needed</span>
				<span v-else class="fp-stats-sum">
					{{ heightCm }} cm · {{ age }} · {{ sex === 'male' ? 'male' : 'female' }}
				</span>
				<span class="fp-caret">{{ showStats ? '−' : '+' }}</span>
			</button>
			<div v-if="showStats" class="fp-stats-body">
				<div class="fp-form">
					<label class="fp-field">
						<span class="fp-lbl">Height (cm)</span>
						<n-input-number v-model:value="heightCm" :min="120" :max="230" size="small" />
					</label>
					<label class="fp-field">
						<span class="fp-lbl">Year of birth</span>
						<n-input-number v-model:value="birthYear" :min="1900" :max="2020" size="small" />
					</label>
					<label class="fp-field">
						<span class="fp-lbl">Sex</span>
						<n-select v-model:value="sex" :options="SEX_OPTIONS" size="small" placeholder="Not set" />
					</label>
					<label class="fp-field fp-wide">
						<span class="fp-lbl">Your day outside training</span>
						<n-select v-model:value="activityLevel" :options="ACTIVITY_OPTIONS" size="small"
							placeholder="Desk job, little walking" />
					</label>
				</div>
				<p class="fp-hint">
					Resting metabolism depends on height, age and sex as well as weight, so all three are
					needed before this can give you a number instead of a guess. "Your day" covers work and
					errands only — every session on your schedule is counted separately, so choosing a busier
					option here would count your training twice.
				</p>
				<n-button v-if="statsChanged" size="small" :loading="saving" @click="saveStats">
					Save to my profile
				</n-button>
			</div>
		</div>

		<div v-for="p in problems" :key="p.field + p.message" class="fp-problem">{{ p.message }}</div>

		<p v-if="!statsReady && !problems.length" class="fp-problem">
			Fill in your height, year of birth and sex above and the plan appears here.
		</p>

		<template v-if="plan">
			<!-- Today first: the only row that changes what you do in the next hour. -->
			<div v-if="today" class="fp-today">
				<div class="fp-today-head">
					<span class="fp-today-lbl">Today · {{ sportsLabel(today.sports) }}</span>
					<span class="fp-today-burn">burn ~{{ kcal(today.burnKcal) }} kcal</span>
				</div>
				<div class="fp-today-main">
					<span class="fp-today-val mono">{{ kcal(today.intakeKcal) }}</span>
					<span class="fp-today-unit">kcal to eat</span>
				</div>
				<div class="fp-macros">
					<span><strong class="mono">{{ today.macros.proteinG }}</strong>g protein</span>
					<span><strong class="mono">{{ today.macros.carbsG }}</strong>g carbs</span>
					<span><strong class="mono">{{ today.macros.fatG }}</strong>g fat</span>
				</div>
			</div>

			<div class="fp-summary">
				<span>eat <strong class="mono">{{ kcal(plan.avgIntakePerDay) }}</strong>/day avg</span>
				<span>burn <strong class="mono">{{ kcal(plan.avgBurnPerDay) }}</strong>/day avg</span>
				<span>
					{{ plan.avgDeficitPerDay >= 0 ? 'deficit' : 'surplus' }}
					<strong class="mono">{{ kcal(Math.abs(plan.avgDeficitPerDay)) }}</strong>/day
				</span>
				<span>
					{{ kg(plan.startWeightKg) }} → <strong class="mono">{{ kg(plan.projectedWeightKg) }}</strong> kg
				</span>
			</div>

			<div v-for="(n, i) in plan.notes" :key="i" class="fp-note" :class="n.level">{{ n.message }}</div>

			<div class="fp-weeks">
				<div v-for="w in plan.weeks" :key="w.index" class="fp-week"
					:class="{ 'fp-week-now': thisWeek?.index === w.index }">
					<button class="fp-week-head" @click="expanded = expanded === w.index ? null : w.index">
						<span class="fp-wk">Wk {{ w.index }}</span>
						<span class="fp-dates">{{ weekLabel(w.startDate) }}</span>
						<span v-if="w.capped" class="fp-capped" title="Held back to a safe rate">capped</span>
						<span class="fp-weight mono">{{ kg(w.startWeightKg) }} → {{ kg(w.endWeightKg) }}</span>
						<span class="fp-def mono" :class="{ surplus: w.deficitPerDay < 0 }">
							{{ signed(w.deficitPerDay) }}
						</span>
						<span class="fp-caret">{{ expanded === w.index ? '−' : '+' }}</span>
					</button>
					<div v-if="expanded === w.index" class="fp-days">
						<div class="fp-day fp-day-head">
							<span></span><span></span><span>burn</span><span>eat</span><span>P / C / F</span>
						</div>
						<div v-for="d in w.days" :key="d.date" class="fp-day"
							:class="{ 'fp-day-today': d.date === todayISO() }">
							<span class="fp-dayname mono">{{ dayLabel(d.date) }}</span>
							<span class="fp-sport">{{ sportsLabel(d.sports) }}</span>
							<span class="mono">{{ kcal(d.burnKcal) }}</span>
							<span class="mono fp-eat">{{ kcal(d.intakeKcal) }}</span>
							<span class="mono fp-pcf">
								{{ d.macros.proteinG }} / {{ d.macros.carbsG }} / {{ d.macros.fatG }}
							</span>
						</div>
						<p class="fp-week-note">
							Training costs {{ kcal(w.trainingKcal) }} kcal this week, on top of
							{{ kcal(w.baselineKcal) }} a day just being you
							(resting rate {{ kcal(w.bmrKcal) }}).
						</p>
					</div>
				</div>
			</div>

			<p class="fp-foot">
				Protein and fat are set by body weight and stay the same every day — carbohydrate carries
				the training, which is what long runs actually run on. Weigh in a few times a week and let
				the trend, not any single number here, tell you whether it's working: if your weight isn't
				moving the way this predicts after three weeks, the intake is the number to adjust, not
				the plan.
				<template v-if="plan.goalDate">
					Projected to reach {{ kg(plan.goalWeightKg) }} kg around
					<strong>{{ prettyDate(plan.goalDate) }}</strong>.
				</template>
			</p>
		</template>

		<div class="fp-actions">
			<n-button size="small" @click="emit('update:show', false)">Close</n-button>
		</div>
	</CustomModal>
</template>

<style scoped>
.fp-form {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
	margin-bottom: 10px;
}
.fp-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.fp-wide { grid-column: 1 / -1; }
.fp-lbl {
	font-size: 0.68rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}
.fp-hint { margin: 0 0 12px; font-size: 0.74rem; line-height: 1.5; color: var(--text-muted); }

/* Safari gives date inputs an intrinsic width they won't shrink below unless
   appearance is cleared, which is enough to push a whole row off a phone.
   16px keeps iOS from zooming the page in when the field takes focus. */
.date-input {
	background: var(--surface-2); border: 1px solid var(--border-color);
	color: var(--text-color); padding: 6px 10px; font-family: var(--font-family);
	font-size: 0.86rem; border-radius: var(--radius-sm); outline: none;
	-webkit-appearance: none; appearance: none;
	box-sizing: border-box; min-width: 0; min-height: 34px; width: 100%;
}
@media (max-width: 768px) { .date-input { font-size: 16px; min-height: 38px; } }
.date-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-soft); }

.fp-stats {
	border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
	background: var(--surface-2);
	margin-bottom: 12px;
	overflow: hidden;
}
.fp-stats-head {
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
.fp-stats-head:hover { background: var(--surface-hover); }
.fp-stats-sum { margin-left: auto; font-size: 0.76rem; color: var(--text-muted); }
.fp-needed {
	margin-left: auto;
	font-size: 0.62rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--warning-soft);
	color: var(--warning-color);
}
.fp-stats-body { padding: 10px 12px 12px; border-top: 1px solid var(--border-subtle); }
.fp-stats-body .fp-hint { margin-bottom: 8px; }

.fp-problem {
	font-size: 0.8rem;
	line-height: 1.5;
	padding: 8px 11px;
	border-radius: var(--radius-sm);
	background: var(--danger-soft);
	color: var(--danger-color);
	margin-bottom: 10px;
}

.fp-today {
	padding: 12px 14px;
	margin-bottom: 12px;
	border-radius: var(--radius-sm);
	border-left: 2px solid var(--primary-color);
	background: var(--surface-2);
}
.fp-today-head { display: flex; align-items: baseline; gap: 10px; }
.fp-today-lbl {
	font-size: 0.68rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-secondary);
}
.fp-today-burn { margin-left: auto; font-size: 0.74rem; color: var(--text-muted); }
.fp-today-main { display: flex; align-items: baseline; gap: 6px; margin-top: 2px; }
.fp-today-val { font-size: 1.7rem; font-weight: 600; line-height: 1.1; color: var(--text-color); }
.fp-today-unit { font-size: 0.8rem; color: var(--text-muted); }
.fp-macros { display: flex; gap: 16px; margin-top: 6px; font-size: 0.78rem; color: var(--text-secondary); }
.fp-macros strong { color: var(--text-color); }

.fp-summary {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
	padding: 10px 12px;
	margin-bottom: 10px;
	border-radius: var(--radius-sm);
	background: var(--surface-2);
	font-size: 0.8rem;
	color: var(--text-secondary);
}
.fp-summary strong { color: var(--text-color); }

.fp-note {
	font-size: 0.78rem;
	line-height: 1.55;
	padding: 8px 11px;
	border-radius: var(--radius-sm);
	margin-bottom: 8px;
	background: var(--surface-2);
	color: var(--text-secondary);
}
.fp-note.warn { background: var(--warning-soft); color: var(--warning-color); }
.fp-note.error { background: var(--danger-soft); color: var(--danger-color); }

.fp-weeks {
	border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
	overflow: hidden;
	max-height: 300px;
	overflow-y: auto;
	margin-top: 4px;
}
.fp-week + .fp-week { border-top: 1px solid var(--border-subtle); }
.fp-week-now { background: var(--primary-soft); }
.fp-week-head {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 8px 12px;
	background: transparent;
	border: none;
	color: var(--text-color);
	font: inherit;
	font-size: 0.8rem;
	cursor: pointer;
	text-align: left;
}
.fp-week-head:hover { background: var(--surface-hover); }
.fp-wk { color: var(--text-muted); font-size: 0.72rem; width: 38px; flex-shrink: 0; }
.fp-dates { color: var(--text-secondary); font-size: 0.74rem; }
.fp-capped {
	font-size: 0.62rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 1px 6px;
	border-radius: 999px;
	background: var(--warning-soft);
	color: var(--warning-color);
}
.fp-weight { margin-left: auto; font-size: 0.76rem; color: var(--text-secondary); }
.fp-def { font-size: 0.78rem; color: var(--primary-color); width: 52px; text-align: right; }
.fp-def.surplus { color: var(--success-color); }
.fp-caret { color: var(--text-muted); width: 10px; text-align: center; }

.fp-days { padding: 2px 12px 8px; }
.fp-day {
	display: grid;
	grid-template-columns: 58px 1fr 52px 52px 86px;
	gap: 8px;
	padding: 3px 0;
	font-size: 0.75rem;
	color: var(--text-secondary);
	align-items: baseline;
}
.fp-day > :nth-child(n + 3) { text-align: right; }
.fp-day-head {
	font-size: 0.64rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--text-muted);
	border-bottom: 1px solid var(--border-subtle);
	padding-bottom: 4px;
	margin-bottom: 2px;
}
.fp-day-today .fp-dayname, .fp-day-today .fp-sport { color: var(--primary-color); font-weight: 600; }
.fp-dayname { color: var(--text-muted); }
.fp-sport { color: var(--text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fp-eat { color: var(--text-color); font-weight: 600; }
.fp-pcf { color: var(--text-muted); }
.fp-week-note { margin: 8px 0 0; font-size: 0.72rem; line-height: 1.5; color: var(--text-muted); }

.fp-foot { font-size: 0.76rem; line-height: 1.55; color: var(--text-muted); margin: 12px 0 0; }
.fp-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }

@media (max-width: 600px) {
	.fp-form { grid-template-columns: 1fr 1fr; }
	.fp-day { grid-template-columns: 50px 1fr 48px 48px; }
	.fp-pcf { display: none; }
	.fp-day-head > :nth-child(5) { display: none; }
}
</style>
