<template>
	<div class="profile-view-wrapper">
		<div class="profile-content">
			<h1 class="page-title">Profile &amp; settings</h1>
			<p class="page-hint">
				About you, your account and how the app looks. Running fitness, goal times and races
				live in <router-link to="/goals" class="stat-inline-link">Goals &amp; races</router-link>.
			</p>

			<!-- Only the owner can act on a pending migration, so only the owner is
			     shown the filename. Everyone else gets plain language. -->
			<div v-if="profileMigration" class="schema-warning">
				<n-icon :component="WarningOutline" />
				<div v-if="isOwner">
					<strong>Database migration pending.</strong>
					Run <code>{{ profileMigration }}</code> in the Supabase SQL editor.
					<template v-if="profileMigration === 'supabase_body_stats.sql'">
						Everything below works, except that your height, year of birth, sex and daily
						activity — the four the fuel planner needs — only save to this browser.
					</template>
					<template v-else>
						Until then, these settings save to this browser only.
					</template>
				</div>
				<div v-else>
					<strong>Some settings are temporarily unavailable.</strong>
					{{ GENERIC_SCHEMA_MESSAGE }}
				</div>
			</div>

			<!-- Your own numbers on the left, the app's settings on the right. In
			     source order — which is what a phone gets — that reads You, Body
			     stats, Heart rate, Account, Appearance. -->
			<div class="board">
				<div class="board-stack">
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">You</span></template>
					<n-form-item label="Name">
						<n-input v-model:value="form.userName" placeholder="What should we call you?" />
					</n-form-item>
					<n-form-item label="Goal body weight (kg)">
						<n-input v-model:value="form.goalWeight" placeholder="optional, e.g. 75.5" />
					</n-form-item>
					<p class="card-hint tight">
						With a goal weight, the Body tab tracks whether your trend is heading toward it and
						roughly when you'll get there.
					</p>
					<n-button @click="savePrefs" type="primary" :loading="saving">Save</n-button>
				</n-card>

				<!-- Split out of "You": three unrelated things in one card is why that
				     card was a thousand pixels tall and its neighbour was empty. Every
				     Save here writes the whole profile — they edit one form. -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Body stats</span></template>
					<p class="card-hint">
						What the fuel planner needs to turn that goal weight into daily calories. Resting
						metabolism depends on height, age and sex as well as weight, so without these it
						would be guessing at an average person who doesn't exist.
					</p>
					<div class="hr-row">
						<n-form-item label="Height (cm)">
							<n-input v-model:value="form.heightCm" placeholder="e.g. 183" />
						</n-form-item>
						<n-form-item label="Year of birth">
							<n-input v-model:value="form.birthYear" :placeholder="`e.g. ${thisYear - 30}`" />
						</n-form-item>
					</div>
					<div class="hr-row">
						<n-form-item label="Sex">
							<n-select v-model:value="form.sex" :options="SEX_OPTIONS" clearable placeholder="Not set" />
						</n-form-item>
						<n-form-item label="Day outside training">
							<n-select v-model:value="form.activityLevel" :options="ACTIVITY_OPTIONS" clearable
								placeholder="Desk job, little walking" />
						</n-form-item>
					</div>
					<p class="card-hint tight">
						<strong>Sex</strong> is a term in the metabolic equation and nothing more — leave it
						empty and the planner stays shut rather than guessing.
						<strong>Day outside training</strong> covers your job and errands only: every session
						on your schedule is counted separately, so picking "very active" here would count
						your training twice.
						<template v-if="bodyStats">
							Right now that works out to a resting rate of about
							<strong>{{ restingRate }}</strong> kcal a day<template v-if="baselineRate">, or
							<strong>{{ baselineRate }}</strong> on a day with no training</template>.
						</template>
					</p>
					<n-button @click="savePrefs" type="primary" :loading="saving">Save</n-button>
				</n-card>
				</div>

				<div class="board-stack">
				<!-- Split out of "You", and grouped with the account cards so both
				     columns come out near the same height. -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Heart rate</span></template>
					<p class="card-hint">
						Heart-rate zones, training load and "pace at heart rate" are all measured against
						these two numbers, so it's worth getting them right.
					</p>
					<div class="hr-row">
						<n-form-item label="Resting (bpm)">
							<n-input v-model:value="form.restingHR" placeholder="e.g. 55" />
						</n-form-item>
						<n-form-item label="Maximum (bpm)">
							<n-input v-model:value="form.maxHR" :placeholder="inferredMaxHR ? `${inferredMaxHR} from your recordings` : 'e.g. 190'" />
						</n-form-item>
					</div>
					<p class="card-hint tight">
						<strong>Resting:</strong> your pulse lying still just after waking.
						<strong>Maximum:</strong> the highest you've seen in an all-out effort. Leave it empty and
						we'll use the highest value in your recordings<template v-if="inferredMaxHR"> (currently {{ inferredMaxHR }} bpm)</template>.
					</p>
					<n-button @click="savePrefs" type="primary" :loading="saving">Save</n-button>
				</n-card>

				<!-- Account: sign out, password, email, delete -->
				<AccountCard />

				<!-- Appearance. The sidebar carries the same toggle, but there is no
				     sidebar on a phone, so this is where it lives there. -->
				<n-card bordered class="settings-card">
					<template #header><span class="card-title">Appearance</span></template>
					<div class="account-row">
						<div class="account-info">
							<span class="account-label">Theme</span>
							<span class="appearance-note">
								Warm charcoal or warm paper. Saved on this device; until you pick one it
								follows your system setting.
							</span>
						</div>
						<div class="theme-choice" role="radiogroup" aria-label="Theme">
							<button
								v-for="opt in THEME_OPTIONS"
								:key="opt.value"
								class="theme-opt"
								:class="{ on: theme === opt.value }"
								role="radio"
								:aria-checked="theme === opt.value"
								@click="setTheme(opt.value)"
							>
								<n-icon :component="opt.icon" />
								<span>{{ opt.label }}</span>
							</button>
						</div>
					</div>
				</n-card>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { NCard, NInput, NButton, NFormItem, NSelect, useMessage, NIcon } from 'naive-ui'
import { MoonOutline, SunnyOutline, WarningOutline } from '@vicons/ionicons5'
import { MISSING_GOALS_COLUMNS } from '@/db'
import { settings, pendingMigration, saveSettings, hydrateSettings, bodyStats } from '@/settings'
import { currentWeightKg, hrSettings, loaded as statsLoaded, loadStats } from '@/stats'
import {
	ACTIVITY_LEVELS, baselineBurn, bmr, type ActivityLevel, type Sex,
} from '@/utils/energy'
import AccountCard from '@/components/AccountCard.vue'
import { isOwner, GENERIC_SCHEMA_MESSAGE } from '@/owner'
import { setTheme, theme, type ThemeName } from '@/theme'

const THEME_OPTIONS: { value: ThemeName; label: string; icon: any }[] = [
	{ value: 'light', label: 'Light', icon: SunnyOutline },
	{ value: 'dark', label: 'Dark', icon: MoonOutline },
]

const message = useMessage()
const saving = ref(false)

/**
 * Migrations that touch this page. goals_v2/v3 only affect running goals and
 * races, so Goals & races warns about those.
 */
const PROFILE_MIGRATIONS = ['supabase_goals.sql', 'supabase_body_stats.sql']
const profileMigration = computed(() =>
	PROFILE_MIGRATIONS.includes(pendingMigration.script ?? '') ? pendingMigration.script : null)

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

// ─── preferences ──────────────────────────────────────────────────────────────
const form = reactive({
	userName: '', goalWeight: '', restingHR: '', maxHR: '',
	heightCm: '', birthYear: '', sex: null as Sex | null, activityLevel: null as ActivityLevel | null,
})

function loadForm() {
	form.userName = settings.userName
	form.goalWeight = settings.goalWeight?.toString() ?? ''
	form.restingHR = settings.restingHR.toString()
	form.maxHR = settings.maxHR?.toString() ?? ''
	form.heightCm = settings.heightCm?.toString() ?? ''
	form.birthYear = settings.birthYear?.toString() ?? ''
	form.sex = settings.sex
	form.activityLevel = settings.activityLevel
}

// ─── body stats ───────────────────────────────────────────────────────────────

const thisYear = new Date().getFullYear()

const SEX_OPTIONS = [
	{ label: 'Male', value: 'male' },
	{ label: 'Female', value: 'female' },
]

const ACTIVITY_OPTIONS = ACTIVITY_LEVELS.map(a => ({ label: a.label, value: a.value }))

/**
 * The saved stats, echoed back as the numbers they produce.
 *
 * A birth year and a height are abstract; "1,810 kcal before you get out of
 * bed" is the thing you can sanity-check against what you know about yourself.
 */
const restingRate = computed(() => {
	const s = bodyStats.value
	const kg = currentWeightKg.value
	return s && kg ? bmr({ weightKg: kg, heightCm: s.heightCm, age: s.age, sex: s.sex }).toLocaleString() : null
})

const baselineRate = computed(() => {
	const s = bodyStats.value
	const kg = currentWeightKg.value
	return s && kg ? baselineBurn({ weightKg: kg, ...s }).toLocaleString() : null
})

const num = (s: string) => {
	const n = parseFloat(s)
	return s.trim() !== '' && Number.isFinite(n) ? n : null
}

/** What max HR falls back to when the field is empty, so the placeholder is honest. */
const inferredMaxHR = computed(() => {
	if (!statsLoaded.value) return null
	const { maxHR, inferred } = hrSettings.value
	return inferred ? maxHR : null
})

async function savePrefs() {
	const rest = num(form.restingHR)
	const max = num(form.maxHR)
	if (rest !== null && (rest < 30 || rest > 110)) {
		message.error('Resting heart rate should be between 30 and 110 bpm')
		return
	}
	if (max !== null && (max < 120 || max > 230)) {
		message.error('Maximum heart rate should be between 120 and 230 bpm')
		return
	}
	if (rest !== null && max !== null && max - rest < 50) {
		message.error("Maximum heart rate should be well above resting — check those two numbers")
		return
	}
	const height = num(form.heightCm)
	const birthYear = num(form.birthYear)
	if (height !== null && (height < 120 || height > 230)) {
		message.error('Height should be between 120 and 230 cm')
		return
	}
	if (birthYear !== null && (thisYear - birthYear < 14 || thisYear - birthYear > 100)) {
		message.error('Year of birth should put you between 14 and 100')
		return
	}
	saving.value = true
	try {
		await saveSettings({
			userName: form.userName,
			goalWeight: num(form.goalWeight),
			restingHR: num(form.restingHR) ?? 60,
			maxHR: num(form.maxHR),
			heightCm: height,
			birthYear: birthYear === null ? null : Math.round(birthYear),
			sex: form.sex,
			activityLevel: form.activityLevel,
		})
		message.success('Saved')
	} catch (e) {
		failed(e, 'Saved locally, but the database write failed')
	} finally {
		saving.value = false
	}
}

onMounted(async () => {
	await Promise.all([hydrateSettings(), statsLoaded.value ? null : loadStats().catch(() => {})])
	loadForm()
})
</script>

<style scoped>
.profile-view-wrapper { width: 100%; min-height: 100%; }
/* 760px was a reading measure, and this page is panels rather than prose — on
   a laptop it left two thirds of the window empty and pushed the lower cards
   below the fold. Wide enough for two columns of cards, still capped so the
   rows never become a tracking exercise on an ultrawide. */
.profile-content { padding: 24px 28px 40px; max-width: 1180px; margin: 0 auto; width: 100%; box-sizing: border-box; }
.profile-content > .board { margin-bottom: 18px; }
@media (max-width: 768px) { .profile-content { padding: 16px 16px 32px; } }

.page-title { margin-bottom: 6px; }
.page-hint { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 18px; line-height: 1.5; max-width: 620px; }
.card-title { font-size: 1rem; font-weight: 600; color: var(--text-color); }
.settings-card { border-radius: var(--radius) !important; }
/* Naive's default 24px card gutter costs a seventh of a 375px screen. */
@media (max-width: 620px) {
	.settings-card :deep(.n-card__content),
	.settings-card :deep(.n-card-header) { padding-left: 14px; padding-right: 14px; }
	.account-row { flex-direction: column; align-items: stretch; }
}

.account-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.account-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.account-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.card-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 14px; line-height: 1.5; }

.schema-warning {
	display: flex; gap: 10px; align-items: flex-start;
	padding: 12px 14px; margin-bottom: 18px;
	background: var(--danger-soft); border: 1px solid var(--danger-color);
	border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.5;
}
.schema-warning code { font-family: var(--font-mono, monospace); font-size: 0.78rem; }

/* Naive pins form labels to `white-space: nowrap`; the longer ones here ("Max
   heart rate — leave empty to use highest recorded") then run off a phone. */
.settings-card :deep(.n-form-item-label) { white-space: normal; line-height: 1.4; }

.card-hint.tight { margin: -4px 0 10px; }
.sub-head { font-size: 0.8rem; font-weight: 600; color: var(--text-color); margin-top: 8px; padding-top: 14px; border-top: 1px solid var(--border-color); }
.hr-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 480px) { .hr-row { grid-template-columns: 1fr; gap: 0; } }
.appearance-note { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; max-width: 52ch; }

.theme-choice {
	display: inline-flex;
	gap: 2px;
	padding: 3px;
	border-radius: var(--radius-sm);
	background: var(--surface-2);
	flex-shrink: 0;
}
.theme-opt {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 7px 14px;
	border: none;
	border-radius: calc(var(--radius-sm) - 3px);
	background: transparent;
	color: var(--text-secondary);
	font: inherit;
	font-size: 0.82rem;
	cursor: pointer;
	transition: background 0.15s, color 0.15s;
}
.theme-opt:hover { color: var(--text-color); }
.theme-opt.on { background: var(--surface-color); color: var(--primary-color); font-weight: 600; }

</style>
