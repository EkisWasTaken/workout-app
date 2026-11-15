/** Your food library and saved meals, loaded once and shared by the Food page's tabs. */
import { computed, ref } from 'vue'
import { db, MISSING_MEALS } from './db'
import { mealAsFood } from './utils/meals'
import type { FoodItem, SavedMeal } from './types'

export const foods = ref<FoodItem[]>([])
export const savedMeals = ref<SavedMeal[]>([])
export const foodMissingTable = ref(false)

export const foodsById = computed(() => new Map(foods.value.map(f => [f.id, f])))

/** Each saved meal with its per-100 g nutrition and total weight; empty recipes are left out. */
export const mealFoods = computed(() => savedMeals.value.flatMap(m => {
	const asFood = mealAsFood(m, foodsById.value)
	return asFood ? [{ meal: m, ...asFood }] : []
}))

export async function loadFoodLibrary(): Promise<void> {
	try {
		const [f, m] = await Promise.all([db.getFoods(), db.getSavedMeals()])
		foods.value = f
		savedMeals.value = m
		foodMissingTable.value = false
	} catch (err) {
		if (err instanceof Error && err.message === MISSING_MEALS) foodMissingTable.value = true
		else throw err
	}
}

export const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name)
