<template>
	<div class="food-view">
		<header class="food-head">
			<h1 class="page-title">Food</h1>
			<div v-if="tab === 'diary'" class="day-nav">
				<button class="nav-btn" aria-label="Previous day" @click="shiftDay(-1)">
					<n-icon :component="ChevronBackOutline" />
				</button>
				<span class="day-label">{{ dayLabel }}</span>
				<button class="nav-btn" aria-label="Next day" @click="shiftDay(1)">
					<n-icon :component="ChevronForwardOutline" />
				</button>
				<button v-if="!isToday" class="today-btn" @click="date = todayISO()">Today</button>
			</div>
		</header>

		<nav class="tabbar" role="tablist" aria-label="Food sections">
			<button v-for="t in TABS" :key="t.key" role="tab" :aria-selected="tab === t.key"
				:class="{ active: tab === t.key }" @click="tab = t.key">
				{{ t.label }}<span v-if="t.count" class="tab-count">{{ t.count() }}</span>
			</button>
		</nav>

		<div v-if="missingTable" class="schema-warning">
			<n-icon :component="WarningOutline" />
			<div v-if="isOwner">
				<strong>Database migration pending.</strong>
				Run <code>supabase_meals.sql</code> in the Supabase SQL editor to start logging food.
			</div>
			<div v-else>
				<strong>Food logging is temporarily unavailable.</strong>
				{{ GENERIC_SCHEMA_MESSAGE }}
			</div>
		</div>

		<FoodsPanel v-if="tab === 'foods'" class="card lib-card" />
		<SavedMealsPanel v-else-if="tab === 'meals'" class="card lib-card" />

		<template v-else>
			<!-- The day's budget: each meal is its own segment, so the bar shows
			     what every meal cost of the day, not just the total. -->
			<section class="budget card">
				<div class="budget-main">
					<template v-if="target">
						<span class="big mono" :class="{ over: left < 0 }">{{ fmt(Math.abs(left)) }}</span>
						<span class="big-unit">{{ left < 0 ? 'kcal over' : 'kcal left' }}</span>
					</template>
					<template v-else>
						<span class="big mono">{{ fmt(totals.kcal) }}</span>
						<span class="big-unit">kcal eaten</span>
					</template>
				</div>
				<p v-if="target" class="budget-sub">
					<strong class="mono">{{ fmt(totals.kcal) }}</strong> eaten of
					<strong class="mono">{{ fmt(target.intakeKcal) }}</strong>
					<span v-if="target.burnKcal">, you burn about {{ fmt(target.burnKcal) }}</span>
				</p>
				<p v-else-if="fuel.blocked.value" class="budget-sub">
					<router-link :to="fuel.blocked.value === 'weight' ? '/schedule' : '/profile'">
						{{ fuel.blocked.value === 'weight' ? 'Log a weigh-in' : 'Add your body stats' }}
					</router-link>
					to get a daily calorie target.
				</p>
				<p v-else class="budget-sub">No calorie target for this day. The plan starts this week.</p>

				<div v-if="target" class="bar" role="img" :aria-label="`${fmt(totals.kcal)} of ${fmt(target.intakeKcal)} kcal eaten`">
					<div class="bar-track">
						<span v-for="s in segments" :key="s.key" class="seg" :class="s.key"
							:style="{ width: s.pct + '%' }" :title="`${s.label}: ${fmt(s.kcal)} kcal`" />
					</div>
					<span class="bar-target" :style="{ left: targetPct + '%' }" />
				</div>

				<div v-if="target" class="macros">
					<div v-for="m in macroRows" :key="m.label" class="macro">
						<div class="macro-top">
							<span>{{ m.label }}</span>
							<span class="mono"><strong>{{ m.eaten }}</strong> / {{ m.goal }} g</span>
						</div>
						<div class="macro-track"><span :style="{ width: Math.min(100, (m.eaten / (m.goal || 1)) * 100) + '%' }" /></div>
					</div>
				</div>
			</section>

			<!-- One surface, four ruled sections: a day reads as one list, not four boxes. -->
			<section class="day card">
				<div v-if="!shown.length && prevEntries.length" class="copy-day">
					<span>Nothing logged yet.</span>
					<button class="copy-btn" :disabled="copying" @click="copy()">
						<n-icon :component="CopyOutline" /> Copy {{ prevLabel }}, {{ fmt(prevTotal) }} kcal
					</button>
				</div>
				<div v-for="slot in MEAL_SLOTS" :key="slot.key" class="meal">
					<div class="meal-head">
						<span class="meal-dot" :class="slot.key" />
						<h2>{{ slot.label }}</h2>
						<span class="meal-kcal mono">{{ bySlot[slot.key].total ? fmt(bySlot[slot.key].total) + ' kcal' : '' }}</span>
						<button v-if="shown.length && !bySlot[slot.key].items.length && prevBySlot[slot.key].length && adding !== slot.key"
							class="copy-btn" :disabled="copying" :title="prevBySlot[slot.key].map(e => e.name).join(', ')" @click="copy(slot.key)">
							Same as {{ prevLabel }}
						</button>
						<button v-if="adding !== slot.key" class="add-btn" @click="openAdd(slot.key)">
							<n-icon :component="AddOutline" /> Add
						</button>
					</div>

					<ul v-if="bySlot[slot.key].items.length" class="entries">
						<li v-for="e in bySlot[slot.key].items" :key="e.id" class="entry" :class="{ pending: e.id < 0 }">
							<form v-if="editingId === e.id" class="edit-form" @submit.prevent="saveEdit(e)">
								<span class="edit-name">{{ e.name }}</span>
								<n-input-number ref="editRef" v-model:value="editAmount" :min="1" :max="10000" :show-button="false" class="edit-num">
									<template #suffix>{{ e.grams ? 'g' : 'kcal' }}</template>
								</n-input-number>
								<n-select v-model:value="editSlot" :options="slotOptions" class="edit-slot" />
								<span class="edit-kcal mono">{{ editPreview != null ? `${fmt(editPreview)} kcal` : '' }}</span>
								<n-button size="small" quaternary @click="editingId = null">Cancel</n-button>
								<n-button size="small" type="primary" attr-type="submit" :disabled="!editAmount">Save</n-button>
							</form>
							<template v-else>
								<button class="entry-name" :disabled="e.id < 0" :title="e.id < 0 ? '' : 'Change amount or meal'" @click="startEdit(e)">{{ e.name }}</button>
								<span class="entry-sub">{{ e.id < 0 ? 'Waiting for connection' : entrySub(e) }}</span>
								<span class="entry-kcal mono">{{ fmt(e.kcal) }}</span>
								<button class="del-btn" :aria-label="`Remove ${e.name}`" @click="remove(e)">
									<n-icon :component="CloseOutline" />
								</button>
							</template>
						</li>
					</ul>

					<form v-if="adding === slot.key" class="add-form" @submit.prevent="save">
						<n-select
							ref="pickerRef"
							v-model:value="pick"
							:options="pickOptions"
							filterable
							@search="query = $event"
							placeholder="Search your foods and meals"
							class="f-pick"
						/>
						<template v-if="picked?.kind === 'quick'">
							<n-input-number v-model:value="quickKcal" :min="0" :max="10000" :show-button="false" placeholder="kcal" class="f-num">
								<template #suffix>kcal</template>
							</n-input-number>
						</template>
						<div v-else class="f-amount">
							<n-input-number v-model:value="amount" :min="unit === 'serving' ? 0.25 : 1" :max="10000" :show-button="false"
								placeholder="Amount" class="f-num">
								<template v-if="!serving" #suffix>g</template>
							</n-input-number>
							<n-select v-if="serving" :value="unit" :options="unitOptions" class="f-unit" @update:value="setUnit" />
						</div>
						<span class="f-preview mono">{{ preview ? `${fmt(preview.kcal)} kcal` : '' }}</span>
						<div class="f-actions">
							<span v-if="!foods.length && !mealFoods.length" class="f-hint">
								Tip: add foods under <button type="button" class="link" @click="tab = 'foods'">Foods</button> to log by weight.
							</span>
							<n-button size="small" quaternary @click="adding = null">Cancel</n-button>
							<n-button size="small" type="primary" attr-type="submit" :loading="saving" :disabled="!preview">Add</n-button>
						</div>
					</form>
				</div>
			</section>

			<!-- Two weeks at a glance: each bar is a day, the tick its target. Click a day to open it. -->
			<section v-if="historyDays.some(d => d.kcal != null)" class="history card">
				<div class="h-head">
					<h2>Last two weeks</h2>
					<span class="h-legend"><span class="h-sw" /> Target</span>
				</div>
				<p v-if="historySummary" class="h-sum">{{ historySummary }}</p>
				<div class="h-chart">
					<button v-for="d in historyDays" :key="d.date" class="h-col"
						:class="{ today: d.date === todayISO(), selected: d.date === date, empty: d.kcal == null }"
						:aria-label="d.aria" :title="d.aria" @click="date = d.date">
						<span class="h-plot">
							<span v-if="d.kcal != null" class="h-bar" :style="{ height: (d.kcal / historyMax) * 100 + '%' }" />
							<span v-if="d.target" class="h-target" :style="{ bottom: (d.target / historyMax) * 100 + '%' }" />
						</span>
						<span class="h-day">{{ d.label }}</span>
					</button>
				</div>
			</section>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NIcon, NInputNumber, NSelect, useMessage } from 'naive-ui'
import { AddOutline, ChevronBackOutline, ChevronForwardOutline, CloseOutline, CopyOutline, WarningOutline } from '@vicons/ionicons5'
import { addDays, format, parseISO } from 'date-fns'
import { db, MISSING_MEALS } from '@/db'
import { useFuelPlan } from '@/fuel'
import { foodMissingTable, foods, foodsById, loadFoodLibrary, mealFoods, savedMeals } from '@/food'
import { hydrateSettings } from '@/settings'
import { dailyWeights, kmOf, loaded, loadStats, raceGoals, recordedOf, sportOf, workouts } from '@/stats'
import { isOwner, GENERIC_SCHEMA_MESSAGE } from '@/owner'
import { copyEntries, kcalByDate, MEAL_SLOTS, mealTotals, portion, rescaleEntry } from '@/utils/meals'
import { flushMeals, isNetworkError, pendingMeals, queueMeal, unqueueMeal } from '@/mealQueue'
import FoodsPanel from '@/components/food/FoodsPanel.vue'
import SavedMealsPanel from '@/components/food/SavedMealsPanel.vue'
import type { MealEntry, MealSlot } from '@/types'

const message = useMessage()
const route = useRoute()
const router = useRouter()
const todayISO = () => format(new Date(), 'yyyy-MM-dd')
const fmt = (n: number) => Math.round(n).toLocaleString()

type Tab = 'diary' | 'foods' | 'meals'
const TABS: { key: Tab; label: string; count?: () => number }[] = [
	{ key: 'diary', label: 'Diary' },
	{ key: 'foods', label: 'Foods', count: () => foods.value.length },
	{ key: 'meals', label: 'Meals', count: () => savedMeals.value.length },
]
const tabFromQuery = (): Tab => (['foods', 'meals'] as const).find(t => t === route.query.tab) ?? 'diary'
const tab = ref<Tab>(tabFromQuery())
watch(tab, t => { if (t !== tabFromQuery()) router.replace({ query: t === 'diary' ? {} : { tab: t } }) })
watch(() => route.query.tab, () => { tab.value = tabFromQuery() })

const date = ref(todayISO())
const isToday = computed(() => date.value === todayISO())
const dayLabel = computed(() => {
	const d = parseISO(date.value)
	const diff = Math.round((d.getTime() - parseISO(todayISO()).getTime()) / 86_400_000)
	const rel = diff === 0 ? 'Today' : diff === -1 ? 'Yesterday' : diff === 1 ? 'Tomorrow' : format(d, 'EEEE')
	return `${rel}, ${format(d, 'd MMM')}`
})
const shiftDay = (n: number) => { date.value = format(addDays(parseISO(date.value), n), 'yyyy-MM-dd') }

// Same store and inputs as Home, so the target here is the one on Home and the calendar.
const nextRaceDate = computed(() =>
	raceGoals.value.filter(g => g.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? null)
const fuel = useFuelPlan({ workouts, dailyWeights, sportOf, kmOf, recordedOf, goalDate: nextRaceDate })
const target = computed(() => fuel.dayFuel(date.value))

const entries = ref<MealEntry[]>([])
const prevEntries = ref<MealEntry[]>([])
const pending = ref(pendingMeals())
/** Saved entries plus any waiting to sync; waiting ones get negative ids from their queue position. */
const shown = computed<MealEntry[]>(() => [
	...entries.value,
	...pending.value.map((p, i) => ({ ...p, id: -(i + 1) })).filter(p => p.date === date.value),
])
const recent = ref<MealEntry[]>([])
const entriesMissing = ref(false)
const missingTable = computed(() => entriesMissing.value || foodMissingTable.value)

const totals = computed(() => mealTotals(shown.value))
const left = computed(() => (target.value?.intakeKcal ?? 0) - totals.value.kcal)

const bySlot = computed(() => {
	const out = {} as Record<MealSlot, { items: MealEntry[]; total: number }>
	for (const s of MEAL_SLOTS) out[s.key] = { items: [], total: 0 }
	for (const e of shown.value) { out[e.meal].items.push(e); out[e.meal].total += e.kcal }
	return out
})

// ─── the day before, for copying ──────────────────────────────────────────────
const prevDate = computed(() => format(addDays(parseISO(date.value), -1), 'yyyy-MM-dd'))
const prevLabel = computed(() => (isToday.value ? 'yesterday' : format(parseISO(prevDate.value), 'EEEE')))
const prevTotal = computed(() => mealTotals(prevEntries.value).kcal)
const prevBySlot = computed(() => Object.fromEntries(MEAL_SLOTS.map(s =>
	[s.key, prevEntries.value.filter(e => e.meal === s.key)])) as Record<MealSlot, MealEntry[]>)
const copying = ref(false)

async function copy(slot?: MealSlot) {
	const src = prevEntries.value.filter(e => !slot || e.meal === slot)
	if (!src.length) return
	copying.value = true
	try {
		const rows = await db.addMealEntries(copyEntries(src, date.value))
		entries.value = [...entries.value, ...rows]
		refreshHistory()
	} catch (err) { handleError(err, 'copy those entries') }
	finally { copying.value = false }
}

// ─── editing a logged entry ───────────────────────────────────────────────────
const slotOptions = MEAL_SLOTS.map(s => ({ label: s.label, value: s.key }))
const editingId = ref<number | null>(null)
const editAmount = ref<number | null>(null)
const editSlot = ref<MealSlot>('breakfast')
const editRef = ref<{ focus: () => void }[] | null>(null)
const editing = computed(() => entries.value.find(e => e.id === editingId.value) ?? null)
const editPreview = computed(() => {
	const e = editing.value, a = editAmount.value
	return e && a ? (e.grams ? rescaleEntry(e, a).kcal : Math.round(a)) : null
})

function startEdit(e: MealEntry) {
	adding.value = null
	editingId.value = e.id
	editAmount.value = e.grams ? Math.round(e.grams) : e.kcal
	editSlot.value = e.meal
	nextTick(() => editRef.value?.[0]?.focus())
}

async function saveEdit(e: MealEntry) {
	const a = editAmount.value
	if (!a) return
	const patch = { meal: editSlot.value, ...(e.grams ? rescaleEntry(e, a) : { kcal: Math.round(a) }) }
	entries.value = entries.value.map(x => (x.id === e.id ? { ...x, ...patch } : x))
	editingId.value = null
	try { await db.updateMealEntry(e.id, patch); refreshHistory() }
	catch (err) { entries.value = entries.value.map(x => (x.id === e.id ? e : x)); handleError(err, 'save that change') }
}

// ─── the last two weeks ───────────────────────────────────────────────────────
const HISTORY_DAYS = 14
const history = ref(new Map<string, number>())

async function refreshHistory() {
	const to = todayISO()
	try { history.value = kcalByDate(await db.getMealEntries(format(addDays(parseISO(to), 1 - HISTORY_DAYS), 'yyyy-MM-dd'), to)) }
	catch { /* the chart is a nicety; the day still works */ }
}

const historyDays = computed(() => {
	const t = parseISO(todayISO())
	return Array.from({ length: HISTORY_DAYS }, (_, i) => {
		const day = addDays(t, i + 1 - HISTORY_DAYS)
		const d = format(day, 'yyyy-MM-dd')
		const kcal = history.value.get(d) ?? null
		const target = fuel.dayFuel(d)?.intakeKcal ?? null
		const aria = `${format(day, 'EEE d MMM')}: ${kcal == null ? 'nothing logged' : `${fmt(kcal)} kcal`}${target ? ` of ${fmt(target)}` : ''}`
		return { date: d, kcal, target, label: format(day, 'EEEEE'), aria }
	})
})
const historyMax = computed(() => Math.max(1, ...historyDays.value.flatMap(d => [d.kcal ?? 0, d.target ?? 0])) * 1.05)

/** Today is still in progress, so the summary covers finished days only. */
const historySummary = computed(() => {
	const done = historyDays.value.filter(d => d.kcal != null && d.date !== todayISO())
	if (!done.length) return ''
	const avg = done.reduce((s, d) => s + d.kcal!, 0) / done.length
	const targeted = done.filter(d => d.target)
	const close = targeted.filter(d => Math.abs(d.kcal! - d.target!) <= d.target! * 0.1).length
	const days = `${done.length} logged ${done.length === 1 ? 'day' : 'days'}`
	return targeted.length >= 3
		? `You averaged ${fmt(avg)} kcal over ${days}, and were within 10% of target on ${close} of ${targeted.length}.`
		: `You averaged ${fmt(avg)} kcal over ${days}.`
})

/** The bar's scale: the target, or what was eaten when that's more, so going over shows. */
const scale = computed(() => Math.max(target.value?.intakeKcal ?? 0, totals.value.kcal, 1))
const segments = computed(() => MEAL_SLOTS.map(s => ({
	...s, kcal: bySlot.value[s.key].total, pct: (bySlot.value[s.key].total / scale.value) * 100,
})).filter(s => s.kcal > 0))
const targetPct = computed(() => ((target.value?.intakeKcal ?? 0) / scale.value) * 100)

const macroRows = computed(() => {
	const m = target.value?.macros
	return [
		{ label: 'Protein', eaten: totals.value.proteinG, goal: m?.proteinG ?? 0 },
		{ label: 'Carbs', eaten: totals.value.carbsG, goal: m?.carbsG ?? 0 },
		{ label: 'Fat', eaten: totals.value.fatG, goal: m?.fatG ?? 0 },
	]
})

const entrySub = (e: MealEntry) => {
	const macros = [[e.protein_g, 'P'], [e.carbs_g, 'C'], [e.fat_g, 'F']]
		.filter(([g]) => g != null).map(([g, l]) => `${Math.round(g as number)}${l}`).join(' ')
	return [e.grams ? `${Math.round(e.grams)} g` : '', macros].filter(Boolean).join(' · ')
}

function handleError(err: unknown, action: string) {
	if (err instanceof Error && err.message === MISSING_MEALS) { entriesMissing.value = true; return }
	console.error(err)
	message.error(`Couldn't ${action}. Check your connection and try again.`)
}

async function loadDay() {
	const d = date.value, prev = prevDate.value
	try {
		const rows = await db.getMealEntries(prev, d)
		if (d !== date.value) return
		entries.value = rows.filter(r => r.date === d)
		prevEntries.value = rows.filter(r => r.date === prev)
		entriesMissing.value = false
	} catch (err) { handleError(err, 'load this day') }
}
watch(date, () => { adding.value = null; editingId.value = null; loadDay() })

/** Send anything logged while offline, then reload so the saved rows replace the waiting ones. */
async function syncPending() {
	if (!pendingMeals().length) return
	try {
		await flushMeals()
		pending.value = pendingMeals()
		await loadDay()
		refreshHistory()
	} catch { /* still offline; try again on the next 'online' event */ }
}

// ─── adding ───────────────────────────────────────────────────────────────────
//
// One picker for everything: library foods, saved meals (logged by grams of
// the finished dish), and a typed name that isn't in the library (quick add,
// by kcal). Options you logged recently come first.

const adding = ref<MealSlot | null>(null)
const saving = ref(false)
const pickerRef = ref<{ focusInput: () => void }[] | null>(null)
const pick = ref<string | null>(null)
const amount = ref<number | null>(null)
const unit = ref<'g' | 'serving'>('g')
const quickKcal = ref<number | null>(null)
const query = ref('')

const recency = computed(() => {
	const rank = new Map<string, number>()
	recent.value.forEach((e, i) => {
		const key = e.saved_meal_id ? `m:${e.saved_meal_id}` : e.food_id ? `f:${e.food_id}` : null
		if (key && !rank.has(key)) rank.set(key, i)
	})
	return rank
})

const pickOptions = computed(() => {
	const r = (k: string) => recency.value.get(k) ?? Infinity
	const opts = [
		...mealFoods.value.map(m => ({ value: `m:${m.meal.id}`, label: `${m.meal.name} · meal, ${Math.round(m.kcal_per_100g)} kcal/100 g` })),
		...foods.value.map(f => ({ value: `f:${f.id}`, label: `${f.name} · ${Math.round(f.kcal_per_100g)} kcal/100 g` })),
	]
	opts.sort((a, b) => r(a.value) - r(b.value) || a.label.localeCompare(b.label))
	// Last, so Enter picks a real match when there is one.
	const quick = (name: string) => ({ value: `q:${name}`, label: `Quick add “${name}” by kcal` })
	const q = query.value.trim()
	if (q) opts.push(quick(q))
	// Keep a chosen quick add listed after the search text clears, or the box shows its raw value.
	if (pick.value?.startsWith('q:') && pick.value !== `q:${q}`) opts.push(quick(pick.value.slice(2)))
	return opts
})

const picked = computed(() => {
	const v = pick.value
	if (!v) return null
	if (v.startsWith('q:')) return { kind: 'quick' as const, name: v.slice(2) }
	const id = Number(v.slice(2))
	if (v.startsWith('m:')) {
		const m = mealFoods.value.find(x => x.meal.id === id)
		return m ? { kind: 'meal' as const, name: m.meal.name, per100: m, defaultGrams: m.totalGrams, id } : null
	}
	const f = foodsById.value.get(id)
	return f ? { kind: 'food' as const, name: f.name, per100: f, defaultGrams: 100, id } : null
})

/** A food with a serving size can be logged as "2 eggs" as well as by weight. */
const serving = computed(() => {
	const p = picked.value
	return p?.kind === 'food' && p.per100.serving_g ? { g: p.per100.serving_g, name: p.per100.serving_name || 'serving' } : null
})
const unitOptions = computed(() => (serving.value
	? [{ label: 'g', value: 'g' }, { label: `× ${serving.value.name} (${Math.round(serving.value.g)} g)`, value: 'serving' }]
	: []))
const grams = computed(() => {
	if (amount.value == null) return null
	return unit.value === 'serving' && serving.value ? amount.value * serving.value.g : amount.value
})

/** Switching unit keeps the same weight, so the kcal preview doesn't jump. */
function setUnit(u: 'g' | 'serving') {
	const s = serving.value
	if (s && amount.value != null && u !== unit.value) {
		amount.value = u === 'serving' ? Math.round((amount.value / s.g) * 4) / 4 || 0.25 : Math.round(amount.value * s.g)
	}
	unit.value = u
}

// One serving if the food has one, the whole recipe for a meal, else 100 g; always editable.
watch(picked, p => {
	if (!p || p.kind === 'quick') return
	if (serving.value) { unit.value = 'serving'; amount.value = 1 }
	else { unit.value = 'g'; amount.value = p.defaultGrams }
})

const preview = computed(() => {
	const p = picked.value
	if (!p) return null
	if (p.kind === 'quick') return quickKcal.value != null ? { kcal: quickKcal.value, protein_g: null, carbs_g: null, fat_g: null } : null
	return grams.value ? portion(p.per100, grams.value) : null
})

function resetForm() { pick.value = null; amount.value = null; unit.value = 'g'; quickKcal.value = null; query.value = '' }

function openAdd(slot: MealSlot) {
	resetForm()
	editingId.value = null
	adding.value = slot
	nextTick(() => pickerRef.value?.[0]?.focusInput())
}

async function save() {
	const p = picked.value, n = preview.value
	if (!p || !n || !adding.value) return
	saving.value = true
	const payload = {
		date: date.value, meal: adding.value, name: p.name.trim().slice(0, 120),
		kcal: Math.round(n.kcal), protein_g: n.protein_g, carbs_g: n.carbs_g, fat_g: n.fat_g,
		grams: p.kind === 'quick' || grams.value == null ? null : Math.round(grams.value * 10) / 10,
		food_id: p.kind === 'food' ? p.id : null,
		saved_meal_id: p.kind === 'meal' ? p.id : null,
	}
	try {
		const row = await db.addMealEntry(payload)
		entries.value = [...entries.value, row]
		recent.value = [row, ...recent.value]
		refreshHistory()
	} catch (err) {
		if (!isNetworkError(err)) { handleError(err, 'add that food'); return }
		queueMeal(payload)
		pending.value = pendingMeals()
		message.info("No connection. It's saved on this device and will sync when you're back online.")
	} finally { saving.value = false }
	resetForm()
	nextTick(() => pickerRef.value?.[0]?.focusInput())
}

async function remove(e: MealEntry) {
	if (e.id < 0) { unqueueMeal(-e.id - 1); pending.value = pendingMeals(); return }
	entries.value = entries.value.filter(x => x.id !== e.id)
	try { await db.deleteMealEntry(e.id); refreshHistory() }
	catch (err) { entries.value = [...entries.value, e]; handleError(err, 'remove that food') }
}

onUnmounted(() => window.removeEventListener('online', syncPending))

onMounted(async () => {
	window.addEventListener('online', syncPending)
	syncPending()
	loadDay()
	refreshHistory()
	loadFoodLibrary().catch(err => handleError(err, 'load your foods'))
	db.getRecentMealEntries().then(r => { recent.value = r }).catch(() => { /* ordering only */ })
	await hydrateSettings()
	if (!loaded.value) await loadStats()
})
</script>

<style scoped>
.food-view { padding: 24px 28px 48px; max-width: 760px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; }
@media (max-width: 768px) { .food-view { padding: 16px 16px 32px; } }

.food-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; min-height: 36px; }
.page-title { margin: 0; }
.day-nav { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.day-label { min-width: 140px; text-align: center; font-size: 0.92rem; font-weight: 600; color: var(--text-color); }
.nav-btn, .today-btn, .add-btn, .del-btn, .link {
	display: inline-flex; align-items: center; justify-content: center; gap: 4px;
	border: none; background: none; color: var(--text-secondary); cursor: pointer; font: inherit;
}
.nav-btn { width: 36px; height: 36px; border-radius: 50%; font-size: 1.05rem; }
.nav-btn:hover, .del-btn:hover { background: var(--surface-hover); color: var(--text-color); }
.today-btn { padding: 6px 12px; border-radius: 999px; font-size: 0.82rem; font-weight: 600; color: var(--primary-color); background: var(--primary-soft); }
.link { padding: 0; color: var(--primary-color); text-decoration: underline; text-underline-offset: 2px; }

.tabbar { display: flex; gap: 2px; margin-top: -4px; border-bottom: 1px solid var(--border-color); }
.tabbar button {
	display: inline-flex; align-items: center; gap: 7px;
	background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px;
	color: var(--text-muted); font-family: inherit; font-size: 0.92rem; font-weight: 500;
	padding: 9px 14px; cursor: pointer;
}
.tabbar button:hover { color: var(--text-secondary); }
.tabbar button.active { color: var(--text-color); font-weight: 600; border-bottom-color: var(--primary-color); }
.tab-count { font-size: 0.78rem; font-weight: 400; color: var(--text-muted); }

.card { padding: 20px 22px; }
.lib-card { padding: 22px; }
@media (max-width: 520px) { .card, .lib-card { padding: 16px; } }

/* ─── budget ─── */
.budget { display: flex; flex-direction: column; gap: 6px; }
.budget-main { display: flex; align-items: baseline; gap: 8px; }
.big { font-size: 3rem; font-weight: 600; line-height: 1; letter-spacing: -0.03em; color: var(--text-color); }
.big.over { color: var(--danger-color); }
.big-unit { font-size: 0.95rem; color: var(--text-muted); }
.budget-sub { margin: 4px 0 0; font-size: 0.9rem; color: var(--text-secondary); }
.budget-sub strong { color: var(--text-color); font-weight: 600; }
.budget-sub a { color: var(--primary-color); }

.bar { position: relative; padding: 4px 0; margin-top: 12px; }
.bar-track { display: flex; gap: 2px; height: 14px; border-radius: 999px; overflow: hidden; background: var(--surface-2); }
.seg { height: 100%; transition: width 0.35s ease; }
.bar-target { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--text-color); border-radius: 1px; }

/* Breakfast to snacks runs light to deep along the app's own orange, so the
   bar reads as one day rather than four unrelated categories. */
.breakfast { --meal: #f7c39a; }
.lunch { --meal: #f3a268; }
.dinner { --meal: #e0640b; }
.snack { --meal: #9c4a12; }
.seg, .meal-dot { background: var(--meal); }
/* On paper the palest step disappears into the track. */
:global(html[data-theme='light']) .breakfast { --meal: #e9a46e; }

.macros { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 12px; }
.macro-top { display: flex; justify-content: space-between; gap: 6px; font-size: 0.84rem; color: var(--text-muted); margin-bottom: 6px; }
.macro-top strong { color: var(--text-color); font-weight: 600; }
.macro-track { height: 5px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.macro-track span { display: block; height: 100%; background: var(--text-secondary); border-radius: 999px; transition: width 0.35s ease; }
@media (max-width: 480px) { .macros { gap: 12px; } .macro-top { flex-direction: column; } }

/* ─── the day's list ─── */
.day { padding-top: 6px; padding-bottom: 6px; }
.meal { padding: 14px 0; border-bottom: 1px solid var(--border-color); }
.meal:last-child { border-bottom: none; }
.meal-head { display: flex; align-items: center; gap: 10px; min-height: 34px; }
.meal-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.meal-head h2 { margin: 0; font-size: 1.02rem; font-weight: 600; font-family: var(--font-display); }
.meal-kcal { font-size: 0.88rem; color: var(--text-muted); }
.add-btn { margin-left: auto; padding: 6px 12px; border-radius: 999px; font-size: 0.86rem; font-weight: 600; color: var(--primary-color); }
.add-btn:hover { background: var(--primary-soft); }

.entries { list-style: none; margin: 6px 0 0; padding: 0 0 0 20px; }
.entry { display: grid; grid-template-columns: minmax(0, 1fr) auto auto 32px; align-items: center; gap: 12px; min-height: 42px; font-size: 0.94rem; }
.entry + .entry { border-top: 1px solid var(--border-subtle); }
.entry-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-color); }
.entry-sub { font-size: 0.8rem; color: var(--text-muted); }
.entry-kcal { font-weight: 600; color: var(--text-color); text-align: right; min-width: 48px; }
.del-btn { width: 32px; height: 32px; border-radius: 50%; color: var(--text-muted); }
@media (max-width: 520px) {
	.entries { padding-left: 0; }
	.entry { grid-template-columns: minmax(0, 1fr) auto 32px; row-gap: 0; padding: 6px 0; }
	.entry-sub { grid-column: 1; grid-row: 2; }
	.del-btn { grid-row: 1 / 3; grid-column: 3; }
}

.add-form { display: grid; grid-template-columns: minmax(0, 1fr) auto 84px; gap: 10px; align-items: center; margin: 10px 0 2px 20px; }
.f-preview { font-size: 0.92rem; font-weight: 600; color: var(--text-color); text-align: right; }
.f-actions { grid-column: 1 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.f-hint { margin-right: auto; font-size: 0.82rem; color: var(--text-muted); }
@media (max-width: 520px) {
	.add-form { margin-left: 0; grid-template-columns: minmax(0, 1fr) 84px; }
	.f-pick { grid-column: 1 / -1; }
}

.schema-warning { display: flex; gap: 10px; padding: 12px 14px; border-radius: var(--radius-sm); background: var(--warning-soft); color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; }
.schema-warning .n-icon { color: var(--warning-color); font-size: 1.1rem; margin-top: 2px; }

/* ─── copying, editing, waiting ─── */
.copy-btn {
	display: inline-flex; align-items: center; gap: 5px; border: none; background: none; cursor: pointer; font: inherit;
	padding: 6px 10px; border-radius: 999px; font-size: 0.82rem; color: var(--text-muted);
}
.copy-btn:hover:not(:disabled) { background: var(--surface-hover); color: var(--text-color); }
.meal-head .copy-btn { margin-left: auto; }
.meal-head .copy-btn + .add-btn { margin-left: 0; }
.copy-day { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 0 4px; font-size: 0.9rem; color: var(--text-secondary); }
.copy-day .copy-btn { color: var(--primary-color); font-weight: 600; background: var(--primary-soft); }
button.entry-name { border: none; background: none; padding: 0; font: inherit; text-align: left; cursor: pointer; }
button.entry-name:hover:not(:disabled) { color: var(--primary-color); }
button.entry-name:disabled { cursor: default; }
.entry.pending .entry-name, .entry.pending .entry-kcal { color: var(--text-muted); }
.entry.pending .entry-sub { color: var(--warning-color); }
.edit-form { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 0; }
.edit-name { flex: 1 1 140px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-color); }
.edit-num { width: 110px; }
.edit-slot { width: 130px; }
.edit-kcal { min-width: 70px; text-align: right; font-size: 0.88rem; font-weight: 600; }
.f-amount { display: flex; gap: 6px; }
.f-num { width: 130px; }
.f-unit { width: 150px; }

/* ─── two-week history ─── */
.history { display: flex; flex-direction: column; gap: 6px; }
.h-head { display: flex; align-items: baseline; gap: 10px; }
.h-head h2 { margin: 0; font-size: 1rem; font-weight: 600; font-family: var(--font-display); }
.h-legend { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); }
.h-sw { width: 14px; height: 2px; background: var(--text-color); border-radius: 1px; }
.h-sum { margin: 0 0 6px; font-size: 0.88rem; line-height: 1.5; color: var(--text-secondary); }
.h-chart { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 4px; }
.h-col {
	display: flex; flex-direction: column; align-items: stretch; gap: 6px; padding: 4px 2px;
	border: none; background: none; border-radius: var(--radius-sm); cursor: pointer; font: inherit;
}
.h-col:hover, .h-col.selected { background: var(--surface-hover); }
.h-plot { position: relative; height: 110px; display: flex; align-items: flex-end; justify-content: center; }
.h-bar { width: min(100%, 18px); border-radius: 4px 4px 0 0; background: var(--primary-color); }
.h-col.today .h-bar { background: color-mix(in srgb, var(--primary-color) 40%, transparent); }
.h-col.empty .h-plot::after { content: ''; width: min(100%, 18px); height: 2px; border-radius: 1px; background: var(--border-color); }
.h-target { position: absolute; left: 50%; width: min(100%, 26px); transform: translateX(-50%); height: 2px; border-radius: 1px; background: var(--text-color); }
.h-day { font-size: 0.74rem; color: var(--text-muted); text-align: center; }
.h-col.selected .h-day { color: var(--text-color); font-weight: 600; }

@media (max-width: 520px) {
	.add-form { grid-template-columns: minmax(0, 1fr) 72px; }
	.f-amount { grid-column: 1; }
	.f-num { width: 100%; flex: 1; }
	.f-unit { width: 130px; flex-shrink: 0; }
	.edit-name { flex-basis: 100%; }
	.h-chart { gap: 1px; }
	.h-plot { height: 90px; }
}
@media (prefers-reduced-motion: reduce) { .seg, .macro-track span { transition: none; } }
</style>
