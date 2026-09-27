/**
 * The UI lab's store: which design tokens can be tweaked, what they are now,
 * and how an override reaches the running app.
 *
 * `styles/app.css` is the source of truth for the palette, and it stays that
 * way. This writes overrides as inline custom properties on `<html>`, which win
 * over the stylesheet's `:root` block by specificity — so the whole app
 * re-renders in the new palette immediately, without a build step and without
 * the lab having to re-implement anybody's styling.
 *
 * Two things this has to get right, or the app comes apart as you tweak it:
 *
 *   **Derived tokens.** Several tokens exist in more than one form. A sport is
 *   `--color-running-primary`, plus `--color-running-primary-rgb` for places
 *   that compose an rgba(), plus `--color-running-soft` for chip fills.
 *   Changing only the first leaves a blue route line on a pink chip. Every
 *   dependent is recomputed here from the value you set.
 *
 *   **Contrast.** The palette's own comment promises "every text colour here
 *   clears WCAG AA on --surface-color". A colour picker makes that very easy to
 *   break by accident, so the ratios are computed and shown rather than left
 *   for you to discover on a chart three pages away.
 */
import { computed, reactive, ref } from 'vue'
import { clearSportColorCache } from './utils/workouts'
import { STYLE_KEYS, STYLE_SWITCHES, SCALE_PX, TYPE_PAIRINGS, switchFor } from './uiLabStyles'
import './styles/uiLab.css'

const STORAGE_KEY = 'uiLab.overrides.v1'
const STYLE_KEY = 'uiLab.styles.v1'
const PALETTE_KEY = 'uiLab.palette.v1'

export type TokenKind = 'color' | 'length' | 'font' | 'number'

export interface TokenDef {
	/** The custom property, without the leading `--`. */
	name: string
	label: string
	kind: TokenKind
	hint?: string
	/** For `length`: the slider range and step, in the unit the token uses. */
	min?: number
	max?: number
	step?: number
	unit?: string
	/** For `font`: which curated stack list to offer. */
	fonts?: 'text' | 'display'
}

export interface TokenGroup {
	key: string
	label: string
	blurb: string
	tokens: TokenDef[]
}

// ─── what can be tweaked ──────────────────────────────────────────────────────

export const TOKEN_GROUPS: TokenGroup[] = [
	{
		key: 'surfaces',
		label: 'Surfaces',
		blurb: 'The ground everything sits on, darkest first. Keep the steps between them small — the app leans on layering, not on borders.',
		tokens: [
			{ name: 'background-color', label: 'Page', kind: 'color' },
			{ name: 'surface-color', label: 'Card', kind: 'color' },
			{ name: 'surface-2', label: 'Inset', kind: 'color', hint: 'Inputs, chips, table heads.' },
			{ name: 'surface-hover', label: 'Hover', kind: 'color' },
			{ name: 'surface-elevated', label: 'Elevated', kind: 'color', hint: 'Popovers and map controls.' },
			{ name: 'sidebar-bg-top', label: 'Sidebar top', kind: 'color' },
			{ name: 'sidebar-bg-bottom', label: 'Sidebar bottom', kind: 'color' },
		],
	},
	{
		key: 'text',
		label: 'Text & borders',
		blurb: 'Three text weights, used consistently: primary for content, secondary for labels, muted for asides.',
		tokens: [
			{ name: 'text-color', label: 'Primary', kind: 'color' },
			{ name: 'text-secondary', label: 'Secondary', kind: 'color' },
			{ name: 'text-muted', label: 'Muted', kind: 'color' },
			{ name: 'border-color', label: 'Border', kind: 'color' },
			{ name: 'border-strong', label: 'Border, strong', kind: 'color' },
		],
	},
	{
		key: 'brand',
		label: 'Brand',
		blurb: 'Violet by design: it reads as interactive without reading as good or bad. The fill is a separate, darker shade because white button text has to clear AA on it.',
		tokens: [
			{ name: 'primary-color', label: 'Accent', kind: 'color', hint: 'Links, active nav, focus rings, the fitness line.' },
			{ name: 'primary-fill', label: 'Button fill', kind: 'color' },
			{ name: 'primary-fill-hover', label: 'Button hover', kind: 'color' },
		],
	},
	{
		key: 'verdicts',
		label: 'Verdicts',
		blurb: 'Reserved for better / worse / wrong. Nothing decorative in the app uses these, which is what lets a green number mean something.',
		tokens: [
			{ name: 'success-color', label: 'Better', kind: 'color' },
			{ name: 'warning-color', label: 'Worse', kind: 'color' },
			{ name: 'danger-color', label: 'Problem', kind: 'color' },
			{ name: 'pr-gold', label: 'Personal record', kind: 'color' },
		],
	},
	{
		key: 'sports',
		label: 'Sports',
		blurb: 'One hue per sport, kept away from green and amber so a running chart can never be mistaken for a verdict.',
		tokens: [
			{ name: 'color-running-primary', label: 'Running', kind: 'color' },
			{ name: 'color-gym-primary', label: 'Gym', kind: 'color' },
			{ name: 'color-bike-primary', label: 'Bike', kind: 'color' },
			{ name: 'color-rest-primary', label: 'Rest', kind: 'color' },
			{ name: 'color-other-primary', label: 'Other', kind: 'color' },
		],
	},
	{
		key: 'streams',
		label: 'Sensor streams',
		blurb: 'The lines on a workout’s chart.',
		tokens: [
			{ name: 'color-heartrate', label: 'Heart rate', kind: 'color' },
			{ name: 'color-cadence', label: 'Cadence', kind: 'color' },
			{ name: 'color-elevation', label: 'Elevation', kind: 'color' },
		],
	},
	{
		key: 'type',
		label: 'Type',
		blurb: 'One face for reading, one for headings and for every number that matters. The numeric face needs tabular figures or columns of times stop lining up.',
		tokens: [
			{ name: 'font-family', label: 'Body', kind: 'font', fonts: 'text' },
			{ name: 'font-display', label: 'Headings', kind: 'font', fonts: 'display' },
			{ name: 'font-mono', label: 'Numbers', kind: 'font', fonts: 'display' },
			{
				name: 'ui-scale', label: 'Text size', kind: 'number',
				min: 85, max: 125, step: 1, unit: '%',
				hint: 'Scales the root font size. Almost everything is sized in rem, so this moves the whole interface together.',
			},
		],
	},
	{
		key: 'shape',
		label: 'Shape',
		blurb: 'Corner radii. Small is for controls and chips, the middle one for cards, large for the few full-bleed panels.',
		tokens: [
			{ name: 'radius-sm', label: 'Controls', kind: 'length', min: 0, max: 20, step: 1, unit: 'px' },
			{ name: 'radius', label: 'Cards', kind: 'length', min: 0, max: 32, step: 1, unit: 'px' },
			{ name: 'radius-lg', label: 'Panels', kind: 'length', min: 0, max: 40, step: 1, unit: 'px' },
		],
	},
	{
		key: 'layout',
		label: 'Layout',
		blurb: 'The app chrome. The collapsed width has to stay wide enough for an icon plus its focus ring.',
		tokens: [
			{ name: 'sidebar-width', label: 'Sidebar', kind: 'length', min: 160, max: 320, step: 4, unit: 'px' },
			{ name: 'sidebar-collapsed-width', label: 'Sidebar, collapsed', kind: 'length', min: 52, max: 110, step: 2, unit: 'px' },
			{ name: 'nav-icon-size', label: 'Nav icon', kind: 'length', min: 14, max: 30, step: 1, unit: 'px' },
			{ name: 'mobile-nav-height', label: 'Bottom bar', kind: 'length', min: 48, max: 88, step: 1, unit: 'px' },
		],
	},
]

export const ALL_TOKENS: TokenDef[] = TOKEN_GROUPS.flatMap(g => g.tokens)

// ─── curated font stacks ──────────────────────────────────────────────────────

export interface FontOption {
	label: string
	stack: string
	/** Google Fonts family spec, loaded on demand. Omitted for system stacks. */
	google?: string
	/** Display faces need real tabular figures to be usable for numbers. */
	tabular?: boolean
}

const SYSTEM = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export const TEXT_FONTS: FontOption[] = [
	{ label: 'Inter', stack: `'Inter', ${SYSTEM}`, google: 'Inter:wght@400;500;600;700' },
	{ label: 'System', stack: SYSTEM },
	{ label: 'IBM Plex Sans', stack: `'IBM Plex Sans', ${SYSTEM}`, google: 'IBM+Plex+Sans:wght@400;500;600;700' },
	{ label: 'Manrope', stack: `'Manrope', ${SYSTEM}`, google: 'Manrope:wght@400;500;600;700' },
	{ label: 'Source Sans 3', stack: `'Source Sans 3', ${SYSTEM}`, google: 'Source+Sans+3:wght@400;500;600;700' },
	{ label: 'Work Sans', stack: `'Work Sans', ${SYSTEM}`, google: 'Work+Sans:wght@400;500;600;700' },
]

export const DISPLAY_FONTS: FontOption[] = [
	{ label: 'Space Grotesk', stack: `'Space Grotesk', 'Inter', ${SYSTEM}`, google: 'Space+Grotesk:wght@500;600;700', tabular: true },
	{ label: 'Inter', stack: `'Inter', ${SYSTEM}`, google: 'Inter:wght@400;500;600;700', tabular: true },
	{ label: 'Outfit', stack: `'Outfit', 'Inter', ${SYSTEM}`, google: 'Outfit:wght@500;600;700', tabular: true },
	{ label: 'Sora', stack: `'Sora', 'Inter', ${SYSTEM}`, google: 'Sora:wght@500;600;700', tabular: true },
	{ label: 'IBM Plex Mono', stack: `'IBM Plex Mono', ui-monospace, monospace`, google: 'IBM+Plex+Mono:wght@500;600;700', tabular: true },
	{ label: 'JetBrains Mono', stack: `'JetBrains Mono', ui-monospace, monospace`, google: 'JetBrains+Mono:wght@500;600;700', tabular: true },
]

export const fontsFor = (which: 'text' | 'display') => (which === 'text' ? TEXT_FONTS : DISPLAY_FONTS)

/**
 * Pull in a Google font once, when it's first chosen.
 *
 * Everything on the list is loaded this way rather than up front: six extra
 * families in the initial request would cost every visit for a choice almost
 * nobody makes.
 */
const loadedFonts = new Set<string>()

export function ensureGoogleFamily(family: string) {
	if (!family || loadedFonts.has(family) || typeof document === 'undefined') return
	loadedFonts.add(family)
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
	document.head.appendChild(link)
}

function ensureFont(option: FontOption | undefined) {
	if (option?.google) ensureGoogleFamily(option.google)
}

// ─── defaults, captured before anything is overridden ─────────────────────────

/**
 * The stylesheet's own values, read once at module load.
 *
 * It has to be once, and it has to be first: overrides are written as inline
 * styles on the same element, so re-reading later would return whatever the lab
 * last set and "reset to default" would restore the override.
 */
const defaults: Record<string, string> = {}

function captureDefaults() {
	if (typeof document === 'undefined') return
	const style = getComputedStyle(document.documentElement)
	for (const t of ALL_TOKENS) {
		if (t.name === 'ui-scale') { defaults[t.name] = '100'; continue }
		defaults[t.name] = style.getPropertyValue(`--${t.name}`).trim()
	}
}
captureDefaults()

export const defaultValue = (name: string) => defaults[name] ?? ''

// ─── state ────────────────────────────────────────────────────────────────────

/** Only what differs from the stylesheet. An empty object is "stock". */
export const overrides = reactive<Record<string, string>>({})
export const dirty = ref(false)

/** The palette currently applied, by key. Null means the shipped one. */
export const activePalette = ref<string | null>(null)

/**
 * The style switches, by key. A key absent from here is on its default, which
 * is the shipped look — so "nothing set" and "stock" are the same state and
 * resetting never has to know what the defaults were.
 */
export const styles = reactive<Record<string, string>>({})

export const styleValue = (key: string) => styles[key] ?? switchFor(key)?.fallback ?? ''
export const styleCount = computed(() =>
	STYLE_KEYS.filter(k => styles[k] !== undefined).length)

export const currentValue = (name: string) => overrides[name] ?? defaultValue(name)
export const isOverridden = (name: string) => overrides[name] !== undefined
export const overrideCount = computed(() => Object.keys(overrides).length)

// ─── derived tokens ───────────────────────────────────────────────────────────

/**
 * Tokens that must move with the one being set.
 *
 * Returned rather than written directly so `apply` stays the only thing that
 * touches the DOM, and so the CSS export can include them.
 */
export function derivedFrom(name: string, value: string): Record<string, string> {
	const rgb = toRgb(value)
	if (!rgb) return {}
	const triplet = `${rgb.r}, ${rgb.g}, ${rgb.b}`
	const out: Record<string, string> = {}

	// Sports carry an rgb triplet for composed rgba()s, and a soft tint.
	const sport = name.match(/^color-(\w+)-primary$/)
	if (sport) {
		out[`color-${sport[1]}-primary-rgb`] = triplet
		out[`color-${sport[1]}-soft`] = `rgba(${triplet}, ${sport[1] === 'rest' ? 0.16 : 0.14})`
	}

	if (name === 'primary-color') {
		out['primary-soft'] = `rgba(${triplet}, 0.13)`
		out['glow-color'] = `rgba(${triplet}, 0.3)`
		out['accent-color'] = value
	}
	if (name === 'primary-fill-hover') out['primary-strong'] = value
	if (name === 'success-color') out['success-soft'] = `rgba(${triplet}, 0.12)`
	if (name === 'warning-color') out['warning-soft'] = `rgba(${triplet}, 0.12)`
	if (name === 'danger-color') out['danger-soft'] = `rgba(${triplet}, 0.12)`

	return out
}

// ─── applying ─────────────────────────────────────────────────────────────────

function applyOne(root: HTMLElement, name: string, value: string) {
	if (name === 'ui-scale') {
		// 100% is the browser's own default; anything else is a root font size,
		// which every rem in the app then scales from.
		root.style.fontSize = value === '100' ? '' : `${(Number(value) / 100) * 16}px`
		return
	}
	root.style.setProperty(`--${name}`, value)
	for (const [dep, depValue] of Object.entries(derivedFrom(name, value))) {
		root.style.setProperty(`--${dep}`, depValue)
	}
}

/**
 * Push the style switches onto the document as `data-ui-*` attributes, which
 * `styles/uiLab.css` selects on. A switch sitting on its default gets no
 * attribute at all, so the stock rules apply untouched.
 */
function applyStyles() {
	if (typeof document === 'undefined') return
	const root = document.documentElement

	for (const sw of STYLE_SWITCHES) {
		const value = styles[sw.key]
		if (value === undefined || value === sw.fallback) root.removeAttribute(`data-ui-${sw.key}`)
		else root.setAttribute(`data-ui-${sw.key}`, value)
	}

	// Type and scale aren't CSS-only: the pairing needs its webfonts fetched,
	// and the scale is a root font size rather than a class.
	const pairing = TYPE_PAIRINGS[styleValue('type')]
	if (pairing) {
		for (const family of pairing.google) ensureGoogleFamily(family)
		// Only written when the pairing isn't the shipped one, so a stock type
		// setting leaves app.css's own font tokens in charge.
		if (styleValue('type') === 'default') {
			root.style.removeProperty('--font-family')
			root.style.removeProperty('--font-display')
			root.style.removeProperty('--font-mono')
		} else {
			root.style.setProperty('--font-family', pairing.body)
			root.style.setProperty('--font-display', pairing.display)
			root.style.setProperty('--font-mono', pairing.display)
		}
	}

	const scale = SCALE_PX[styleValue('scale')]
	root.style.fontSize = !scale || scale === 16 ? '' : `${scale}px`
}

export function setStyle(key: string, value: string) {
	const sw = switchFor(key)
	if (!sw) return
	if (value === sw.fallback) delete styles[key]
	else styles[key] = value
	dirty.value = true
	applyStyles()
	persist()
}

export function resetStyles() {
	for (const k of Object.keys(styles)) delete styles[k]
	dirty.value = true
	applyStyles()
	persist()
}

/** Push the current overrides onto the document. */
export function apply() {
	if (typeof document === 'undefined') return
	const root = document.documentElement

	// Clear first: a token removed from the overrides has to give its inline
	// property back, or it would stay applied until a reload.
	for (const t of ALL_TOKENS) {
		if (overrides[t.name] !== undefined) continue
		if (t.name === 'ui-scale') { root.style.fontSize = ''; continue }
		root.style.removeProperty(`--${t.name}`)
		for (const dep of Object.keys(derivedFrom(t.name, defaultValue(t.name)))) {
			root.style.removeProperty(`--${dep}`)
		}
	}

	for (const [name, value] of Object.entries(overrides)) applyOne(root, name, value)

	// Fonts are files, not just a value.
	for (const which of ['text', 'display'] as const) {
		for (const opt of fontsFor(which)) {
			if (Object.values(overrides).includes(opt.stack)) ensureFont(opt)
		}
	}

	applyStyles()

	// Charts read the palette through getComputedStyle and memoise it.
	clearSportColorCache()
}

/** Apply a whole palette, replacing any colour tweaks that were on top of it. */
export function setPalette(key: string | null, values: Record<string, string>) {
	// Colour tokens only: picking a palette must not silently resize the
	// sidebar or change the corner radius, which are the switches' business.
	const colourNames = new Set(
		ALL_TOKENS.filter(t => t.kind === 'color').map(t => t.name))
	for (const name of Object.keys(overrides)) {
		if (colourNames.has(name)) delete overrides[name]
	}
	for (const [name, value] of Object.entries(values)) {
		if (colourNames.has(name) && value !== defaultValue(name)) overrides[name] = value
	}
	activePalette.value = key
	dirty.value = true
	apply()
	persist()
}

export function setToken(name: string, value: string) {
	if (value === defaultValue(name)) delete overrides[name]
	else overrides[name] = value
	dirty.value = true
	apply()
	persist()
}

export function resetToken(name: string) {
	delete overrides[name]
	dirty.value = true
	apply()
	persist()
}

export function resetAll() {
	for (const k of Object.keys(overrides)) delete overrides[k]
	for (const k of Object.keys(styles)) delete styles[k]
	activePalette.value = null
	dirty.value = true
	apply()
	persist()
}

/** Anything at all changed from the shipped look. */
export const anyChanges = computed(() =>
	overrideCount.value > 0 || styleCount.value > 0 || activePalette.value !== null)

/** Replace the whole set at once — used by the presets and by importing. */
export function applyPreset(values: Record<string, string>) {
	for (const k of Object.keys(overrides)) delete overrides[k]
	for (const [k, v] of Object.entries(values)) {
		if (v !== defaultValue(k)) overrides[k] = v
	}
	dirty.value = true
	apply()
	persist()
}

// ─── persistence ──────────────────────────────────────────────────────────────

function persist() {
	try {
		const write = (key: string, value: unknown, empty: boolean) => {
			if (empty) localStorage.removeItem(key)
			else localStorage.setItem(key, JSON.stringify(value))
		}
		write(STORAGE_KEY, overrides, !Object.keys(overrides).length)
		write(STYLE_KEY, styles, !Object.keys(styles).length)
		write(PALETTE_KEY, activePalette.value, activePalette.value === null)
	} catch {
		// Private mode or a full quota: the tweaks just won't outlive the tab.
	}
}

/**
 * Restore saved tweaks. Called once at start-up, before the app mounts, so the
 * first paint is already in the right palette rather than flashing the stock
 * one and correcting itself.
 */
export function hydrateUiLab() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (raw) {
			const saved = JSON.parse(raw) as Record<string, string>
			const known = new Set(ALL_TOKENS.map(t => t.name))
			for (const [k, v] of Object.entries(saved)) {
				// Ignore anything that isn't a token we still offer, so a renamed or
				// retired token can't keep being written to the document forever.
				if (known.has(k) && typeof v === 'string') overrides[k] = v
			}
		}

		const rawStyles = localStorage.getItem(STYLE_KEY)
		if (rawStyles) {
			const saved = JSON.parse(rawStyles) as Record<string, string>
			for (const [k, v] of Object.entries(saved)) {
				// Same guard, and the value has to still be on the switch's list:
				// a retired option would otherwise select CSS that no longer exists.
				const sw = switchFor(k)
				if (sw && sw.options.some(o => o.value === v)) styles[k] = v
			}
		}

		const rawPalette = localStorage.getItem(PALETTE_KEY)
		if (rawPalette) {
			const key = JSON.parse(rawPalette)
			if (typeof key === 'string') activePalette.value = key
		}

		apply()
	} catch {
		// Corrupt entry: stock palette is the safe fallback.
	}
}

// ─── export ───────────────────────────────────────────────────────────────────

/** The overrides as a CSS block, derived tokens included, ready to paste into app.css. */
export function exportCss(): string {
	const lines: string[] = []
	const scale = overrides['ui-scale']
	const styleLines = STYLE_SWITCHES
		.filter(sw => styles[sw.key] !== undefined)
		.map(sw => `  ${sw.label}: ${sw.options.find(o => o.value === styles[sw.key])?.label}`)
	for (const [name, value] of Object.entries(overrides)) {
		if (name === 'ui-scale') continue
		lines.push(`  --${name}: ${value};`)
		for (const [dep, depValue] of Object.entries(derivedFrom(name, value))) {
			lines.push(`  --${dep}: ${depValue};`)
		}
	}
	if (!lines.length && !scale && !styleLines.length) {
		return '/* No changes — this is the stock look. */'
	}
	const root = lines.length ? `:root {\n${lines.join('\n')}\n}` : ''
	const html = scale ? `html {\n  font-size: ${(Number(scale) / 100) * 16}px;\n}` : ''
	// Style switches aren't tokens — they're attributes plus the rules in
	// uiLab.css — so they're listed rather than emitted as copyable CSS.
	const notes = styleLines.length
		? `/* Style switches (set these in the lab, or copy the rules from\n   src/styles/uiLab.css):\n${styleLines.join('\n')}\n*/`
		: ''
	return [root, html, notes].filter(Boolean).join('\n\n')
}

// ─── colour maths, for the contrast readout ───────────────────────────────────

export interface Rgb { r: number; g: number; b: number }

/** Parse `#abc`, `#aabbcc` or `rgb(a, b, c)`. Null for anything else. */
export function toRgb(value: string): Rgb | null {
	const v = value.trim()
	const short = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
	if (short) {
		return {
			r: parseInt(short[1] + short[1], 16),
			g: parseInt(short[2] + short[2], 16),
			b: parseInt(short[3] + short[3], 16),
		}
	}
	const hex = v.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
	if (hex) return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16) }

	const fn = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
	if (fn) return { r: Math.round(+fn[1]), g: Math.round(+fn[2]), b: Math.round(+fn[3]) }
	return null
}

/** `#rrggbb`, which is what `<input type="color">` insists on. */
export function toHex(value: string): string {
	const rgb = toRgb(value)
	if (!rgb) return '#000000'
	const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
	return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`
}

const channel = (c: number) => {
	const s = c / 255
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance. */
export function luminance(value: string): number | null {
	const rgb = toRgb(value)
	if (!rgb) return null
	return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/** WCAG contrast ratio, 1–21. Null when either colour can't be parsed. */
export function contrast(a: string, b: string): number | null {
	const la = luminance(a)
	const lb = luminance(b)
	if (la === null || lb === null) return null
	const [hi, lo] = la > lb ? [la, lb] : [lb, la]
	return (hi + 0.05) / (lo + 0.05)
}

export type ContrastVerdict = 'AAA' | 'AA' | 'AA Large' | 'Fail'

/** How a ratio grades for normal-size body text. */
export function grade(ratio: number): ContrastVerdict {
	if (ratio >= 7) return 'AAA'
	if (ratio >= 4.5) return 'AA'
	if (ratio >= 3) return 'AA Large'
	return 'Fail'
}
