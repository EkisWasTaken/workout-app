/**
 * Style switches: the shape-and-feel half of the lab, as opposed to the colour
 * half.
 *
 * Each switch writes a `data-ui-<key>` attribute onto `<html>`, and
 * `styles/uiLab.css` carries the rules those attributes select. That is the
 * only sane lever: the app's components own their own scoped styles, so a lab
 * that wanted to restyle buttons by editing tokens would need a token for every
 * property it touched. An attribute plus one global stylesheet reaches the real
 * classes — `.action-button`, `.card`, `.chip`, Naive's `.n-button` — without
 * any component knowing the lab exists.
 *
 * Everything here is a *named choice*, never a number to dial in. The default
 * option of every switch reproduces the shipped design exactly, so "nothing
 * selected" and "stock" are the same thing and resetting is trivial.
 */

export interface StyleOption {
	value: string
	label: string
	hint?: string
}

export interface StyleSwitch {
	key: string
	label: string
	blurb: string
	/** The option that reproduces the shipped design. */
	fallback: string
	options: StyleOption[]
}

export const STYLE_SWITCHES: StyleSwitch[] = [
	{
		key: 'corners',
		label: 'Corners',
		blurb: 'Drives every radius at once — controls, cards and panels keep their relative proportions.',
		fallback: 'default',
		options: [
			{ value: 'sharp', label: 'Sharp', hint: 'No rounding at all.' },
			{ value: 'tight', label: 'Tight' },
			{ value: 'default', label: 'Default' },
			{ value: 'soft', label: 'Soft' },
			{ value: 'round', label: 'Round', hint: 'Fully rounded controls.' },
		],
	},
	{
		key: 'buttons',
		label: 'Button style',
		blurb: 'How a primary action is filled. Outline and ghost lean on the accent colour rather than a block of it.',
		fallback: 'solid',
		options: [
			{ value: 'solid', label: 'Solid' },
			{ value: 'soft', label: 'Soft', hint: 'Tinted fill, accent text.' },
			{ value: 'outline', label: 'Outline' },
			{ value: 'ghost', label: 'Ghost', hint: 'No border until hover.' },
			{ value: 'raised', label: 'Raised', hint: 'A shadow and a lift.' },
		],
	},
	{
		key: 'buttonshape',
		label: 'Button shape',
		blurb: 'Independent of the corner setting, because a pill button on square cards is a real choice people make.',
		fallback: 'inherit',
		options: [
			{ value: 'inherit', label: 'Match corners' },
			{ value: 'square', label: 'Square' },
			{ value: 'pill', label: 'Pill' },
		],
	},
	{
		key: 'density',
		label: 'Density',
		blurb: 'Padding inside cards, rows and controls. Compact fits more of a training week on one screen.',
		fallback: 'default',
		options: [
			{ value: 'compact', label: 'Compact' },
			{ value: 'default', label: 'Default' },
			{ value: 'roomy', label: 'Roomy' },
		],
	},
	{
		key: 'cards',
		label: 'Cards',
		blurb: 'How a surface separates from the page — by a line, by a shadow, or by its own fill.',
		fallback: 'bordered',
		options: [
			{ value: 'flat', label: 'Flat', hint: 'No border, no shadow.' },
			{ value: 'bordered', label: 'Bordered' },
			{ value: 'elevated', label: 'Elevated' },
			{ value: 'outlined', label: 'Outlined', hint: 'Heavier line, page-coloured fill.' },
		],
	},
	{
		key: 'borders',
		label: 'Border weight',
		blurb: 'How present the lines are. Hairline suits the elevated card style; bold suits flat.',
		fallback: 'default',
		options: [
			{ value: 'hairline', label: 'Hairline' },
			{ value: 'default', label: 'Default' },
			{ value: 'bold', label: 'Bold' },
		],
	},
	{
		key: 'chips',
		label: 'Chips & pills',
		blurb: 'The session chips on the calendar, sport tags and filter pills.',
		fallback: 'soft',
		options: [
			{ value: 'soft', label: 'Soft' },
			{ value: 'outline', label: 'Outline' },
			{ value: 'solid', label: 'Solid' },
		],
	},
	{
		key: 'accentbar',
		label: 'Accent edge',
		blurb: 'The coloured strip that marks a session’s sport on cards and chips.',
		fallback: 'default',
		options: [
			{ value: 'none', label: 'None' },
			{ value: 'default', label: 'Line' },
			{ value: 'thick', label: 'Thick' },
		],
	},
	{
		key: 'type',
		label: 'Type pairing',
		blurb: 'A reading face and a display face that go together, chosen as a pair rather than two lists.',
		fallback: 'default',
		options: [
			{ value: 'default', label: 'Trainlog', hint: 'Inter + Space Grotesk.' },
			{ value: 'modern', label: 'Modern', hint: 'Manrope + Outfit.' },
			{ value: 'technical', label: 'Technical', hint: 'IBM Plex Sans + IBM Plex Mono.' },
			{ value: 'neutral', label: 'Neutral', hint: 'System stack throughout.' },
			{ value: 'editorial', label: 'Editorial', hint: 'Source Sans + Sora.' },
		],
	},
	{
		key: 'scale',
		label: 'Text size',
		blurb: 'Scales the root font size, and with it almost everything in the app.',
		fallback: 'default',
		options: [
			{ value: 'xs', label: 'Smallest' },
			{ value: 'sm', label: 'Small' },
			{ value: 'default', label: 'Default' },
			{ value: 'lg', label: 'Large' },
			{ value: 'xl', label: 'Largest' },
		],
	},
	{
		key: 'motion',
		label: 'Motion',
		blurb: 'Transitions and the route-drawing animation. Off is also what the system setting does.',
		fallback: 'default',
		options: [
			{ value: 'default', label: 'On' },
			{ value: 'none', label: 'Off' },
		],
	},
]

export const STYLE_KEYS = STYLE_SWITCHES.map(s => s.key)

export const switchFor = (key: string) => STYLE_SWITCHES.find(s => s.key === key)

/**
 * The type pairings, as real font stacks.
 *
 * Kept here rather than in the CSS so the families can be loaded on demand —
 * five pairings' worth of webfonts in the initial request would cost every
 * visit for a choice most people make once.
 */
export interface TypePairing {
	body: string
	display: string
	/** Google Fonts family specs to load when this pairing is chosen. */
	google: string[]
}

const SYSTEM = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export const TYPE_PAIRINGS: Record<string, TypePairing> = {
	default: {
		body: `'Inter', ${SYSTEM}`,
		display: `'Space Grotesk', 'Inter', ${SYSTEM}`,
		google: [],
	},
	modern: {
		body: `'Manrope', ${SYSTEM}`,
		display: `'Outfit', 'Manrope', ${SYSTEM}`,
		google: ['Manrope:wght@400;500;600;700', 'Outfit:wght@500;600;700'],
	},
	technical: {
		body: `'IBM Plex Sans', ${SYSTEM}`,
		display: `'IBM Plex Mono', ui-monospace, monospace`,
		google: ['IBM+Plex+Sans:wght@400;500;600;700', 'IBM+Plex+Mono:wght@500;600;700'],
	},
	neutral: {
		body: SYSTEM,
		display: SYSTEM,
		google: [],
	},
	editorial: {
		body: `'Source Sans 3', ${SYSTEM}`,
		display: `'Sora', 'Source Sans 3', ${SYSTEM}`,
		google: ['Source+Sans+3:wght@400;500;600;700', 'Sora:wght@500;600;700'],
	},
}

/** Root font sizes for the text-size switch, px. 16 is the browser default. */
export const SCALE_PX: Record<string, number> = {
	xs: 13.6, sm: 14.8, default: 16, lg: 17.6, xl: 19.2,
}
