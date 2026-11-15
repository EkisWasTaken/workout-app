import { describe, expect, it } from 'vitest'
import { progressVerdict, recentVsPrior, windowProgress } from './charts'

describe('chart progress helpers', () => {
	it('measures first to last real value inside the window', () => {
		const pts = [{ x: 1, y: 400 }, { x: 2, y: null }, { x: 3, y: 390 }, { x: 4, y: 376 }]
		expect(windowProgress(pts, 2)).toEqual({ startX: 3, start: 390, endX: 4, end: 376, delta: -14 })
		expect(windowProgress([{ x: 1, y: 5 }])).toBeNull()
	})

	it('judges direction by which way is good', () => {
		expect(progressVerdict(-14, 'down')).toBe('better')   // pace: fewer s/km
		expect(progressVerdict(-14, 'up')).toBe('worse')
		expect(progressVerdict(0.2, 'up', 0.5)).toBe('steady')
	})

	it('compares recent complete weeks with the ones before, skipping the week in progress', () => {
		expect(recentVsPrior([10, 10, 10, 10, 12, 12, 12, 12, 3], 4)).toEqual({ recent: 12, prior: 10, pct: 20 })
		expect(recentVsPrior([1, 2, 3], 4)).toBeNull()
	})
})
