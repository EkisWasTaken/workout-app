// src/theme.ts
//
// Naive UI needs its palette as JS values, but the source of truth is the CSS
// custom properties in styles/app.css. This reads them back and feeds them in.
//
// Only "dark" exists today. `data-theme` is still stamped on <html> so a light
// palette can be added as a `[data-theme="light"]` block without touching JS.
import { ref, computed, watchEffect } from 'vue'
import { darkTheme, GlobalThemeOverrides } from 'naive-ui'
import { clearSportColorCache } from './utils/workouts'

export type ThemeName = 'dark'

export const theme = ref<ThemeName>('dark')

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
}

export const primaryColor = ref(FALLBACK.primary)
export const primaryFill = ref(FALLBACK.primaryFill)
export const primaryFillHover = ref(FALLBACK.primaryFillHover)
export const bodyColor = ref(FALLBACK.body)
export const cardColor = ref(FALLBACK.card)
export const inputColor = ref(FALLBACK.input)
export const borderColor = ref(FALLBACK.border)
export const borderRadius = ref(FALLBACK.radius)

export const naiveTheme = computed(() => (theme.value.includes('dark') ? darkTheme : null))

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
		popoverColor: '#1b1f27',
		inputColor: inputColor.value,
		borderColor: borderColor.value,
		dividerColor: borderColor.value,
		borderRadius: borderRadius.value,
		fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
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

export const setTheme = (next: ThemeName) => {
	theme.value = next
	document.documentElement.setAttribute('data-theme', next)
	clearSportColorCache()

	// Read synchronously: the stylesheet is applied before this module runs, and
	// deferring behind a timeout left Naive UI painting the old palette first.
	const style = getComputedStyle(document.documentElement)
	const cssVar = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback

	primaryColor.value = cssVar('--primary-color', FALLBACK.primary)
	primaryFill.value = cssVar('--primary-fill', FALLBACK.primaryFill)
	primaryFillHover.value = cssVar('--primary-fill-hover', FALLBACK.primaryFillHover)
	bodyColor.value = cssVar('--background-color', FALLBACK.body)
	cardColor.value = cssVar('--card-background-color', FALLBACK.card)
	inputColor.value = cssVar('--surface-2', FALLBACK.input)
	borderColor.value = cssVar('--border-color', FALLBACK.border)
	borderRadius.value = cssVar('--radius-sm', FALLBACK.radius)
}

watchEffect(() => {
	setTheme(theme.value)
})
