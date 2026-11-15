import { beforeEach, describe, expect, it, vi } from 'vitest'

const addMealEntries = vi.fn()
vi.mock('./db', () => ({ db: { addMealEntries: (l: unknown[]) => addMealEntries(l) } }))

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
	getItem: (k: string) => store.get(k) ?? null,
	setItem: (k: string, v: string) => { store.set(k, v) },
	removeItem: (k: string) => { store.delete(k) },
})

const { flushMeals, isNetworkError, pendingMeals, queueMeal, unqueueMeal } = await import('./mealQueue')
const entry = (name: string) => ({ date: '2026-11-15', meal: 'lunch' as const, name, kcal: 100, protein_g: null, carbs_g: null, fat_g: null })

describe('meal queue', () => {
	beforeEach(() => { store.clear(); addMealEntries.mockReset() })

	it('recognises a dropped connection but not a server error', () => {
		expect(isNetworkError({ message: 'TypeError: Failed to fetch' })).toBe(true)
		expect(isNetworkError(new Error('Load failed'))).toBe(true)
		expect(isNetworkError({ message: 'new row violates row-level security policy' })).toBe(false)
	})

	it('queues, removes by position, and empties after a successful flush', async () => {
		queueMeal(entry('a')); queueMeal(entry('b')); queueMeal(entry('c'))
		unqueueMeal(1)
		expect(pendingMeals().map(e => e.name)).toEqual(['a', 'c'])
		addMealEntries.mockResolvedValue([{ id: 1 }, { id: 2 }])
		await flushMeals()
		expect(addMealEntries).toHaveBeenCalledWith([entry('a'), entry('c')])
		expect(pendingMeals()).toEqual([])
	})

	it('keeps everything when the flush fails', async () => {
		queueMeal(entry('a'))
		addMealEntries.mockRejectedValue(new Error('Failed to fetch'))
		await expect(flushMeals()).rejects.toThrow()
		expect(pendingMeals()).toHaveLength(1)
	})
})
