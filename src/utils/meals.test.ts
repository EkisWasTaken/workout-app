import { describe, expect, it } from 'vitest'
import { copyEntries, diaryGap, kcalByDate, mealAsFood, mealTotals, portion, rescaleEntry } from './meals'
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

describe('diary helpers', () => {
	const entry = (over: Partial<MealEntry> = {}): MealEntry => ({
		id: 1, date: '2026-11-10', meal: 'lunch', name: 'Rice', kcal: 360, protein_g: 7, carbs_g: 80, fat_g: null, grams: 100, ...over,
	})

	it('rescales a logged entry by its new weight', () => {
		expect(rescaleEntry(entry(), 250)).toEqual({ grams: 250, kcal: 900, protein_g: 17.5, carbs_g: 200, fat_g: null })
	})

	it('leaves an entry without grams unscaled', () => {
		expect(rescaleEntry(entry({ grams: null }), 250).kcal).toBe(360)
	})

	it('copies entries to a new date without ids', () => {
		const [c] = copyEntries([entry()], '2026-11-11')
		expect(c).not.toHaveProperty('id')
		expect(c.date).toBe('2026-11-11')
		expect(c.name).toBe('Rice')
	})

	it('sums kcal per date', () => {
		const m = kcalByDate([entry(), entry({ kcal: 40 }), entry({ date: '2026-11-11', kcal: 5 })])
		expect([...m]).toEqual([['2026-11-10', 400], ['2026-11-11', 5]])
	})

	it('flags under-logging only when the week is mostly logged and the gap is real', () => {
		expect(diaryGap(2600, { perDay: 2200, days: 6 })).toEqual({ kind: 'under', kcal: 400 })
		expect(diaryGap(2000, { perDay: 2300, days: 7 })).toEqual({ kind: 'over', kcal: 300 })
		expect(diaryGap(2600, { perDay: 2200, days: 3 })).toBeNull()
		expect(diaryGap(2300, { perDay: 2200, days: 7 })).toBeNull()
		expect(diaryGap(null, { perDay: 2200, days: 7 })).toBeNull()
	})
})
