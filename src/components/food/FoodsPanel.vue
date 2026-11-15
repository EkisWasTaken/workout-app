<template>
	<section class="lib">
		<!-- Packet lookup fills the form below; nothing is saved until you add it. -->
		<form class="lookup" @submit.prevent="lookup">
			<n-input v-model:value="lookupText" placeholder="Look up a packet by name or barcode" clearable class="lk-input" />
			<n-button attr-type="submit" secondary :loading="looking" :disabled="!lookupText.trim()">Look up</n-button>
		</form>
		<p v-if="lookupNote" class="lk-note">{{ lookupNote }}</p>
		<ul v-if="results.length" class="lk-results">
			<li v-for="(r, i) in results" :key="i">
				<button type="button" class="lk-row" @click="useResult(r)">
					<span class="lk-name">{{ r.name }}<small v-if="r.brand"> {{ r.brand }}</small></span>
					<span class="lk-kcal mono">{{ r.kcal_per_100g }}<small> kcal/100 g</small></span>
				</button>
			</li>
		</ul>

		<form class="food-form" @submit.prevent="save">
			<n-input v-model:value="form.name" placeholder="Food name, e.g. Oats" class="ff-name" :maxlength="120" />
			<label class="ff-field"><span>kcal</span><n-input-number v-model:value="form.kcal" :min="0" :max="900" :show-button="false" placeholder="per 100 g" /></label>
			<label class="ff-field"><span>Protein</span><n-input-number v-model:value="form.protein" :min="0" :max="100" :show-button="false" placeholder="g" /></label>
			<label class="ff-field"><span>Carbs</span><n-input-number v-model:value="form.carbs" :min="0" :max="100" :show-button="false" placeholder="g" /></label>
			<label class="ff-field"><span>Fat</span><n-input-number v-model:value="form.fat" :min="0" :max="100" :show-button="false" placeholder="g" /></label>
			<label class="ff-field ff-serving">
				<span>One serving (optional)</span>
				<span class="ff-serving-row">
					<n-input v-model:value="form.servingName" placeholder="e.g. egg" :maxlength="40" />
					<n-input-number v-model:value="form.servingG" :min="1" :max="5000" :show-button="false" placeholder="weight">
						<template #suffix>g</template>
					</n-input-number>
				</span>
			</label>
			<p v-if="duplicate" class="ff-dup">
				You already have “{{ duplicate.name }}”.
				<button type="button" class="link" @click="edit(duplicate)">Edit that one</button>
			</p>
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
import { searchFoods } from '@/utils/openFoodFacts'
import { NButton, NIcon, NInput, NInputNumber, useDialog, useMessage } from 'naive-ui'
import { CreateOutline, TrashOutline } from '@vicons/ionicons5'
import { db } from '@/db'
import { byName, foods, savedMeals } from '@/food'
import type { FoodItem } from '@/types'

const message = useMessage()
const dialog = useDialog()
const blank = () => ({
	name: '', kcal: null as number | null, protein: null as number | null, carbs: null as number | null, fat: null as number | null,
	servingName: '', servingG: null as number | null,
})
const form = reactive(blank())
const editingId = ref<number | null>(null)
const saving = ref(false)
const query = ref('')
const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ')
/** Another food with the same name; two "Oats" in the picker is a guessing game. */
const duplicate = computed(() => {
	const n = norm(form.name)
	return n ? foods.value.find(f => f.id !== editingId.value && norm(f.name) === n) ?? null : null
})
const canSave = computed(() => form.name.trim().length > 0 && form.kcal != null && !duplicate.value)

// ─── packet lookup ───
const lookupText = ref('')
const looking = ref(false)
const lookupNote = ref('')
const results = ref<Awaited<ReturnType<typeof searchFoods>>>([])
let lookupAbort: AbortController | null = null

async function lookup() {
	lookupAbort?.abort()
	const ctl = (lookupAbort = new AbortController())
	looking.value = true
	lookupNote.value = ''
	try {
		results.value = await searchFoods(lookupText.value, ctl.signal)
		if (!results.value.length) lookupNote.value = 'Nothing found. Try fewer words, or type the values from the packet.'
	} catch (err) {
		if ((err as Error).name === 'AbortError') return
		console.error(err)
		results.value = []
		lookupNote.value = "Couldn't reach Open Food Facts. Check your connection, or type the values from the packet."
	} finally { if (lookupAbort === ctl) looking.value = false }
}

function useResult(r: (typeof results.value)[number]) {
	editingId.value = null
	Object.assign(form, {
		name: r.brand && !r.name.toLowerCase().includes(r.brand.toLowerCase()) ? `${r.name} (${r.brand})`.slice(0, 120) : r.name,
		kcal: r.kcal_per_100g, protein: r.protein_per_100g, carbs: r.carbs_per_100g, fat: r.fat_per_100g,
		servingName: r.serving_name ?? '', servingG: r.serving_g,
	})
	results.value = []
	lookupNote.value = 'Check the values against the packet, then add it.'
}

const shown = computed(() => {
	const q = query.value.trim().toLowerCase()
	return q ? foods.value.filter(f => f.name.toLowerCase().includes(q)) : foods.value
})

const macroLine = (f: FoodItem) => [
	[[f.protein_per_100g, 'P'], [f.carbs_per_100g, 'C'], [f.fat_per_100g, 'F']]
		.filter(([v]) => v != null).map(([v, l]) => `${Math.round((v as number) * 10) / 10}${l}`).join(' '),
	f.serving_g ? `1 ${f.serving_name || 'serving'} = ${Math.round(f.serving_g)} g` : '',
].filter(Boolean).join(', ')

function reset() { Object.assign(form, blank()); editingId.value = null }
function edit(f: FoodItem) {
	editingId.value = f.id
	Object.assign(form, {
		name: f.name, kcal: f.kcal_per_100g, protein: f.protein_per_100g, carbs: f.carbs_per_100g, fat: f.fat_per_100g,
		servingName: f.serving_name ?? '', servingG: f.serving_g ?? null,
	})
}

async function save() {
	if (!canSave.value) return
	saving.value = true
	try {
		const row = await db.saveFood({
			name: form.name.trim().slice(0, 120), kcal_per_100g: form.kcal!,
			protein_per_100g: form.protein, carbs_per_100g: form.carbs, fat_per_100g: form.fat,
			serving_g: form.servingG || null,
			serving_name: form.servingG ? form.servingName.trim().slice(0, 40) || null : null,
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
.ff-serving { grid-column: 1 / span 3; }
.ff-serving-row { display: grid; grid-template-columns: minmax(0, 1fr) 120px; gap: 8px; }
.ff-dup { grid-column: 1 / -1; margin: 0; font-size: 0.84rem; color: var(--warning-color); }
.link { border: none; background: none; padding: 0; font: inherit; cursor: pointer; color: var(--primary-color); text-decoration: underline; text-underline-offset: 2px; }

.lookup { display: flex; gap: 8px; margin-bottom: 8px; }
.lk-input { flex: 1; }
.lk-note { margin: 0 0 12px; font-size: 0.84rem; color: var(--text-muted); }
.lk-results { list-style: none; margin: 0 0 16px; padding: 0; border: 1px solid var(--border-color); border-radius: var(--radius-sm); max-height: 320px; overflow-y: auto; }
.lk-results li + li { border-top: 1px solid var(--border-subtle); }
.lk-row {
	width: 100%; display: flex; align-items: baseline; gap: 12px; padding: 10px 12px;
	border: none; background: none; cursor: pointer; font: inherit; text-align: left; color: var(--text-color);
}
.lk-row:hover, .lk-row:focus-visible { background: var(--surface-hover); }
.lk-name { flex: 1; min-width: 0; font-size: 0.92rem; }
.lk-name small, .lk-kcal small { color: var(--text-muted); font-size: 0.8rem; }
.lk-kcal { font-size: 0.9rem; font-weight: 600; white-space: nowrap; }
.ff-actions { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; }
.ff-hint { margin-right: auto; font-size: 0.78rem; color: var(--text-muted); }
@media (max-width: 640px) {
	.food-form { grid-template-columns: repeat(4, minmax(0, 1fr)); }
	.ff-name, .ff-serving { grid-column: 1 / -1; }
	.ff-hint { display: none; }
	.ff-actions { justify-content: flex-end; }
}
.search { margin-top: 16px; }
</style>
