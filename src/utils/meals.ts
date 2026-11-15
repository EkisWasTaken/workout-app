import type { FoodItem, MealEntry, MealSlot, SavedMeal } from '../types'

export const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
	{ key: 'breakfast', label: 'Breakfast' },
	{ key: 'lunch', label: 'Lunch' },
	{ key: 'dinner', label: 'Dinner' },
	{ key: 'snack', label: 'Snacks' },
]

export interface MealTotals { kcal: number; proteinG: number; carbsG: number; fatG: number }

export function mealTotals(entries: Pick<MealEntry, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>[]): MealTotals {
	const t = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
	for (const e of entries) {
		t.kcal += e.kcal
		t.proteinG += e.protein_g ?? 0
		t.carbsG += e.carbs_g ?? 0
		t.fatG += e.fat_g ?? 0
	}
	return { kcal: Math.round(t.kcal), proteinG: Math.round(t.proteinG), carbsG: Math.round(t.carbsG), fatG: Math.round(t.fatG) }
}

type Per100 = Pick<FoodItem, 'kcal_per_100g' | 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g'>

const scale = (per100: number | null, grams: number) =>
	per100 == null ? null : Math.round(per100 * grams) / 100

/** What `grams` of a food comes to. Missing macros stay missing rather than becoming 0. */
export function portion(food: Per100, grams: number) {
	return {
		kcal: Math.round((food.kcal_per_100g * grams) / 100),
		protein_g: scale(food.protein_per_100g, grams),
		carbs_g: scale(food.carbs_per_100g, grams),
		fat_g: scale(food.fat_per_100g, grams),
	}
}

/**
 * A saved meal as if it were one food: its nutrition per 100 g of the finished
 * dish, and how much the whole recipe weighs. That lets "I ate 350 g of the
 * pot" be logged exactly like a single food. Items whose food was deleted are
 * skipped. A macro counts only if every ingredient has it.
 */
export function mealAsFood(meal: SavedMeal, foods: Map<number, FoodItem>): (Per100 & { totalGrams: number }) | null {
	let grams = 0, kcal = 0
	const sums: Record<'protein' | 'carbs' | 'fat', number | null> = { protein: 0, carbs: 0, fat: 0 }
	for (const it of meal.items) {
		const f = foods.get(it.food_id)
		if (!f) continue
		grams += it.grams
		kcal += (f.kcal_per_100g * it.grams) / 100
		for (const k of ['protein', 'carbs', 'fat'] as const) {
			const v = f[`${k}_per_100g`]
			sums[k] = v == null || sums[k] == null ? null : sums[k]! + (v * it.grams) / 100
		}
	}
	if (grams <= 0) return null
	const per100 = (v: number | null) => (v == null ? null : (v / grams) * 100)
	return {
		totalGrams: Math.round(grams),
		kcal_per_100g: (kcal / grams) * 100,
		protein_per_100g: per100(sums.protein),
		carbs_per_100g: per100(sums.carbs),
		fat_per_100g: per100(sums.fat),
	}
}
