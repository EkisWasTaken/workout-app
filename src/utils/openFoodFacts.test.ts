import { describe, expect, it } from 'vitest'
import { offToFood } from './openFoodFacts'

describe('offToFood', () => {
	it('maps per-100 g nutrition and a serving', () => {
		expect(offToFood({
			product_name: 'Protein bar', brands: 'Acme, Acme Foods', serving_size: '1 bar (40 g)', serving_quantity: '40',
			nutriments: { 'energy-kcal_100g': 372.4, proteins_100g: 30, carbohydrates_100g: '35.55', fat_100g: 12 },
		})).toEqual({
			name: 'Protein bar', brand: 'Acme', kcal_per_100g: 372,
			protein_per_100g: 30, carbs_per_100g: 35.6, fat_per_100g: 12, serving_g: 40, serving_name: 'bar',
		})
	})

	it('falls back to kJ and leaves unknown macros null', () => {
		const f = offToFood({ product_name: 'Juice', nutriments: { energy_100g: 184 } })
		expect(f?.kcal_per_100g).toBe(44)
		expect(f?.protein_per_100g).toBeNull()
		expect(f?.serving_g).toBeNull()
	})

	it('names an unlabelled serving "serving"', () => {
		expect(offToFood({ product_name: 'Yoghurt', serving_size: '150 g', serving_quantity: 150, nutriments: { 'energy-kcal_100g': 60 } })?.serving_name)
			.toBe('serving')
	})

	it('skips products without a name or kcal', () => {
		expect(offToFood({ product_name: 'Mystery', nutriments: {} })).toBeNull()
		expect(offToFood({ nutriments: { 'energy-kcal_100g': 100 } })).toBeNull()
	})
})
