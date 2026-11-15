<template>
	<section class="lib">
		<form class="food-form" @submit.prevent="save">
			<n-input v-model:value="form.name" placeholder="Food name, e.g. Oats" class="ff-name" :maxlength="120" />
			<label class="ff-field"><span>kcal</span><n-input-number v-model:value="form.kcal" :min="0" :max="900" :show-button="false" placeholder="per 100 g" /></label>
			<label class="ff-field"><span>Protein</span><n-input-number v-model:value="form.protein" :min="0" :max="100" :show-button="false" placeholder="g" /></label>
			<label class="ff-field"><span>Carbs</span><n-input-number v-model:value="form.carbs" :min="0" :max="100" :show-button="false" placeholder="g" /></label>
			<label class="ff-field"><span>Fat</span><n-input-number v-model:value="form.fat" :min="0" :max="100" :show-button="false" placeholder="g" /></label>
			<div class="ff-actions">
				<span class="ff-hint">Values per 100 g, as printed on the packet.</span>
				<n-button v-if="editingId" size="small" quaternary @click="reset">Cancel</n-button>
				<n-button size="small" type="primary" attr-type="submit" :loading="saving" :disabled="!canSave">
					{{ editingId ? 'Save food' : 'Add food' }}
				</n-button>
			</div>
		</form>

		<n-input v-if="foods.length > 6" v-model:value="query" placeholder="Search foods" clearable class="search" />

		<ul v-if="shown.length" class="rows">
			<li v-for="f in shown" :key="f.id" class="row" :class="{ editing: f.id === editingId }">
				<span class="r-name">{{ f.name }}</span>
				<span class="r-macros">{{ macroLine(f) }}</span>
				<span class="r-kcal mono">{{ Math.round(f.kcal_per_100g) }}<small> kcal</small></span>
				<span class="r-actions">
					<button class="icon-btn" :aria-label="`Edit ${f.name}`" @click="edit(f)"><n-icon :component="CreateOutline" /></button>
					<button class="icon-btn danger" :aria-label="`Delete ${f.name}`" @click="remove(f)"><n-icon :component="TrashOutline" /></button>
				</span>
			</li>
		</ul>
		<p v-else-if="!foods.length" class="empty">
			Add the foods you eat often. Then log them by weight in the diary, or combine them into meals.
		</p>
		<p v-else class="empty">No food matches “{{ query }}”.</p>
	</section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { NButton, NIcon, NInput, NInputNumber, useDialog, useMessage } from 'naive-ui'
import { CreateOutline, TrashOutline } from '@vicons/ionicons5'
import { db } from '@/db'
import { byName, foods, savedMeals } from '@/food'
import type { FoodItem } from '@/types'

const message = useMessage()
const dialog = useDialog()
const blank = () => ({ name: '', kcal: null as number | null, protein: null as number | null, carbs: null as number | null, fat: null as number | null })
const form = reactive(blank())
const editingId = ref<number | null>(null)
const saving = ref(false)
const query = ref('')
const canSave = computed(() => form.name.trim().length > 0 && form.kcal != null)

const shown = computed(() => {
	const q = query.value.trim().toLowerCase()
	return q ? foods.value.filter(f => f.name.toLowerCase().includes(q)) : foods.value
})

const macroLine = (f: FoodItem) => [[f.protein_per_100g, 'P'], [f.carbs_per_100g, 'C'], [f.fat_per_100g, 'F']]
	.filter(([v]) => v != null).map(([v, l]) => `${Math.round((v as number) * 10) / 10}${l}`).join(' ')

function reset() { Object.assign(form, blank()); editingId.value = null }
function edit(f: FoodItem) {
	editingId.value = f.id
	Object.assign(form, { name: f.name, kcal: f.kcal_per_100g, protein: f.protein_per_100g, carbs: f.carbs_per_100g, fat: f.fat_per_100g })
}

async function save() {
	if (!canSave.value) return
	saving.value = true
	try {
		const row = await db.saveFood({
			name: form.name.trim().slice(0, 120), kcal_per_100g: form.kcal!,
			protein_per_100g: form.protein, carbs_per_100g: form.carbs, fat_per_100g: form.fat,
		}, editingId.value ?? undefined)
		foods.value = [...foods.value.filter(f => f.id !== row.id), row].sort(byName)
		message.success(editingId.value ? 'Food saved' : 'Food added')
		reset()
	} catch (err) {
		console.error(err)
		message.error("Couldn't save that food. Check your connection and try again.")
	} finally { saving.value = false }
}

function remove(f: FoodItem) {
	const usedIn = savedMeals.value.filter(m => m.items.some(i => i.food_id === f.id)).map(m => m.name)
	dialog.warning({
		title: `Delete ${f.name}?`,
		content: usedIn.length
			? `It will also be removed from ${usedIn.join(', ')}. Days you already logged keep their numbers.`
			: 'Days you already logged keep their numbers.',
		positiveText: 'Delete',
		negativeText: 'Cancel',
		onPositiveClick: async () => {
			try {
				await db.deleteFood(f.id)
				foods.value = foods.value.filter(x => x.id !== f.id)
				savedMeals.value = savedMeals.value.map(m => ({ ...m, items: m.items.filter(i => i.food_id !== f.id) }))
				if (editingId.value === f.id) reset()
			} catch (err) {
				console.error(err)
				message.error("Couldn't delete that food. Try again.")
			}
		},
	})
}
</script>

<style scoped>
@import './food-shared.css';

.food-form {
	display: grid;
	grid-template-columns: minmax(0, 2.2fr) repeat(4, minmax(0, 1fr));
	gap: 10px;
	align-items: end;
	padding-bottom: 18px;
	border-bottom: 1px solid var(--border-color);
}
.ff-field { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--text-muted); }
.ff-actions { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; }
.ff-hint { margin-right: auto; font-size: 0.78rem; color: var(--text-muted); }
@media (max-width: 640px) {
	.food-form { grid-template-columns: repeat(4, minmax(0, 1fr)); }
	.ff-name { grid-column: 1 / -1; }
	.ff-hint { display: none; }
	.ff-actions { justify-content: flex-end; }
}
.search { margin-top: 16px; }
</style>
