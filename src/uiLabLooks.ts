/**
 * Looks: a whole design decision in one click.
 *
 * The lab's two halves — twenty-odd palettes and a column of style switches —
 * are each fine on their own and together they undersell what the app can
 * actually look like. Picking "Neon" got you the shipped layout with different
 * colours in it, because the things that make a design feel different (the
 * corners, the weight of the lines, whether the page has a texture, what the
 * headings are set in) were eleven separate decisions nobody was going to make
 * one at a time.
 *
 * A look is the pair: a palette *and* every switch. They're deliberately
 * opinionated and some of them are too much on purpose — the point of a lab is
 * to see the ends of the range, not to offer twelve shades of tasteful.
 *
 * A look never introduces a mechanism of its own. It only sets things the lab
 * already exposes, so every look can be taken apart afterwards switch by
 * switch, and "reset" still means exactly one thing.
 */
import { STYLE_SWITCHES, switchFor } from './uiLabStyles'
import { paletteFor } from './uiLabPalettes'

export interface Look {
	key: string
	label: string
	blurb: string
	/** A palette key from `uiLabPalettes`. */
	palette: string
	/** Switch key → value. Anything left out goes back to its default. */
	styles: Record<string, string>
}

export const LOOKS: Look[] = [
	{
		key: 'trainlog',
		label: 'Trainlog',
		blurb: 'The shipped design. Quiet charcoal, soft corners, nothing shouting.',
		palette: 'stock',
		styles: {},
	},
	{
		key: 'brutalist',
		label: 'Brutalist',
		blurb: 'Square, heavy lines, monospace, no shadows. Everything a panel, nothing decorated.',
		palette: 'contrast',
		styles: {
			corners: 'sharp', buttonshape: 'square', buttons: 'outline', borders: 'bold',
			cards: 'outlined', chips: 'outline', accentbar: 'thick', density: 'compact',
			type: 'mono', headings: 'caps', texture: 'grid', glow: 'none', sidebar: 'minimal',
		},
	},
	{
		key: 'terminal',
		label: 'Terminal',
		blurb: 'Phosphor green on black, scanlines, everything set in one width.',
		palette: 'cyberlime',
		styles: {
			corners: 'sharp', buttonshape: 'square', buttons: 'ghost', borders: 'hairline',
			cards: 'flat', chips: 'outline', accentbar: 'none', density: 'compact',
			type: 'mono', headings: 'mono', texture: 'scanlines', glow: 'neon', sidebar: 'minimal',
		},
	},
	{
		key: 'aurora',
		label: 'Aurora',
		blurb: 'Pill buttons, deep shadows and a wash of colour behind the page.',
		palette: 'vapor',
		styles: {
			corners: 'round', buttonshape: 'pill', buttons: 'raised', borders: 'hairline',
			cards: 'elevated', chips: 'soft', density: 'roomy',
			type: 'modern', headings: 'heavy', texture: 'glow', glow: 'soft', sidebar: 'floating',
		},
	},
	{
		key: 'paper',
		label: 'Paper',
		blurb: 'Light, printed, serif headings. The same app as a training journal.',
		palette: 'paper',
		styles: {
			corners: 'tight', buttons: 'outline', borders: 'default', cards: 'outlined',
			chips: 'outline', accentbar: 'none', density: 'roomy',
			type: 'serif', headings: 'default', texture: 'dots', sidebar: 'minimal',
		},
	},
	{
		key: 'blueprint',
		label: 'Blueprint',
		blurb: 'Drafting paper: cold light ground, graph grid, technical type.',
		palette: 'blueprint',
		styles: {
			corners: 'sharp', buttonshape: 'square', buttons: 'outline', borders: 'default',
			cards: 'outlined', chips: 'outline', density: 'compact',
			type: 'technical', headings: 'caps', texture: 'grid', sidebar: 'minimal',
		},
	},
	{
		key: 'nocturne',
		label: 'Nocturne',
		blurb: 'Deep navy, hairlines, floating panels. Built for a dark room.',
		palette: 'midnight',
		styles: {
			corners: 'soft', buttons: 'soft', borders: 'hairline', cards: 'elevated',
			chips: 'soft', density: 'default',
			type: 'modern', headings: 'quiet', texture: 'glow', glow: 'soft', sidebar: 'floating',
		},
	},
	{
		key: 'sunburst',
		label: 'Sunburst',
		blurb: 'Molten orange, solid chips, heavy titles. Loud and warm.',
		palette: 'magma',
		styles: {
			corners: 'round', buttonshape: 'pill', buttons: 'solid', borders: 'default',
			cards: 'flat', chips: 'solid', accentbar: 'thick', density: 'default',
			type: 'modern', headings: 'heavy', texture: 'stripes', glow: 'soft', sidebar: 'solid',
		},
	},
	{
		key: 'glare',
		label: 'Glare',
		blurb: 'Pure white, black text, no ornament at all. Maximum legibility.',
		palette: 'glare',
		styles: {
			corners: 'sharp', buttons: 'solid', borders: 'bold', cards: 'outlined',
			chips: 'solid', density: 'default', scale: 'lg',
			type: 'neutral', headings: 'heavy', texture: 'flat', sidebar: 'minimal',
		},
	},
	{
		key: 'ultraviolet',
		label: 'Ultraviolet',
		blurb: 'Purple all the way down, glowing, soft-edged, roomy.',
		palette: 'ultraviolet',
		styles: {
			corners: 'soft', buttonshape: 'pill', buttons: 'soft', borders: 'hairline',
			cards: 'flat', chips: 'soft', density: 'roomy',
			type: 'modern', headings: 'default', texture: 'glow', glow: 'neon', sidebar: 'solid',
		},
	},
	{
		key: 'linen',
		label: 'Linen',
		blurb: 'Warm oatmeal paper, muted sports, generous spacing.',
		palette: 'linen',
		styles: {
			corners: 'soft', buttons: 'soft', borders: 'hairline', cards: 'flat',
			chips: 'soft', accentbar: 'none', density: 'roomy',
			type: 'editorial', headings: 'quiet', texture: 'flat', sidebar: 'minimal',
		},
	},
	{
		key: 'arcade',
		label: 'Arcade',
		blurb: 'Candy pink, fat outlines, tiny dense rows. A toy, and it knows it.',
		palette: 'bubblegum',
		styles: {
			corners: 'round', buttonshape: 'pill', buttons: 'raised', borders: 'bold',
			cards: 'bordered', chips: 'solid', accentbar: 'thick', density: 'compact',
			type: 'modern', headings: 'heavy', texture: 'dots', glow: 'neon', sidebar: 'solid',
		},
	},
]

export const lookFor = (key: string | null) => LOOKS.find(l => l.key === key) ?? null

/**
 * The full switch set a look implies — the ones it names, plus every other
 * switch explicitly at its default.
 *
 * Spelling out the defaults is what makes looks *replace* rather than layer.
 * Without it, picking Brutalist and then Aurora would leave you with Aurora's
 * palette and Brutalist's square buttons, because Aurora never mentions
 * `buttonshape`.
 */
export function stylesForLook(look: Look): Record<string, string> {
	const out: Record<string, string> = {}
	for (const sw of STYLE_SWITCHES) out[sw.key] = look.styles[sw.key] ?? sw.fallback
	return out
}

/** Whether the current state is exactly this look, for the gallery's tick. */
export function matchesLook(
	look: Look,
	activePalette: string | null,
	styles: Record<string, string>,
): boolean {
	if (activePalette !== look.palette) return false
	const wanted = stylesForLook(look)
	return STYLE_SWITCHES.every(sw => (styles[sw.key] ?? sw.fallback) === wanted[sw.key])
}

/** Swatches for a look's tile: the palette's, so the tile shows what it does. */
export function lookSwatches(look: Look): string[] {
	return paletteFor(look.palette)?.swatches ?? []
}

/** Every look references a real palette and real switch options. */
export function lookProblems(look: Look): string[] {
	const out: string[] = []
	if (!paletteFor(look.palette)) out.push(`unknown palette "${look.palette}"`)
	for (const [key, value] of Object.entries(look.styles)) {
		const sw = switchFor(key)
		if (!sw) out.push(`unknown switch "${key}"`)
		else if (!sw.options.some(o => o.value === value)) out.push(`"${key}" has no option "${value}"`)
	}
	return out
}
