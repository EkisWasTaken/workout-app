/**
 * Whole palettes, as starting points for the UI lab.
 *
 * Each one is a complete set rather than a tint of the stock theme, because a
 * palette is a set of *relationships* — how far the card sits off the page, how
 * far the border sits off the card — and nudging one token at a time never
 * finds those. Pick one, then tweak.
 *
 * Every preset keeps the rules the stock palette is built on:
 *
 *   · body text clears WCAG AA on the card surface
 *   · green and amber stay reserved for the progress verdicts, so no sport or
 *     accent may be either
 *   · the five sports stay distinguishable from one another, and none of them
 *     reads as a verdict
 *
 * The lab's contrast panel checks the first of those live; the other two are a
 * matter of choosing the hues, which is done here.
 */

export interface UiPreset {
	key: string
	label: string
	blurb: string
	/** Four colours for the button: page, accent, and two sports. */
	swatches: string[]
	/** Token name (no `--`) to value. Derived tokens are computed on apply. */
	values: Record<string, string>
}

export const PRESETS: UiPreset[] = [
	{
		key: 'graphite',
		label: 'Graphite',
		blurb: 'Neutral grey, lower contrast furniture.',
		swatches: ['#141414', '#8b9dff', '#4cc2ff', '#ff7ab6'],
		values: {
			'background-color': '#0c0c0d',
			'surface-color': '#141416',
			'surface-2': '#1b1b1e',
			'surface-hover': '#232327',
			'surface-elevated': '#1e1e22',
			'sidebar-bg-top': '#101012',
			'sidebar-bg-bottom': '#0d0d0f',
			'border-color': '#26262b',
			'border-strong': '#3a3a41',
			'text-color': '#f1f1f3',
			'text-secondary': '#a8a8b0',
			'text-muted': '#78787f',
			'primary-color': '#8b9dff',
			'primary-fill': '#5468e0',
			'primary-fill-hover': '#6478ee',
			'color-running-primary': '#4cc2ff',
			'color-gym-primary': '#ff7ab6',
			'color-bike-primary': '#ffa24c',
			'color-rest-primary': '#6b7280',
			'color-other-primary': '#9ca3af',
		},
	},
	{
		key: 'midnight',
		label: 'Midnight',
		blurb: 'Deep navy, cooler and a touch softer.',
		swatches: ['#0d1220', '#7aa2f7', '#56b6ff', '#e08cc8'],
		values: {
			'background-color': '#070b14',
			'surface-color': '#0d1220',
			'surface-2': '#141b2d',
			'surface-hover': '#1b2438',
			'surface-elevated': '#161e30',
			'sidebar-bg-top': '#0a0f1b',
			'sidebar-bg-bottom': '#070b14',
			'border-color': '#1f2937',
			'border-strong': '#334155',
			'text-color': '#e6edf7',
			'text-secondary': '#9aa8bf',
			'text-muted': '#6b7A92',
			'primary-color': '#7aa2f7',
			'primary-fill': '#4668d8',
			'primary-fill-hover': '#5878e6',
			'color-running-primary': '#56b6ff',
			'color-gym-primary': '#e08cc8',
			'color-bike-primary': '#f0a868',
			'color-rest-primary': '#5b6b85',
			'color-other-primary': '#8896ab',
		},
	},
	{
		key: 'warm',
		label: 'Warm slate',
		blurb: 'Brown-grey ground, warmer text.',
		swatches: ['#191512', '#c9a227', '#5fbdd6', '#d97ba0'],
		values: {
			'background-color': '#120f0d',
			'surface-color': '#191512',
			'surface-2': '#221d19',
			'surface-hover': '#2b2520',
			'surface-elevated': '#251f1b',
			'sidebar-bg-top': '#161210',
			'sidebar-bg-bottom': '#120f0d',
			'border-color': '#2e2822',
			'border-strong': '#463d34',
			'text-color': '#f4efe8',
			'text-secondary': '#b3a89b',
			'text-muted': '#857a6d',
			'primary-color': '#d9b441',
			// Deep enough that white button text clears AA: the obvious mid-gold
			// only managed 3.6:1, which the lab's own contrast panel flags.
			'primary-fill': '#8a6a12',
			'primary-fill-hover': '#a07d19',
			'color-running-primary': '#5fbdd6',
			'color-gym-primary': '#d97ba0',
			'color-bike-primary': '#e0925a',
			'color-rest-primary': '#7d7367',
			'color-other-primary': '#a1968a',
		},
	},
	{
		key: 'high-contrast',
		label: 'High contrast',
		blurb: 'Pure black, brighter text and hues.',
		swatches: ['#000000', '#b3a4ff', '#4dd4ff', '#ff86c8'],
		values: {
			'background-color': '#000000',
			'surface-color': '#0d0d0f',
			'surface-2': '#17171b',
			'surface-hover': '#212127',
			'surface-elevated': '#1a1a1f',
			'sidebar-bg-top': '#0a0a0c',
			'sidebar-bg-bottom': '#000000',
			'border-color': '#32323a',
			'border-strong': '#4c4c58',
			'text-color': '#ffffff',
			'text-secondary': '#c3c3cc',
			'text-muted': '#9292a0',
			'primary-color': '#b3a4ff',
			'primary-fill': '#6a54f0',
			'primary-fill-hover': '#7d69f7',
			'success-color': '#5ef08a',
			'warning-color': '#ffcc3d',
			'danger-color': '#ff8a8a',
			'color-running-primary': '#4dd4ff',
			'color-gym-primary': '#ff86c8',
			'color-bike-primary': '#ffa94d',
			'color-rest-primary': '#7d8899',
			'color-other-primary': '#aab4c4',
		},
	},
	{
		key: 'soft',
		label: 'Soft',
		blurb: 'Rounder, roomier, gentler edges.',
		swatches: ['#15171d', '#a596ff', '#4ec5f0', '#f07fbd'],
		values: {
			'background-color': '#0e1015',
			'surface-color': '#15171d',
			'surface-2': '#1d2028',
			'surface-hover': '#252934',
			'surface-elevated': '#20242c',
			'border-color': '#272b34',
			'border-strong': '#3a404d',
			'text-color': '#eceef3',
			'text-secondary': '#a7aebd',
			'text-muted': '#79818f',
			'primary-color': '#a596ff',
			'primary-fill': '#7362e8',
			'primary-fill-hover': '#8372f2',
			'color-running-primary': '#4ec5f0',
			'color-gym-primary': '#f07fbd',
			'color-bike-primary': '#f9a05c',
			'radius-sm': '12px',
			'radius': '20px',
			'radius-lg': '28px',
			'ui-scale': '105',
		},
	},
	{
		key: 'compact',
		label: 'Compact',
		blurb: 'Stock colours, tighter and squarer.',
		swatches: ['#12151b', '#9b8cff', '#38bdf8', '#f472b6'],
		values: {
			'radius-sm': '4px',
			'radius': '7px',
			'radius-lg': '10px',
			'ui-scale': '92',
			'sidebar-width': '188px',
			'nav-icon-size': '18px',
			'mobile-nav-height': '54px',
		},
	},
]
