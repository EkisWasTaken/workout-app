<template>
	<section class="lib">
		<p v-if="!foods.length" class="empty">
			A meal is built from foods in your library. Add a few foods first, then come back to combine them.
		</p>

		<template v-else>
			<form v-if="editing" class="meal-form" @submit.prevent="save">
				<n-input v-model:value="editing.name" placeholder="Meal name, e.g. Overnight oats" :maxlength="120" />
			<p v-if="duplicate" class="dup">You already have a meal called “{{ duplicate.name }}”. Give this one another name, or edit that one.</p>
				<div v-for="(it, i) in editing.items" :key="i" class="ing">
					<n-select
						v-model:value="it.food_id"
						:options="foodOptions"
						filterable
						placeholder="Pick a food"
						class="ing-food"
					/>
					<n-input-number v-model:value="it.grams" :min="1" :max="10000" :show-button="false" placeholder="g" class="ing-g">
						<template #suffix>g</template>
					</n-input-number>
					<span class="ing-kcal mono">{{ ingKcal(it) }}</span>
					<button type="button" class="icon-btn danger" aria-label="Remove ingredient" @click="editing.items.splice(i, 1)">
						<n-icon :component="CloseOutline" />
					</button>
				</div>
				<button type="button" class="add-ing" @click="editing.items.push({ food_id: null, grams: null })">
					<n-icon :component="AddOutline" /> Add ingredient
				</button>
				<div class="mf-foot">
					<span class="mf-total">
						<strong class="mono">{{ Math.round(draftTotals.kcal) }}</strong> kcal ·
						<strong class="mono">{{ Math.round(draftTotals.grams) }}</strong> g total
					</span>
					<n-button size="small" quaternary @click="editing = null">Cancel</n-button>
					<n-button size="small" type="primary" attr-type="submit" :loading="saving" :disabled="!canSave">Save meal</n-button>
				</div>
			</form>
			<n-button v-else type="primary" secondary @click="startNew">
				<template #icon><n-icon :component="AddOutline" /></template>
				New meal
			</n-button>

			<ul v-if="rows.length" class="rows">
				<li v-for="r in rows" :key="r.meal.id" class="row">
					<span class="r-name">{{ r.meal.name }}</span>
					<span class="r-macros">{{ r.meal.items.length }} {{ r.meal.items.length === 1 ? 'food' : 'foods' }} · {{ r.grams }} g</span>
					<span class="r-kcal mono">{{ r.kcal }}<small> kcal</small></span>
					<span class="r-actions">
						<button class="icon-btn" :aria-label="`Edit ${r.meal.name}`" @click="edit(r.meal)"><n-icon :component="CreateOutline" /></button>
						<button class="icon-btn danger" :aria-label="`Delete ${r.meal.name}`" @click="remove(r.meal)"><n-icon :component="TrashOutline" /></button>
					</span>
				</li>
			</ul>
			<p v-else-if="!editing" class="empty">No saved meals yet. A meal you cook in one pot can be logged by the grams you ate.</p>
		</template>
	</section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NIcon, NInput, NInputNumber, NSelect, useDialog, useMessage } from 'naive-ui'
import { AddOutline, CloseOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import { db } from '@/db'
import { byName, foods, foodsById, savedMeals } from '@/food'
import { mealAsFood } from '@/utils/meals'
import type { SavedMeal } from '@/types'

type DraftItem = { food_id: number | null; grams: number | null }
const message = useMessage()
const dialog = useDialog()
const editing = ref<{ id?: number; name: string; items: DraftItem[] } | null>(null)
const saving = ref(false)

const foodOptions = computed(() => foods.value.map(f => ({ label: `${f.name} · ${Math.round(f.kcal_per_100g)} kcal/100 g`, value: f.id })))
const validItems = computed(() => (editing.value?.items ?? [])
	.filter((i): i is { food_id: number; grams: number } => i.food_id != null && !!i.grams && i.grams > 0))
const duplicate = computed(() => {
	const n = editing.value?.name.trim().toLowerCase()
	return n ? savedMeals.value.find(m => m.id !== editing.value!.id && m.name.trim().toLowerCase() === n) ?? null : null
})
const canSave = computed(() => !!editing.value?.name.trim() && validItems.value.length > 0 && !duplicate.value)

const ingKcal = (it: DraftItem) => {
	const f = it.food_id != null ? foodsById.value.get(it.food_id) : undefined
	return f && it.grams ? `${Math.round((f.kcal_per_100g * it.grams) / 100)} kcal` : ''
}
const draftTotals = computed(() => {
	const m = mealAsFood({ id: 0, name: '', items: validItems.value }, foodsById.value)
	return m ? { grams: m.totalGrams, kcal: (m.kcal_per_100g * m.totalGrams) / 100 } : { grams: 0, kcal: 0 }
})

const rows = computed(() => savedMeals.value.map(meal => {
	const m = mealAsFood(meal, foodsById.value)
	return { meal, grams: m?.totalGrams ?? 0, kcal: m ? Math.round((m.kcal_per_100g * m.totalGrams) / 100) : 0 }
}))

function startNew() { editing.value = { name: '', items: [{ food_id: null, grams: null }] } }
function edit(m: SavedMeal) { editing.value = { id: m.id, name: m.name, items: m.items.map(i => ({ ...i })) } }

async function save() {
	const d = editing.value
	if (!d || !canSave.value) return
	saving.value = true
	try {
		const payload = { name: d.name.trim().slice(0, 120), items: validItems.value }
		const id = await db.saveSavedMeal(payload, d.id)
		savedMeals.value = [...savedMeals.value.filter(m => m.id !== id), { id, ...payload }].sort(byName)
		message.success('Meal saved')
		editing.value = null
	} catch (err) {
		console.error(err)
		message.error("Couldn't save that meal. Check your connection and try again.")
	} finally { saving.value = false }
}

function remove(m: SavedMeal) {
	dialog.warning({
		title: `Delete ${m.name}?`,
		content: 'Its foods stay in your library, and days you already logged keep their numbers.',
		positiveText: 'Delete',
		negativeText: 'Cancel',
		onPositiveClick: async () => {
			try {
				await db.deleteSavedMeal(m.id)
				savedMeals.value = savedMeals.value.filter(x => x.id !== m.id)
			} catch (err) {
				console.error(err)
				message.error("Couldn't delete that meal. Try again.")
			}
		},
	})
}
</script>

<style scoped>
@import './food-shared.css';

.meal-form {
	display: flex; flex-direction: column; gap: 10px;
	padding-bottom: 18px; border-bottom: 1px solid var(--border-color);
}
.ing { display: grid; grid-template-columns: minmax(0, 1fr) 110px 76px 32px; gap: 8px; align-items: center; }
.ing-kcal { font-size: 0.85rem; color: var(--text-muted); text-align: right; }
.add-ing {
	align-self: flex-start; display: inline-flex; align-items: center; gap: 5px;
	border: none; background: none; padding: 6px 0; cursor: pointer; font: inherit;
	font-size: 0.88rem; font-weight: 600; color: var(--primary-color);
}
.mf-foot { display: flex; align-items: center; gap: 8px; }
.dup { margin: -4px 0 0; font-size: 0.84rem; color: var(--warning-color); }
.mf-total { margin-right: auto; font-size: 0.88rem; color: var(--text-secondary); }
.mf-total strong { color: var(--text-color); }
@media (max-width: 520px) {
	.ing { grid-template-columns: minmax(0, 1fr) 90px 32px; }
	.ing-kcal { display: none; }
}
</style>
