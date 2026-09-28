import { describe, expect, it } from 'vitest'
import { ALL_TOKENS, TOKEN_GROUPS, contrast, derivedFrom, grade, luminance, toHex, toRgb } from './uiLab'
import { GREEN_BAND, PALETTES, buildPalette, fillFor, hslToHex, isGreen, modeFor } from './uiLabPalettes'
import { LOOKS, lookProblems, lookSwatches, matchesLook, stylesForLook } from './uiLabLooks'
import { SCALE_PX, STYLE_SWITCHES, TYPE_PAIRINGS } from './uiLabStyles'

/** Hue in degrees, or null when the value isn't a colour. */
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

describe('token definitions', () => {
	it('has no duplicate token names across groups', () => {
		const names = ALL_TOKENS.map(t => t.name)
		expect(new Set(names).size).toBe(names.length)
	})

	it('has a unique key per group', () => {
		const keys = TOKEN_GROUPS.map(g => g.key)
		expect(new Set(keys).size).toBe(keys.length)
	})
})

describe('colour parsing', () => {
	it('reads the shapes the stylesheet actually uses', () => {
		expect(toRgb('#38bdf8')).toEqual({ r: 56, g: 189, b: 248 })
		expect(toRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 })
		expect(toRgb('rgba(56, 189, 248, 0.14)')).toEqual({ r: 56, g: 189, b: 248 })
	})

	it('is null for anything it cannot read', () => {
		expect(toRgb('var(--primary-color)')).toBeNull()
		expect(toRgb('chartreuse')).toBeNull()
	})

	it('normalises to the six-digit form a colour input needs', () => {
		expect(toHex('#FFF')).toBe('#ffffff')
		expect(toHex('rgb(56, 189, 248)')).toBe('#38bdf8')
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

	it('carries the accent into its soft, glow and alias', () => {
		const out = derivedFrom('primary-color', '#9b8cff')
		expect(out['primary-soft']).toBe('rgba(155, 140, 255, 0.13)')
		expect(out['glow-color']).toBe('rgba(155, 140, 255, 0.3)')
		expect(out['accent-color']).toBe('#9b8cff')
	})

	it('carries each verdict into its own tint', () => {
		expect(derivedFrom('success-color', '#4ade80')['success-soft']).toBe('rgba(74, 222, 128, 0.12)')
		expect(derivedFrom('danger-color', '#f87171')['danger-soft']).toBe('rgba(248, 113, 113, 0.12)')
	})

	it('derives nothing for a token nothing depends on, or a value it cannot parse', () => {
		expect(derivedFrom('text-muted', '#747c8b')).toEqual({})
		expect(derivedFrom('color-running-primary', 'inherit')).toEqual({})
	})
})

describe('contrast', () => {
	it('matches the known extremes and is symmetric', () => {
		expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1)
		expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5)
		expect(contrast('#12151b', '#eef0f4')).toBeCloseTo(contrast('#eef0f4', '#12151b')!, 10)
	})

	it('grades against the WCAG thresholds', () => {
		expect(grade(21)).toBe('AAA')
		expect(grade(4.5)).toBe('AA')
		expect(grade(3)).toBe('AA Large')
		expect(grade(2.9)).toBe('Fail')
	})

	it('puts black below white in luminance', () => {
		expect(luminance('#000000')).toBeLessThan(luminance('#ffffff')!)
	})
})

describe('hslToHex', () => {
	it('hits the primaries', () => {
		expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000')
		expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe('#00ff00')
		expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe('#0000ff')
	})

	it('hits the greys at any hue', () => {
		expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000')
		expect(hslToHex({ h: 200, s: 0, l: 100 })).toBe('#ffffff')
		expect(hslToHex({ h: 47, s: 0, l: 50 })).toBe('#808080')
	})

	it('wraps hues outside 0–360', () => {
		expect(hslToHex({ h: 360, s: 100, l: 50 })).toBe(hslToHex({ h: 0, s: 100, l: 50 }))
		expect(hslToHex({ h: -120, s: 100, l: 50 })).toBe(hslToHex({ h: 240, s: 100, l: 50 }))
	})
})

describe('fillFor', () => {
	// The reason it exists: a pale accent must still yield a button you can read
	// white text on, rather than shipping white-on-white.
	it('always lands on a fill that clears AA against white', () => {
		for (let hue = 0; hue < 360; hue += 15) {
			for (const sat of [40, 70, 95]) {
				const fill = hslToHex(fillFor(hue, sat))
				expect(contrast('#ffffff', fill)!, `hue ${hue} sat ${sat}`).toBeGreaterThanOrEqual(4.5)
			}
		}
	})

	it('darkens a pale accent rather than returning it unchanged', () => {
		expect(fillFor(50, 80, 78).l).toBeLessThan(78)
	})

	it('leaves an already-dark accent alone', () => {
		const fill = fillFor(250, 80, 30)
		expect(fill.l).toBe(30)
	})
})

describe('palettes', () => {
	it('has a unique key each', () => {
		const keys = PALETTES.map(p => p.key)
		expect(new Set(keys).size).toBe(keys.length)
	})

	it('ships a decent number of genuinely different themes', () => {
		expect(PALETTES.length).toBeGreaterThanOrEqual(18)
	})

	it('only sets tokens the lab knows about', () => {
		const known = new Set(ALL_TOKENS.map(t => t.name))
		for (const p of PALETTES) {
			for (const name of Object.keys(p.values)) {
				expect(known, `${p.key} → ${name}`).toContain(name)
			}
		}
	})

	it('never touches shape, type or layout — those are the switches’ business', () => {
		const colour = new Set(ALL_TOKENS.filter(t => t.kind === 'color').map(t => t.name))
		for (const p of PALETTES) {
			for (const name of Object.keys(p.values)) {
				expect(colour, `${p.key} sets non-colour token ${name}`).toContain(name)
			}
		}
	})

	it('keeps body text at AA or better on the card surface', () => {
		for (const p of PALETTES) {
			const ratio = contrast(p.values['text-color'], p.values['surface-color'])!
			expect(ratio, `${p.key}: text on card`).toBeGreaterThanOrEqual(4.5)
		}
	})

	it('keeps secondary text at AA too', () => {
		for (const p of PALETTES) {
			const ratio = contrast(p.values['text-secondary'], p.values['surface-color'])!
			expect(ratio, `${p.key}: secondary on card`).toBeGreaterThanOrEqual(4.5)
		}
	})

	it('keeps muted text readable at large sizes at least', () => {
		for (const p of PALETTES) {
			const ratio = contrast(p.values['text-muted'], p.values['surface-color'])!
			expect(ratio, `${p.key}: muted on card`).toBeGreaterThanOrEqual(3)
		}
	})

	it('keeps white legible on every button fill', () => {
		for (const p of PALETTES) {
			const ratio = contrast('#ffffff', p.values['primary-fill'])!
			expect(ratio, `${p.key}: white on fill`).toBeGreaterThanOrEqual(4.5)
		}
	})

	it('keeps the accent and every sport visible against the card', () => {
		for (const p of PALETTES) {
			for (const name of [
				'primary-color', 'color-running-primary', 'color-gym-primary',
				'color-bike-primary', 'color-other-primary',
			]) {
				const ratio = contrast(p.values[name], p.values['surface-color'])!
				expect(ratio, `${p.key}: ${name} on card`).toBeGreaterThanOrEqual(3)
			}
		}
	})

	it('never gives a sport a green hue, which would read as a verdict', () => {
		for (const p of PALETTES) {
			for (const sport of ['running', 'gym', 'bike']) {
				const hue = hueOf(p.values[`color-${sport}-primary`])!
				expect(isGreen(hue), `${p.key} ${sport} is green (hue ${hue.toFixed(0)})`).toBe(false)
			}
		}
	})

	it('keeps the three real sports distinguishable from one another', () => {
		for (const p of PALETTES) {
			const hues = ['running', 'gym', 'bike'].map(s => hueOf(p.values[`color-${s}-primary`])!)
			for (let i = 0; i < hues.length; i++) {
				for (let j = i + 1; j < hues.length; j++) {
					const apart = Math.min(Math.abs(hues[i] - hues[j]), 360 - Math.abs(hues[i] - hues[j]))
					expect(apart, `${p.key}: sports ${i} and ${j} only ${apart.toFixed(0)}° apart`).toBeGreaterThan(25)
				}
			}
		}
	})

	it('steps the surfaces apart so a card separates from its page', () => {
		for (const p of PALETTES) {
			const page = luminance(p.values['background-color'])!
			const card = luminance(p.values['surface-color'])!
			const inset = luminance(p.values['surface-2'])!

			// A card is lifted off its page in both modes — that part is universal.
			expect(card, `${p.key}: card vs page`).toBeGreaterThan(page)

			// The inset is not. On a dark ground an input is a step *up* toward
			// the light; on paper it is a step down into the page. What has to
			// hold either way is that it is clearly not the card.
			if (p.mode === 'light') expect(inset, `${p.key}: inset vs card`).toBeLessThan(card)
			else expect(inset, `${p.key}: inset vs card`).toBeGreaterThan(card)

			// Luminance deltas near black are tiny in absolute terms, so the
			// separation is checked as distinct values rather than a threshold
			// that would mean something different at each end of the ramp.
			expect(p.values['surface-2'], `${p.key}: inset equals card`).not.toBe(p.values['surface-color'])
			expect(p.values['surface-color'], `${p.key}: card equals page`).not.toBe(p.values['background-color'])
		}
	})

	it('gives every tile five swatches', () => {
		for (const p of PALETTES) expect(p.swatches, p.key).toHaveLength(5)
	})

	it('produces the same values every time it is built', () => {
		for (const p of PALETTES) expect(buildPalette(p)).toEqual(p.values)
	})

	it('has a green band that excludes the stock sports', () => {
		expect(GREEN_BAND[0]).toBeLessThan(GREEN_BAND[1])
		// Stock running (198), gym (329) and bike (27) must all be outside it.
		for (const hue of [198, 329, 27]) expect(isGreen(hue)).toBe(false)
		// And the stock success green must be inside it.
		expect(isGreen(142)).toBe(true)
	})
})

describe('style switches', () => {
	it('has a unique key each', () => {
		const keys = STYLE_SWITCHES.map(s => s.key)
		expect(new Set(keys).size).toBe(keys.length)
	})

	it('gives every switch a fallback that is one of its own options', () => {
		for (const sw of STYLE_SWITCHES) {
			expect(sw.options.map(o => o.value), sw.key).toContain(sw.fallback)
		}
	})

	it('has unique option values within a switch', () => {
		for (const sw of STYLE_SWITCHES) {
			const values = sw.options.map(o => o.value)
			expect(new Set(values).size, sw.key).toBe(values.length)
		}
	})

	it('offers at least two options everywhere — a switch with one is not a switch', () => {
		for (const sw of STYLE_SWITCHES) expect(sw.options.length, sw.key).toBeGreaterThanOrEqual(2)
	})

	it('has a type pairing for every option the type switch offers', () => {
		const sw = STYLE_SWITCHES.find(s => s.key === 'type')!
		for (const opt of sw.options) {
			expect(TYPE_PAIRINGS[opt.value], opt.value).toBeDefined()
			expect(TYPE_PAIRINGS[opt.value].body.length).toBeGreaterThan(0)
			expect(TYPE_PAIRINGS[opt.value].display.length).toBeGreaterThan(0)
		}
	})

	it('has a root size for every option the scale switch offers', () => {
		const sw = STYLE_SWITCHES.find(s => s.key === 'scale')!
		for (const opt of sw.options) {
			expect(SCALE_PX[opt.value], opt.value).toBeGreaterThan(10)
		}
		// The default has to be the browser's own, or "stock" would not be stock.
		expect(SCALE_PX[sw.fallback]).toBe(16)
	})

	it('loads no webfonts for the pairings that need none', () => {
		expect(TYPE_PAIRINGS.default.google).toEqual([])
		expect(TYPE_PAIRINGS.neutral.google).toEqual([])
	})
})

describe('light palettes', () => {
	const light = PALETTES.filter(p => p.mode === 'light')
	const dark = PALETTES.filter(p => p.mode === 'dark')

	it('ships some of each, or the mode is theatre', () => {
		expect(light.length).toBeGreaterThan(2)
		expect(dark.length).toBeGreaterThan(2)
	})

	it('puts the page near white and the text near black', () => {
		for (const p of light) {
			expect(luminance(p.values['background-color'])!, `${p.key}: page`).toBeGreaterThan(0.7)
			expect(luminance(p.values['text-color'])!, `${p.key}: text`).toBeLessThan(0.1)
		}
	})

	it('inverts the dark ramp rather than reusing it', () => {
		for (const p of dark) {
			expect(luminance(p.values['background-color'])!, `${p.key}: page`).toBeLessThan(0.1)
			expect(luminance(p.values['text-color'])!, `${p.key}: text`).toBeGreaterThan(0.6)
		}
	})

	it('darkens the verdicts and sensors that only work on a black ground', () => {
		for (const p of light) {
			for (const name of ['success-color', 'warning-color', 'danger-color', 'color-heartrate']) {
				const ratio = contrast(p.values[name], p.values['surface-color'])!
				expect(ratio, `${p.key}: ${name} on card`).toBeGreaterThanOrEqual(4.5)
			}
		}
	})

	it('reports its mode by key, defaulting to dark for anything unknown', () => {
		expect(modeFor('paper')).toBe('light')
		expect(modeFor('stock')).toBe('dark')
		expect(modeFor(null)).toBe('dark')
		expect(modeFor('no-such-palette')).toBe('dark')
	})
})

describe('looks', () => {
	it('has a unique key each', () => {
		const keys = LOOKS.map(l => l.key)
		expect(new Set(keys).size).toBe(keys.length)
	})

	it('only ever names a palette and switch options that exist', () => {
		for (const look of LOOKS) expect(lookProblems(look), look.key).toEqual([])
	})

	it('is more than a repaint — every look but the stock one moves the shape too', () => {
		for (const look of LOOKS) {
			if (look.key === 'trainlog') continue
			expect(Object.keys(look.styles).length, `${look.key} changes no switches`).toBeGreaterThan(4)
		}
	})

	it('spells out every switch, so looks replace rather than layer', () => {
		for (const look of LOOKS) {
			const styles = stylesForLook(look)
			for (const sw of STYLE_SWITCHES) expect(styles[sw.key], `${look.key}/${sw.key}`).toBeDefined()
		}
	})

	it('recognises itself, and nothing else', () => {
		for (const look of LOOKS) {
			const styles = stylesForLook(look)
			expect(matchesLook(look, look.palette, styles), look.key).toBe(true)
			expect(matchesLook(look, 'no-such-palette', styles), look.key).toBe(false)
		}
	})

	it('stops matching once a single switch is moved off it', () => {
		const look = LOOKS.find(l => l.key === 'brutalist')!
		const styles = { ...stylesForLook(look), corners: 'round' }
		expect(matchesLook(look, look.palette, styles)).toBe(false)
	})

	it('covers both grounds, so the gallery is not twelve dark themes', () => {
		const modes = new Set(LOOKS.map(l => modeFor(l.palette)))
		expect(modes).toContain('dark')
		expect(modes).toContain('light')
	})

	it('reaches for a real palette’s swatches for its tile', () => {
		for (const look of LOOKS) expect(lookSwatches(look), look.key).toHaveLength(5)
	})
})
