// src/theme.ts
//
// Naive UI needs its palette as JS values, but the source of truth is the CSS
// custom properties in styles/app.css. This reads them back and feeds them in.
//
// Two things follow from that, and both used to be missing:
//
//   The read has to be repeatable. The UI lab writes its palette as inline
//   custom properties on <html>, so after a palette change the stylesheet says
//   one thing and this module's cached values say another — which is why every
//   Naive button, input and modal stayed violet while the rest of the app
//   repainted. `refreshThemeFromCss` is called by the lab on every apply.
//
//   Light is not a palette. Naive's components carry a compiled dark or light
//   theme of their own, and no amount of custom properties will turn a dark
//   dropdown light. `setPaletteMode` picks which one is handed to the provider.
import { ref, computed, watchEffect } from 'vue'
import { darkTheme, GlobalThemeOverrides } from 'naive-ui'
import { clearSportColorCache } from './utils/workouts'

export type ThemeName = 'dark'

export const theme = ref<ThemeName>('dark')

/** Which ground the active palette is drawn on. Set by the UI lab. */
export const paletteMode = ref<'dark' | 'light'>('dark')

/** Fallbacks mirror :root in styles/app.css, for the case where CSS hasn't applied. */
const FALLBACK = {
	primary: '#9b8cff',
	primaryFill: '#6c5ce7',
	primaryFillHover: '#7b6cf0',
	body: '#0b0d11',
	card: '#12151b',
	input: '#191d24',
	border: '#232830',
	radius: '8px',
	popover: '#1b1f27',
	text: '#eef0f4',
	font: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
}

export const primaryColor = ref(FALLBACK.primary)
export const primaryFill = ref(FALLBACK.primaryFill)
export const primaryFillHover = ref(FALLBACK.primaryFillHover)
export const bodyColor = ref(FALLBACK.body)
export const cardColor = ref(FALLBACK.card)
export const inputColor = ref(FALLBACK.input)
export const borderColor = ref(FALLBACK.border)
export const borderRadius = ref(FALLBACK.radius)
export const fontFamily = ref(FALLBACK.font)

export const popoverColor = ref(FALLBACK.popover)
export const textColor = ref(FALLBACK.text)

/** Naive's own light theme is `null`; it is the library's default. */
export const naiveTheme = computed(() => (paletteMode.value === 'light' ? null : darkTheme))

/**
 * Naive's "primary" drives both filled buttons and accent text. Those need
 * different shades on a dark ground — the light violet that reads well as text
 * is too pale to carry white button labels — so the fill is set separately.
 */
export const themeOverrides = computed<GlobalThemeOverrides>(() => ({
	common: {
		primaryColor: primaryColor.value,
		primaryColorHover: primaryFillHover.value,
		primaryColorPressed: primaryFill.value,
		primaryColorSuppl: primaryColor.value,
		bodyColor: bodyColor.value,
		cardColor: cardColor.value,
		modalColor: cardColor.value,
		popoverColor: popoverColor.value,
		inputColor: inputColor.value,
		borderColor: borderColor.value,
		dividerColor: borderColor.value,
		borderRadius: borderRadius.value,
		textColorBase: textColor.value,
		fontFamily: fontFamily.value,
	},
	Button: {
		colorPrimary: primaryFill.value,
		colorHoverPrimary: primaryFillHover.value,
		colorPressedPrimary: primaryFill.value,
		colorFocusPrimary: primaryFillHover.value,
		borderPrimary: `1px solid ${primaryFill.value}`,
		borderHoverPrimary: `1px solid ${primaryFillHover.value}`,
		borderPressedPrimary: `1px solid ${primaryFill.value}`,
		borderFocusPrimary: `1px solid ${primaryFillHover.value}`,
		textColorPrimary: '#ffffff',
		textColorHoverPrimary: '#ffffff',
		textColorPressedPrimary: '#ffffff',
		textColorFocusPrimary: '#ffffff',
		fontWeight: '600',
	},
	Layout: {
		color: bodyColor.value,
		siderColor: cardColor.value,
	},
	Card: { color: cardColor.value, borderRadius: '14px' },
	Menu: { color: cardColor.value },
}))

/**
 * Re-read every colour Naive UI needs from the live custom properties.
 *
 * Synchronous on purpose: the caller has just written the properties onto
 * `<html>`, and deferring behind a timeout left Naive painting the old palette
 * for a frame.
 */
export const refreshThemeFromCss = () => {
	if (typeof document === 'undefined') return
	const style = getComputedStyle(document.documentElement)
	const cssVar = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback

	primaryColor.value = cssVar('--primary-color', FALLBACK.primary)
	primaryFill.value = cssVar('--primary-fill', FALLBACK.primaryFill)
	primaryFillHover.value = cssVar('--primary-fill-hover', FALLBACK.primaryFillHover)
	bodyColor.value = cssVar('--background-color', FALLBACK.body)
	// `--card-background-color` is derived from `--surface-color` by the lab, but
	// fall back to the surface directly in case only the latter was set.
	cardColor.value = cssVar('--card-background-color', '') || cssVar('--surface-color', FALLBACK.card)
	inputColor.value = cssVar('--surface-2', FALLBACK.input)
	borderColor.value = cssVar('--border-color', FALLBACK.border)
	borderRadius.value = cssVar('--radius-sm', FALLBACK.radius)
	popoverColor.value = cssVar('--surface-elevated', FALLBACK.popover)
	textColor.value = cssVar('--text-color', FALLBACK.text)
	fontFamily.value = cssVar('--font-family', FALLBACK.font)

	clearSportColorCache()
}

/** Told by the UI lab which ground the palette uses, so Naive can match it. */
export const setPaletteMode = (mode: 'dark' | 'light') => {
	if (paletteMode.value !== mode) paletteMode.value = mode
}

export const setTheme = (next: ThemeName) => {
	theme.value = next
	// Guarded because this module is now reached from `uiLab.ts`, which has unit
	// tests that run in plain Node with no DOM at all.
	if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', next)
	refreshThemeFromCss()
}

watchEffect(() => {
	setTheme(theme.value)
})
