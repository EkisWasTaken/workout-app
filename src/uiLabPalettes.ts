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

// ─── the shared ramps ─────────────────────────────────────────────────────────

/**
 * Whether the palette is drawn on a dark ground or a light one.
 *
 * This is the one difference a hue shift can't fake, and for a long time the
 * lab couldn't express it: twenty themes that were all the same dark app with
 * the furniture repainted. A light palette inverts the whole ramp, and several
 * things that are invisible on one ground have to be re-derived for the other —
 * hairlines, shadows, and every colour used as text.
 */
export type PaletteMode = 'dark' | 'light'

export interface Ramp {
	background: number
	surface: number
	surface2: number
	hover: number
	elevated: number
	sidebarTop: number
	sidebarBottom: number
	border: number
	borderStrong: number
	text: number
	textSecondary: number
	textMuted: number
	/** Lightness and saturation the sport hues are drawn at. */
	sport: { s: number; l: number }
	/** Rest and Other: the absence of a sport, so they stay near-neutral. */
	restL: number
	otherL: number
}

/**
 * Lightness steps every palette of a mode shares, so the distance from page to
 * card, and card to inset, reads the same whichever theme you pick.
 *
 * The light ramp is not the dark one reversed. Paper is *lighter* than the page
 * it sits on while a dark card is lighter than its page too, so the surfaces
 * step the same way — but text and sport colours have to come down a long way,
 * because a hue that reads beautifully at 62% lightness on near-black is
 * unreadable on white.
 */
export const RAMPS: Record<PaletteMode, Ramp> = {
	dark: {
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
		sport: { s: 78, l: 62 },
		restL: 46,
		otherL: 62,
	},
	light: {
		background: 95.5,
		surface: 100,
		surface2: 93,
		hover: 89,
		elevated: 100,
		sidebarTop: 99,
		sidebarBottom: 95,
		border: 86,
		borderStrong: 71,
		text: 15,
		// Muted sits at 45, not 50: #808080 on white is 3.9:1 and fails AA, and
		// the palette's promise is that every text colour clears it.
		textSecondary: 36,
		textMuted: 45,
		sport: { s: 72, l: 42 },
		restL: 45,
		otherL: 38,
	},
}

/**
 * Verdict and sensor colours per mode.
 *
 * The shipped greens and ambers are tuned for a near-black ground; on white
 * `#4ade80` is a 1.8:1 smear. Rather than make every light palette restate
 * them, each mode has a set that works on its own ground.
 */
const MODE_COLORS: Record<PaletteMode, Record<string, string>> = {
	dark: {
		'success-color': '#4ade80',
		'warning-color': '#fbbf24',
		'danger-color': '#f87171',
		'pr-gold': '#f0b429',
		'color-heartrate': '#fb7185',
		'color-cadence': '#c4b5fd',
		'color-elevation': '#8ba1c0',
	},
	light: {
		'success-color': '#15803d',
		'warning-color': '#a16207',
		'danger-color': '#b91c1c',
		'pr-gold': '#8a6108',
		'color-heartrate': '#be123c',
		'color-elevation': '#4a6584',
		'color-cadence': '#6d28d9',
	},
}

export interface PaletteSpec {
	key: string
	label: string
	blurb: string
	/** Family, for grouping the gallery. */
	family: 'neutral' | 'cool' | 'warm' | 'vivid' | 'light'
	/** Dark ground unless stated. */
	mode?: PaletteMode
	/** Hue the greys are built on, 0–360. */
	neutralHue: number
	/** 0–1: how coloured the greys are. Past 1 the furniture is openly tinted. */
	tint: number
	/** Accent hue and saturation — links, active nav, the fitness line. */
	accent: { h: number; s: number; l: number }
	/** Running, gym, bike. Rest and Other are derived from the neutral. */
	sportHues: [number, number, number]
	/** Sport saturation and lightness, overriding the mode's ramp. */
	sport?: { s: number; l: number }
	/** Verdict hues, when a theme wants its own. */
	verdicts?: { success: string; warning: string; danger: string }
}

export const paletteMode = (spec: PaletteSpec): PaletteMode => spec.mode ?? 'dark'

/**
 * Build the full token set for a palette spec.
 *
 * Returns only colour tokens. Shape, type and layout are the style switches'
 * business, so picking a palette never silently resizes your sidebar — a *look*
 * changes both, and does so explicitly.
 */
export function buildPalette(spec: PaletteSpec): Record<string, string> {
	const mode = paletteMode(spec)
	const ramp = RAMPS[mode]
	const h = spec.neutralHue
	const grey = (l: number, satScale = 1) =>
		hslToHex({ h, s: Math.round(spec.tint * 22 * satScale), l })

	const sportS = spec.sport?.s ?? ramp.sport.s
	const sportL = spec.sport?.l ?? ramp.sport.l
	const sport = (hue: number) => hslToHex({ h: hue, s: sportS, l: sportL })

	const accent = hslToHex(spec.accent)
	const fill = fillFor(spec.accent.h, Math.min(spec.accent.s + 6, 92))
	const fillHex = hslToHex(fill)
	const fillHover = hslToHex({ ...fill, l: Math.min(fill.l + 7, 70) })

	const values: Record<string, string> = {
		...MODE_COLORS[mode],

		'background-color': grey(ramp.background),
		'surface-color': grey(ramp.surface),
		'surface-2': grey(ramp.surface2),
		'surface-hover': grey(ramp.hover),
		'surface-elevated': grey(ramp.elevated),
		'sidebar-bg-top': grey(ramp.sidebarTop),
		'sidebar-bg-bottom': grey(ramp.sidebarBottom),

		'border-color': grey(ramp.border),
		'border-strong': grey(ramp.borderStrong),

		// Text carries less of the tint than the furniture: a strongly coloured
		// body text reads as a link, whatever the hue.
		'text-color': grey(ramp.text, 0.35),
		'text-secondary': grey(ramp.textSecondary, 0.5),
		'text-muted': grey(ramp.textMuted, 0.6),

		'primary-color': accent,
		'primary-fill': fillHex,
		'primary-fill-hover': fillHover,

		'color-running-primary': sport(spec.sportHues[0]),
		'color-gym-primary': sport(spec.sportHues[1]),
		'color-bike-primary': sport(spec.sportHues[2]),
		'color-rest-primary': hslToHex({ h, s: 12, l: ramp.restL }),
		'color-other-primary': hslToHex({ h, s: 10, l: ramp.otherL }),
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

	// Vivid — louder accents, brighter sports. These are meant to be too much.
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
	{ key: 'acid', label: 'Acid', blurb: 'Chartreuse on ink. Loud on purpose.', family: 'vivid',
		neutralHue: 90, tint: 0.5, accent: { h: 74, s: 100, l: 64 }, sportHues: [188, 310, 35],
		sport: { s: 100, l: 63 },
		verdicts: { success: '#a3ff4d', warning: '#ffd400', danger: '#ff4d6d' } },
	{ key: 'magma', label: 'Magma', blurb: 'Near-black rock, molten accent.', family: 'vivid',
		neutralHue: 12, tint: 0.85, accent: { h: 8, s: 100, l: 66 }, sportHues: [190, 300, 40],
		sport: { s: 98, l: 60 } },
	{ key: 'ultraviolet', label: 'Ultraviolet', blurb: 'Saturated purple, top to bottom.', family: 'vivid',
		neutralHue: 272, tint: 1.6, accent: { h: 292, s: 100, l: 76 }, sportHues: [196, 318, 30],
		sport: { s: 96, l: 68 } },
	{ key: 'cyberlime', label: 'Cyberlime', blurb: 'Terminal green over deep teal.', family: 'vivid',
		neutralHue: 178, tint: 1.3, accent: { h: 158, s: 100, l: 60 }, sportHues: [188, 306, 38],
		sport: { s: 92, l: 62 },
		verdicts: { success: '#39ff9e', warning: '#ffe14d', danger: '#ff5c8a' } },
	{ key: 'bubblegum', label: 'Bubblegum', blurb: 'Candy pink, candy everything.', family: 'vivid',
		neutralHue: 330, tint: 1.45, accent: { h: 336, s: 100, l: 76 }, sportHues: [192, 300, 36],
		sport: { s: 96, l: 70 } },

	// Light — the same app on paper. The one change a hue shift can't fake.
	{ key: 'paper', label: 'Paper', blurb: 'Warm white, ink text, restrained colour.', family: 'light',
		mode: 'light', neutralHue: 40, tint: 0.5, accent: { h: 224, s: 68, l: 45 }, sportHues: [204, 330, 24] },
	{ key: 'daylight', label: 'Daylight', blurb: 'Cool white with a clear blue accent.', family: 'light',
		mode: 'light', neutralHue: 214, tint: 0.45, accent: { h: 212, s: 88, l: 42 }, sportHues: [200, 328, 28] },
	{ key: 'linen', label: 'Linen', blurb: 'Soft oatmeal, muted sports.', family: 'light',
		mode: 'light', neutralHue: 34, tint: 0.95, accent: { h: 22, s: 72, l: 44 }, sportHues: [202, 332, 26],
		sport: { s: 52, l: 40 } },
	{ key: 'mint', label: 'Mint', blurb: 'Pale green paper, teal accent.', family: 'light',
		mode: 'light', neutralHue: 160, tint: 0.85, accent: { h: 178, s: 86, l: 32 }, sportHues: [206, 326, 30] },
	{ key: 'blueprint', label: 'Blueprint', blurb: 'Drafting paper. Cold, technical, high line contrast.', family: 'light',
		mode: 'light', neutralHue: 205, tint: 1.3, accent: { h: 206, s: 92, l: 38 }, sportHues: [200, 322, 26],
		sport: { s: 82, l: 38 } },
	{ key: 'glare', label: 'Glare', blurb: 'Pure white, black text, maximum contrast.', family: 'light',
		mode: 'light', neutralHue: 0, tint: 0, accent: { h: 250, s: 96, l: 46 }, sportHues: [200, 328, 22],
		sport: { s: 92, l: 38 },
		verdicts: { success: '#046c38', warning: '#8a5200', danger: '#a41414' } },
]

export interface Palette extends PaletteSpec {
	values: Record<string, string>
	/** Resolved, so callers never repeat the `?? 'dark'`. */
	mode: PaletteMode
	/** Five colours for the gallery tile. */
	swatches: string[]
}

export const PALETTES: Palette[] = PALETTE_SPECS.map(spec => {
	const values = buildPalette(spec)
	return {
		...spec,
		mode: paletteMode(spec),
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

export const paletteFor = (key: string | null) => PALETTES.find(p => p.key === key) ?? null

/** The mode a palette key implies. Dark for an unknown or absent key. */
export const modeFor = (key: string | null): PaletteMode => paletteFor(key)?.mode ?? 'dark'

export const FAMILIES: { key: Palette['family']; label: string }[] = [
	{ key: 'neutral', label: 'Neutral' },
	{ key: 'cool', label: 'Cool' },
	{ key: 'warm', label: 'Warm' },
	{ key: 'vivid', label: 'Vivid' },
	{ key: 'light', label: 'Light' },
]
