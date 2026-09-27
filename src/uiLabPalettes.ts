/**
 * The palette library: whole themes, built from a short spec rather than
 * hand-typed hex by hex.
 *
 * Twenty palettes authored by hand would be twenty chances to get a lightness
 * step wrong, and the first thing you'd notice is a card that doesn't sit off
 * its page properly. So each one declares only what actually distinguishes it —
 * the neutral hue it's built on, how much of that hue bleeds into the greys,
 * its accent, and the three sport hues — and the ramp is generated from fixed
 * lightness steps shared by every palette. Change the steps once and all twenty
 * keep their relationships.
 *
 * Two rules are enforced by construction rather than by luck:
 *
 *   **White has to be legible on the button fill.** The fill is found by
 *   darkening the accent until it clears 4.5:1 against white, so no palette can
 *   ship a primary button you can't read.
 *
 *   **No sport may be green.** Green means "better" everywhere else in the app
 *   and a chart line carries no second cue. The generator refuses the green
 *   band; the tests assert it.
 */

// ─── colour maths ─────────────────────────────────────────────────────────────

export interface Hsl { h: number; s: number; l: number }

/** HSL (h 0–360, s/l 0–100) to `#rrggbb`. */
export function hslToHex({ h, s, l }: Hsl): string {
	const sat = s / 100
	const lum = l / 100
	const c = (1 - Math.abs(2 * lum - 1)) * sat
	const hp = (((h % 360) + 360) % 360) / 60
	const x = c * (1 - Math.abs((hp % 2) - 1))
	const [r1, g1, b1] =
		hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
		: hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x]
	const m = lum - c / 2
	const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
	return `#${to(r1)}${to(g1)}${to(b1)}`
}

const channel = (c: number) => {
	const s = c / 255
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminanceHex(hex: string): number {
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrastWithWhite = (hex: string) => 1.05 / (luminanceHex(hex) + 0.05)

/**
 * The darkest-but-one shade of a hue that white text still clears AA on.
 *
 * Walks lightness down from the accent until the ratio is met, so a pale mint
 * accent and a deep indigo one both end up with a usable filled button instead
 * of the pale one shipping white-on-white.
 */
export function fillFor(hue: number, sat: number, startL = 58, target = 4.6): Hsl {
	let l = startL
	while (l > 12) {
		const candidate = { h: hue, s: sat, l }
		if (contrastWithWhite(hslToHex(candidate)) >= target) return candidate
		l -= 1
	}
	return { h: hue, s: sat, l: 12 }
}

/** Green means a verdict. A sport hue landing here would read as one. */
export const GREEN_BAND: [number, number] = [80, 170]
export const isGreen = (hue: number) => hue >= GREEN_BAND[0] && hue <= GREEN_BAND[1]

// ─── the shared ramp ──────────────────────────────────────────────────────────

/**
 * Lightness steps every palette shares, so the distance from page to card, and
 * card to inset, reads the same whichever theme you pick.
 *
 * `tint` scales how much of the palette's hue survives into the greys: 0 is a
 * true neutral, 1 is unmistakably coloured furniture.
 */
const RAMP = {
	background: 4.5,
	surface: 8,
	surface2: 11.5,
	hover: 16,
	elevated: 13,
	sidebarTop: 6,
	sidebarBottom: 4,
	border: 19,
	borderStrong: 29,
	text: 95,
	textSecondary: 71,
	textMuted: 53,
}

export interface PaletteSpec {
	key: string
	label: string
	blurb: string
	/** Family, for grouping the gallery. */
	family: 'neutral' | 'cool' | 'warm' | 'vivid'
	/** Hue the greys are built on, 0–360. */
	neutralHue: number
	/** 0–1: how coloured the greys are. */
	tint: number
	/** Accent hue and saturation — links, active nav, the fitness line. */
	accent: { h: number; s: number; l: number }
	/** Running, gym, bike. Rest and Other are derived from the neutral. */
	sportHues: [number, number, number]
	/** Sport saturation and lightness. Lower both for a muted theme. */
	sport?: { s: number; l: number }
	/** Verdict hues, when a theme wants its own. Defaults are the stock ones. */
	verdicts?: { success: string; warning: string; danger: string }
}

/**
 * Build the full token set for a palette spec.
 *
 * Returns only colour tokens. Shape, type and layout are the style switches'
 * business, so picking a palette never silently resizes your sidebar.
 */
export function buildPalette(spec: PaletteSpec): Record<string, string> {
	const h = spec.neutralHue
	const grey = (l: number, satScale = 1) =>
		hslToHex({ h, s: Math.round(spec.tint * 22 * satScale), l })

	const sportS = spec.sport?.s ?? 78
	const sportL = spec.sport?.l ?? 62
	const sport = (hue: number) => hslToHex({ h: hue, s: sportS, l: sportL })

	const accent = hslToHex(spec.accent)
	const fill = fillFor(spec.accent.h, Math.min(spec.accent.s + 6, 92))
	const fillHex = hslToHex(fill)
	const fillHover = hslToHex({ ...fill, l: Math.min(fill.l + 7, 70) })

	const values: Record<string, string> = {
		'background-color': grey(RAMP.background),
		'surface-color': grey(RAMP.surface),
		'surface-2': grey(RAMP.surface2),
		'surface-hover': grey(RAMP.hover),
		'surface-elevated': grey(RAMP.elevated),
		'sidebar-bg-top': grey(RAMP.sidebarTop),
		'sidebar-bg-bottom': grey(RAMP.sidebarBottom),

		'border-color': grey(RAMP.border),
		'border-strong': grey(RAMP.borderStrong),

		// Text carries less of the tint than the furniture: a strongly coloured
		// body text reads as a link, whatever the hue.
		'text-color': grey(RAMP.text, 0.35),
		'text-secondary': grey(RAMP.textSecondary, 0.5),
		'text-muted': grey(RAMP.textMuted, 0.6),

		'primary-color': accent,
		'primary-fill': fillHex,
		'primary-fill-hover': fillHover,

		'color-running-primary': sport(spec.sportHues[0]),
		'color-gym-primary': sport(spec.sportHues[1]),
		'color-bike-primary': sport(spec.sportHues[2]),
		// Rest and Other are the absence of a sport, so they stay neutral.
		'color-rest-primary': hslToHex({ h, s: 12, l: 46 }),
		'color-other-primary': hslToHex({ h, s: 10, l: 62 }),
	}

	if (spec.verdicts) {
		values['success-color'] = spec.verdicts.success
		values['warning-color'] = spec.verdicts.warning
		values['danger-color'] = spec.verdicts.danger
	}
	return values
}

// ─── the library ──────────────────────────────────────────────────────────────

export const PALETTE_SPECS: PaletteSpec[] = [
	// Neutral — the greys barely take a hue.
	{ key: 'stock', label: 'Trainlog', blurb: 'The shipped palette.', family: 'neutral',
		neutralHue: 222, tint: 0.55, accent: { h: 249, s: 100, l: 78 }, sportHues: [198, 329, 27] },
	{ key: 'graphite', label: 'Graphite', blurb: 'Pure grey, nothing warm or cool.', family: 'neutral',
		neutralHue: 240, tint: 0.12, accent: { h: 230, s: 100, l: 77 }, sportHues: [200, 330, 30] },
	{ key: 'carbon', label: 'Carbon', blurb: 'Near-black, high separation.', family: 'neutral',
		neutralHue: 220, tint: 0.2, accent: { h: 210, s: 100, l: 70 }, sportHues: [195, 325, 25] },
	{ key: 'ash', label: 'Ash', blurb: 'Soft grey, gentle steps.', family: 'neutral',
		neutralHue: 30, tint: 0.18, accent: { h: 25, s: 85, l: 68 }, sportHues: [200, 335, 35],
		sport: { s: 62, l: 62 } },
	{ key: 'slate', label: 'Slate', blurb: 'Blue-grey, the classic.', family: 'neutral',
		neutralHue: 215, tint: 0.6, accent: { h: 199, s: 89, l: 64 }, sportHues: [199, 330, 32] },

	// Cool
	{ key: 'midnight', label: 'Midnight', blurb: 'Deep navy, cool and quiet.', family: 'cool',
		neutralHue: 222, tint: 1, accent: { h: 219, s: 88, l: 72 }, sportHues: [204, 322, 30] },
	{ key: 'abyss', label: 'Abyss', blurb: 'Very dark blue, low glare.', family: 'cool',
		neutralHue: 212, tint: 1.25, accent: { h: 190, s: 92, l: 62 }, sportHues: [188, 318, 28],
		sport: { s: 72, l: 60 } },
	{ key: 'teal', label: 'Teal ink', blurb: 'Green-blue ground, cyan accent.', family: 'cool',
		neutralHue: 190, tint: 0.95, accent: { h: 175, s: 78, l: 58 }, sportHues: [205, 325, 30] },
	{ key: 'indigo', label: 'Indigo', blurb: 'Violet-leaning, richer furniture.', family: 'cool',
		neutralHue: 250, tint: 1.05, accent: { h: 258, s: 95, l: 76 }, sportHues: [200, 320, 28] },
	{ key: 'steel', label: 'Steel', blurb: 'Cold grey-blue, muted sports.', family: 'cool',
		neutralHue: 208, tint: 0.7, accent: { h: 205, s: 70, l: 68 }, sportHues: [196, 332, 30],
		sport: { s: 55, l: 60 } },
	{ key: 'arctic', label: 'Arctic', blurb: 'Pale ice accent on cold slate.', family: 'cool',
		neutralHue: 200, tint: 0.85, accent: { h: 186, s: 88, l: 72 }, sportHues: [192, 328, 32] },

	// Warm
	{ key: 'espresso', label: 'Espresso', blurb: 'Brown-black, warm text.', family: 'warm',
		neutralHue: 25, tint: 1.1, accent: { h: 32, s: 88, l: 66 }, sportHues: [196, 330, 22] },
	{ key: 'sand', label: 'Sand', blurb: 'Warm stone, gold accent.', family: 'warm',
		neutralHue: 40, tint: 0.85, accent: { h: 45, s: 78, l: 62 }, sportHues: [198, 328, 20] },
	{ key: 'clay', label: 'Clay', blurb: 'Red-brown ground, terracotta accent.', family: 'warm',
		neutralHue: 14, tint: 1, accent: { h: 14, s: 82, l: 66 }, sportHues: [200, 322, 36] },
	{ key: 'plum', label: 'Plum', blurb: 'Purple-brown, pink accent.', family: 'warm',
		neutralHue: 320, tint: 0.9, accent: { h: 322, s: 82, l: 72 }, sportHues: [198, 332, 28] },
	{ key: 'rosewood', label: 'Rosewood', blurb: 'Deep wine, muted and soft.', family: 'warm',
		neutralHue: 345, tint: 1, accent: { h: 350, s: 78, l: 70 }, sportHues: [200, 330, 30],
		sport: { s: 62, l: 62 } },

	// Vivid — louder accents, brighter sports.
	{ key: 'neon', label: 'Neon', blurb: 'Black ground, electric accents.', family: 'vivid',
		neutralHue: 260, tint: 0.35, accent: { h: 280, s: 100, l: 74 }, sportHues: [190, 315, 32],
		sport: { s: 95, l: 64 } },
	{ key: 'citrus', label: 'Citrus', blurb: 'Bright orange on charcoal.', family: 'vivid',
		neutralHue: 25, tint: 0.35, accent: { h: 28, s: 96, l: 62 }, sportHues: [196, 326, 40],
		sport: { s: 92, l: 62 } },
	{ key: 'vapor', label: 'Vapor', blurb: 'Hot pink and cyan.', family: 'vivid',
		neutralHue: 265, tint: 0.7, accent: { h: 320, s: 95, l: 72 }, sportHues: [186, 312, 28],
		sport: { s: 92, l: 66 } },
	{ key: 'contrast', label: 'High contrast', blurb: 'Pure black, brightest text.', family: 'vivid',
		neutralHue: 240, tint: 0.1, accent: { h: 250, s: 100, l: 80 }, sportHues: [195, 325, 30],
		sport: { s: 95, l: 66 },
		verdicts: { success: '#5ef08a', warning: '#ffcc3d', danger: '#ff8a8a' } },
]

export interface Palette extends PaletteSpec {
	values: Record<string, string>
	/** Five colours for the gallery tile. */
	swatches: string[]
}

export const PALETTES: Palette[] = PALETTE_SPECS.map(spec => {
	const values = buildPalette(spec)
	return {
		...spec,
		values,
		swatches: [
			values['background-color'],
			values['surface-2'],
			values['primary-color'],
			values['color-running-primary'],
			values['color-gym-primary'],
		],
	}
})

export const FAMILIES: { key: Palette['family']; label: string }[] = [
	{ key: 'neutral', label: 'Neutral' },
	{ key: 'cool', label: 'Cool' },
	{ key: 'warm', label: 'Warm' },
	{ key: 'vivid', label: 'Vivid' },
]
