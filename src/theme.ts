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
	primary: '#4f8cff',
	body: '#0c0f17',
	card: '#131b26',
	radius: '6px',
}

export const primaryColor = ref(FALLBACK.primary)
export const bodyColor = ref(FALLBACK.body)
export const cardColor = ref(FALLBACK.card)
export const borderRadius = ref(FALLBACK.radius)

export const naiveTheme = computed(() => (theme.value.includes('dark') ? darkTheme : null))

export const themeOverrides = computed<GlobalThemeOverrides>(() => ({
	common: {
		primaryColor: primaryColor.value,
		primaryColorHover: primaryColor.value,
		bodyColor: bodyColor.value,
		cardColor: cardColor.value,
		borderRadius: borderRadius.value,
	},
	Layout: {
		color: bodyColor.value,
		siderColor: cardColor.value,
	},
	Card: { color: cardColor.value },
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
	bodyColor.value = cssVar('--background-color', FALLBACK.body)
	cardColor.value = cssVar('--card-background-color', FALLBACK.card)
	borderRadius.value = cssVar('--radius-sm', FALLBACK.radius)
}

watchEffect(() => {
	setTheme(theme.value)
})
