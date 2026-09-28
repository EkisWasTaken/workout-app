// src/theme.ts
//
// Dark or light, and everything that has to follow.
//
// The design lives in `styles/app.css`: `:root` is the dark ground and
// `html[data-theme='light']` replaces the colour tokens with the paper ones.
// Everything in the app is written against those tokens, so switching is one
// attribute — except for two things that custom properties cannot reach, and
// this module exists for those two:
//
//   **Naive UI** takes its palette as JS values, not custom properties, and its
//   components carry a compiled dark or light theme of their own. Without this
//   the library's buttons, inputs, dropdowns and modals would stay dark over a
//   white page.
//
//   **Charts** read colours through `getComputedStyle` and memoise them, so the
//   cache has to be dropped when the ground changes.
import { ref, computed } from 'vue'
import { darkTheme, GlobalThemeOverrides } from 'naive-ui'
import { clearSportColorCache } from './utils/workouts'

export type ThemeName = 'dark' | 'light'

const STORAGE_KEY = 'theme'

/**
 * Which theme to start in.
 *
 * A saved choice always wins — someone who picked light on a machine set to
 * dark meant it. Absent one, follow the operating system, because that is the
 * answer the person has already given everywhere else.
 *
 * Pure, so the decision is testable without a DOM.
 */
export function resolveInitialTheme(saved: string | null, prefersDark: boolean): ThemeName {
	if (saved === 'dark' || saved === 'light') return saved
	return prefersDark ? 'dark' : 'light'
}

export const theme = ref<ThemeName>('dark')

export const isDark = computed(() => theme.value === 'dark')

/** Naive's own light theme is `null`; it is the library's default. */
export const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : null))

/** Fallbacks mirror :root in styles/app.css, for the case where CSS hasn't applied. */
const FALLBACK = {
	primary: '#f3a268',
	primaryFill: '#be5409',
	primaryFillHover: '#e0640b',
	body: '#0d0c0a',
	card: '#161512',
	input: '#201e1a',
	border: '#2c2824',
	radius: '11px',
	popover: '#24211e',
	text: '#f3f2f2',
	softFill: 'rgba(243, 162, 104, 0.13)',
	font: "'Source Sans 3', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
}

export const primaryColor = ref(FALLBACK.primary)
export const primaryFill = ref(FALLBACK.primaryFill)
export const primaryFillHover = ref(FALLBACK.primaryFillHover)
export const bodyColor = ref(FALLBACK.body)
export const cardColor = ref(FALLBACK.card)
export const inputColor = ref(FALLBACK.input)
export const borderColor = ref(FALLBACK.border)
export const borderRadius = ref(FALLBACK.radius)
export const popoverColor = ref(FALLBACK.popover)
export const textColor = ref(FALLBACK.text)
export const softFill = ref(FALLBACK.softFill)
export const fontFamily = ref(FALLBACK.font)

/**
 * Primary buttons are *soft*: a tint of the accent with accent-coloured text,
 * rather than a block of it.
 *
 * It matches the flat panels — nothing else on the page is a solid slab of
 * colour — and it sidesteps a contrast trap the old solid style had fallen
 * into, where the button took `--primary-color` (a light shade tuned for text
 * on a surface) and put white on top of it.
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
		colorPrimary: softFill.value,
		colorHoverPrimary: softFill.value,
		colorPressedPrimary: softFill.value,
		colorFocusPrimary: softFill.value,
		borderPrimary: `1px solid ${softFill.value}`,
		borderHoverPrimary: `1px solid ${primaryColor.value}`,
		borderPressedPrimary: `1px solid ${primaryColor.value}`,
		borderFocusPrimary: `1px solid ${primaryColor.value}`,
		textColorPrimary: primaryColor.value,
		textColorHoverPrimary: primaryColor.value,
		textColorPressedPrimary: primaryColor.value,
		textColorFocusPrimary: primaryColor.value,
		fontWeight: '600',
	},
	Layout: {
		color: bodyColor.value,
		siderColor: cardColor.value,
	},
	Card: { color: cardColor.value, borderRadius: '18px' },
	Menu: { color: cardColor.value },
}))

/**
 * Re-read every colour Naive UI needs from the live custom properties.
 *
 * Synchronous on purpose: `data-theme` has just changed, and deferring behind a
 * timeout left Naive painting the old ground for a frame.
 */
function refreshFromCss() {
	if (typeof document === 'undefined') return
	const style = getComputedStyle(document.documentElement)
	const cssVar = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback

	primaryColor.value = cssVar('--primary-color', FALLBACK.primary)
	primaryFill.value = cssVar('--primary-fill', FALLBACK.primaryFill)
	primaryFillHover.value = cssVar('--primary-fill-hover', FALLBACK.primaryFillHover)
	bodyColor.value = cssVar('--background-color', FALLBACK.body)
	cardColor.value = cssVar('--card-background-color', '') || cssVar('--surface-color', FALLBACK.card)
	inputColor.value = cssVar('--surface-2', FALLBACK.input)
	borderColor.value = cssVar('--border-color', FALLBACK.border)
	borderRadius.value = cssVar('--radius-sm', FALLBACK.radius)
	popoverColor.value = cssVar('--surface-elevated', FALLBACK.popover)
	textColor.value = cssVar('--text-color', FALLBACK.text)
	softFill.value = cssVar('--primary-soft', FALLBACK.softFill)
	fontFamily.value = cssVar('--font-family', FALLBACK.font)

	clearSportColorCache()
}

export const setTheme = (next: ThemeName) => {
	theme.value = next
	if (typeof document === 'undefined') return
	document.documentElement.setAttribute('data-theme', next)
	try {
		localStorage.setItem(STORAGE_KEY, next)
	} catch {
		// Private mode or a full quota: the choice just won't outlive the tab.
	}
	refreshFromCss()
}

export const toggleTheme = () => setTheme(theme.value === 'dark' ? 'light' : 'dark')

/**
 * Called once from the entry point, before the app mounts, so the first paint
 * is already in the right ground rather than flashing the other one and
 * correcting itself.
 */
export function hydrateTheme() {
	if (typeof document === 'undefined') return
	let saved: string | null = null
	try {
		saved = localStorage.getItem(STORAGE_KEY)
	} catch {
		// Storage blocked: fall through to the system preference.
	}
	const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
	const initial = resolveInitialTheme(saved, prefersDark)

	// Written directly rather than through `setTheme`, so a first run that is
	// only following the system preference doesn't record a choice the person
	// never made — they keep following the OS until they pick one.
	theme.value = initial
	document.documentElement.setAttribute('data-theme', initial)
	refreshFromCss()
}
