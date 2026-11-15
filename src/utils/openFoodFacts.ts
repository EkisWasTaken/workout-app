/**
 * Packet lookup via Open Food Facts: a free, open database with no API key.
 * Only the search text or barcode is sent.
 */
import type { FoodItemPayload } from '../types'

export interface OffProduct {
	code?: string
	product_name?: string
	brands?: string
	serving_size?: string
	serving_quantity?: number | string
	nutriments?: Record<string, number | string | undefined>
}

const FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments'
const num = (v: unknown) => {
	const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
	return Number.isFinite(n) ? n : null
}
const clamp = (v: number | null, max: number) => (v == null ? null : Math.round(Math.min(max, Math.max(0, v)) * 10) / 10)

/** A product as a library food, or null when it has no usable kcal. Values clamp to what the database accepts. */
export function offToFood(p: OffProduct): (FoodItemPayload & { brand: string }) | null {
	const n = p.nutriments ?? {}
	const kj = num(n.energy_100g) ?? num(n['energy-kj_100g'])
	const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : null)
	const name = (p.product_name ?? '').trim()
	if (kcal == null || !name) return null
	const servingG = num(p.serving_quantity)
	// "1 bar (40 g)" → "bar"; anything unparseable falls back to "serving".
	const servingName = (p.serving_size ?? '').replace(/\(.*?\)/g, '').replace(/^\s*1\s+/, '').trim().slice(0, 40)
	return {
		name: name.slice(0, 120),
		brand: (p.brands ?? '').split(',')[0].trim(),
		kcal_per_100g: Math.round(Math.min(900, kcal)),
		protein_per_100g: clamp(num(n.proteins_100g), 100),
		carbs_per_100g: clamp(num(n.carbohydrates_100g), 100),
		fat_per_100g: clamp(num(n.fat_100g), 100),
		serving_g: servingG && servingG > 0 && servingG <= 5000 ? servingG : null,
		serving_name: servingG && servingName && !/^\d/.test(servingName) ? servingName : servingG ? 'serving' : null,
	}
}

/** Search by name, or look up one product when the text is a barcode. */
export async function searchFoods(text: string, signal?: AbortSignal) {
	const q = text.trim()
	if (!q) return []
	if (/^\d{8,14}$/.test(q)) {
		const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${q}.json?fields=${FIELDS}`, { signal })
		if (r.status === 404) return []
		if (!r.ok) throw new Error(`Open Food Facts ${r.status}`)
		const j = await r.json() as { status?: number; product?: OffProduct }
		const f = j.status === 1 && j.product ? offToFood(j.product) : null
		return f ? [f] : []
	}
	const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=${FIELDS}`
	const r = await fetch(url, { signal })
	if (!r.ok) throw new Error(`Open Food Facts ${r.status}`)
	const j = await r.json() as { products?: OffProduct[] }
	const foods = (j.products ?? []).flatMap(p => { const f = offToFood(p); return f ? [f] : [] })
	// OFF also matches on ingredients and categories; names that contain every word come first.
	const words = q.toLowerCase().split(/\s+/)
	const named = (f: { name: string; brand: string }) => words.every(w => `${f.name} ${f.brand}`.toLowerCase().includes(w)) ? 0 : 1
	return foods.sort((a, b) => named(a) - named(b))
}
