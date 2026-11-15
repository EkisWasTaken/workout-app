import { describe, expect, it, vi } from 'vitest'

const order = vi.fn(async () => ({ data: [{ id: 1, data: { name: 'Run', start_date: '2026-11-01' } }], error: null }))
const from = vi.fn(() => ({ select: () => ({ order }) }))
vi.mock('./supabase', () => ({ supabase: { from } }))
vi.mock('./auth', () => ({ currentUserId: () => 'u1' }))

const { db, invalidateActivityCache } = await import('./db')

describe('imported activity cache', () => {
	it('shares one fetch between callers until invalidated', async () => {
		const [a, b] = await Promise.all([db.getImportedActivities(), db.getImportedActivities()])
		await db.getImportedActivities()
		expect(from).toHaveBeenCalledTimes(1)
		expect(a).not.toBe(b) // each caller gets its own array to sort
		expect(a[0]).toMatchObject({ id: 1, name: 'Run', source: 'import' })

		invalidateActivityCache()
		await db.getImportedActivities()
		expect(from).toHaveBeenCalledTimes(2)
	})
})
