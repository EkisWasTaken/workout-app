import { describe, expect, it } from 'vitest'
import { mealAsFood, mealTotals, portion } from './meals'
import type { FoodItem, MealEntry } from '../types'

const e = (kcal: number, p: number | null = null): Pick<MealEntry, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'> =>
	({ kcal, protein_g: p, carbs_g: null, fat_g: null })
const food = (id: number, kcal: number, protein: number | null): FoodItem =>
	({ id, name: `f${id}`, kcal_per_100g: kcal, protein_per_100g: protein, carbs_per_100g: null, fat_per_100g: null })

describe('meals', () => {
	it('totals treat missing macros as zero', () => {
		expect(mealTotals([e(300, 20.4), e(150)])).toEqual({ kcal: 450, proteinG: 20, carbsG: 0, fatG: 0 })
	})

	it('scales a food by grams and keeps unknown macros unknown', () => {
		expect(portion(food(1, 389, 13.2), 60)).toEqual({ kcal: 233, protein_g: 7.92, carbs_g: null, fat_g: null })
	})

	it('turns a recipe into per-100 g of the finished dish', () => {
		const foods = new Map([[1, food(1, 100, 10)], [2, food(2, 300, 0)]])
		const m = mealAsFood({ id: 1, name: 'pot', items: [{ food_id: 1, grams: 300 }, { food_id: 2, grams: 100 }, { food_id: 9, grams: 50 }] }, foods)!
		expect(m.totalGrams).toBe(400)
		expect(m.kcal_per_100g).toBe(150)        // (300 + 300) kcal / 400 g
		expect(m.protein_per_100g).toBe(7.5)     // 30 g / 400 g
		expect(mealAsFood({ id: 2, name: 'empty', items: [] }, foods)).toBeNull()
	})
})
