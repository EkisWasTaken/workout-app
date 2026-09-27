import { describe, expect, it } from 'vitest'
import { ALL_TOKENS, TOKEN_GROUPS, contrast, derivedFrom, grade, luminance, toHex, toRgb } from './uiLab'
import { PRESETS } from './uiLabPresets'

describe('token definitions', () => {
	it('has no duplicate token names across groups', () => {
		const names = ALL_TOKENS.map(t => t.name)
		expect(new Set(names).size).toBe(names.length)
	})

	it('gives every length and number token a range to slide over', () => {
		for (const t of ALL_TOKENS) {
			if (t.kind !== 'length' && t.kind !== 'number') continue
			expect(typeof t.min, t.name).toBe('number')
			expect(typeof t.max, t.name).toBe('number')
			expect(t.max!, t.name).toBeGreaterThan(t.min!)
		}
	})

	it('gives every font token a list to choose from', () => {
		for (const t of ALL_TOKENS) {
			if (t.kind === 'font') expect(['text', 'display'], t.name).toContain(t.fonts)
		}
	})

	it('has a unique key per group', () => {
		const keys = TOKEN_GROUPS.map(g => g.key)
		expect(new Set(keys).size).toBe(keys.length)
	})
})

describe('toRgb', () => {
	it('reads the shapes the stylesheet actually uses', () => {
		expect(toRgb('#38bdf8')).toEqual({ r: 56, g: 189, b: 248 })
		expect(toRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 })
		expect(toRgb('rgb(56, 189, 248)')).toEqual({ r: 56, g: 189, b: 248 })
		expect(toRgb('rgba(56, 189, 248, 0.14)')).toEqual({ r: 56, g: 189, b: 248 })
	})

	it('is null for anything it cannot read', () => {
		expect(toRgb('')).toBeNull()
		expect(toRgb('var(--primary-color)')).toBeNull()
		expect(toRgb('chartreuse')).toBeNull()
	})
})

describe('toHex', () => {
	it('normalises to the six-digit form a colour input needs', () => {
		expect(toHex('#FFF')).toBe('#ffffff')
		expect(toHex('rgb(56, 189, 248)')).toBe('#38bdf8')
		expect(toHex('#38bdf8')).toBe('#38bdf8')
	})

	it('falls back to black rather than emitting something invalid', () => {
		expect(toHex('not a colour')).toBe('#000000')
	})
})

describe('derivedFrom', () => {
	// The whole point: change a sport and its rgb triplet and soft tint follow,
	// or you get a blue route line on a pink chip.
	it('carries a sport colour into its triplet and tint', () => {
		const out = derivedFrom('color-running-primary', '#38bdf8')
		expect(out['color-running-primary-rgb']).toBe('56, 189, 248')
		expect(out['color-running-soft']).toBe('rgba(56, 189, 248, 0.14)')
	})

	it('keeps rest’s slightly stronger tint', () => {
		expect(derivedFrom('color-rest-primary', '#64748b')['color-rest-soft'])
			.toBe('rgba(100, 116, 139, 0.16)')
	})

	it('carries the accent into its soft, glow and alias', () => {
		const out = derivedFrom('primary-color', '#9b8cff')
		expect(out['primary-soft']).toBe('rgba(155, 140, 255, 0.13)')
		expect(out['glow-color']).toBe('rgba(155, 140, 255, 0.3)')
		expect(out['accent-color']).toBe('#9b8cff')
	})

	it('carries each verdict into its own tint', () => {
		expect(derivedFrom('success-color', '#4ade80')['success-soft']).toBe('rgba(74, 222, 128, 0.12)')
		expect(derivedFrom('warning-color', '#fbbf24')['warning-soft']).toBe('rgba(251, 191, 36, 0.12)')
		expect(derivedFrom('danger-color', '#f87171')['danger-soft']).toBe('rgba(248, 113, 113, 0.12)')
	})

	it('derives nothing for a token nothing depends on', () => {
		expect(derivedFrom('text-muted', '#747c8b')).toEqual({})
		expect(derivedFrom('radius', '14px')).toEqual({})
	})

	it('derives nothing from a value it cannot parse', () => {
		expect(derivedFrom('color-running-primary', 'inherit')).toEqual({})
	})
})

describe('contrast', () => {
	it('matches the known extremes', () => {
		expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1)
		expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5)
	})

	it('is symmetric', () => {
		expect(contrast('#12151b', '#eef0f4')).toBeCloseTo(contrast('#eef0f4', '#12151b')!, 10)
	})

	it('is null when a colour cannot be read', () => {
		expect(contrast('var(--x)', '#000')).toBeNull()
	})

	it('grades against the WCAG thresholds', () => {
		expect(grade(21)).toBe('AAA')
		expect(grade(7)).toBe('AAA')
		expect(grade(4.5)).toBe('AA')
		expect(grade(3)).toBe('AA Large')
		expect(grade(2.9)).toBe('Fail')
	})

	it('puts black below white in luminance', () => {
		expect(luminance('#000000')).toBeLessThan(luminance('#ffffff')!)
	})
})

/** The shipped palette, as a baseline every rule here must also pass. */
const STOCK_SPORTS: Record<string, string> = {
	'color-running-primary': '#38bdf8',
	'color-gym-primary': '#f472b6',
	'color-bike-primary': '#fb923c',
	'color-rest-primary': '#64748b',
	'color-other-primary': '#94a3b8',
}

describe('presets', () => {
	it('has a unique key each', () => {
		const keys = PRESETS.map(p => p.key)
		expect(new Set(keys).size).toBe(keys.length)
	})

	it('only sets tokens the lab knows about', () => {
		const known = new Set(ALL_TOKENS.map(t => t.name))
		for (const p of PRESETS) {
			for (const name of Object.keys(p.values)) {
				expect(known, `${p.key} → ${name}`).toContain(name)
			}
		}
	})

	it('keeps body text at AA or better on the card surface', () => {
		for (const p of PRESETS) {
			const bg = p.values['surface-color']
			const fg = p.values['text-color']
			if (!bg || !fg) continue
			const ratio = contrast(fg, bg)!
			expect(ratio, `${p.key}: text on card`).toBeGreaterThanOrEqual(4.5)
		}
	})

	it('keeps secondary text readable too', () => {
		for (const p of PRESETS) {
			const bg = p.values['surface-color']
			const fg = p.values['text-secondary']
			if (!bg || !fg) continue
			expect(contrast(fg, bg)!, `${p.key}: secondary on card`).toBeGreaterThanOrEqual(4.5)
		}
	})

	it('keeps white legible on the button fill', () => {
		for (const p of PRESETS) {
			const fill = p.values['primary-fill']
			if (!fill) continue
			expect(contrast('#ffffff', fill)!, `${p.key}: white on fill`).toBeGreaterThanOrEqual(4.5)
		}
	})

	// Green is the one hue a sport may never take: it means "better" everywhere
	// else in the app and there is no second cue on a chart line. Amber is a
	// softer rule — stock bike is #fb923c at hue 27, orange rather than amber,
	// and that overlap with the warning hue is a shipped, deliberate choice —
	// so it is not asserted here.
	const GREEN_BAND: [number, number] = [80, 170]

	it('never gives a sport a green hue, which would read as a verdict', () => {
		for (const p of [...PRESETS, { key: 'stock', values: STOCK_SPORTS }]) {
			for (const [name, value] of Object.entries(p.values)) {
				if (!/^color-(running|gym|bike|rest|other)-primary$/.test(name)) continue
				const hue = hueOf(value)
				if (hue === null) continue
				const inGreen = hue >= GREEN_BAND[0] && hue <= GREEN_BAND[1]
				expect(inGreen, `${p.key} ${name} is green (hue ${hue.toFixed(0)})`).toBe(false)
			}
		}
	})

	it('keeps the sports distinguishable from one another', () => {
		for (const p of PRESETS) {
			const sports = ['running', 'gym', 'bike']
				.map(s => p.values[`color-${s}-primary`])
				.filter(Boolean)
			for (let i = 0; i < sports.length; i++) {
				for (let j = i + 1; j < sports.length; j++) {
					const a = hueOf(sports[i])!
					const b = hueOf(sports[j])!
					const apart = Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
					expect(apart, `${p.key}: ${sports[i]} vs ${sports[j]}`).toBeGreaterThan(25)
				}
			}
		}
	})

	it('gives every preset four swatches for its button', () => {
		for (const p of PRESETS) expect(p.swatches, p.key).toHaveLength(4)
	})
})

/** Hue in degrees, 0–360, or null when the value isn't a colour. */
function hueOf(value: string): number | null {
	const rgb = toRgb(value)
	if (!rgb) return null
	const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255
	const max = Math.max(r, g, b), min = Math.min(r, g, b)
	const d = max - min
	if (d === 0) return 0
	let h: number
	if (max === r) h = ((g - b) / d) % 6
	else if (max === g) h = (b - r) / d + 2
	else h = (r - g) / d + 4
	return ((h * 60) + 360) % 360
}
