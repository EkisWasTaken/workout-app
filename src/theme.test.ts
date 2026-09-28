import { describe, expect, it } from 'vitest'
import { resolveInitialTheme } from './theme'

describe('resolveInitialTheme', () => {
	it('honours a saved choice over the system setting', () => {
		expect(resolveInitialTheme('light', true)).toBe('light')
		expect(resolveInitialTheme('dark', false)).toBe('dark')
	})

	it('follows the system when nothing has been chosen', () => {
		expect(resolveInitialTheme(null, true)).toBe('dark')
		expect(resolveInitialTheme(null, false)).toBe('light')
	})

	it('ignores a value it does not recognise', () => {
		// A stale key from an older build, or someone editing localStorage.
		expect(resolveInitialTheme('linen', false)).toBe('light')
		expect(resolveInitialTheme('', true)).toBe('dark')
		expect(resolveInitialTheme('DARK', false)).toBe('light')
	})
})
