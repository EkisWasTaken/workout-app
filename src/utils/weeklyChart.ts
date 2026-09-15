/**
 * The weekly volume chart shared by Running, Bike and Gym.
 *
 * Two things made the old bar charts mislead:
 *
 *  - The current week was drawn like any finished week, so every Monday showed
 *    a cliff. It's now drawn faded and labelled "so far".
 *  - Weekly bars are noisy by nature — one missed long run and a week halves.
 *    A rolling four-week average line runs through them, which is the same
 *    number as the "weekly distance" headline card, so the eye follows the
 *    trend rather than the spikes.
 */
import Chart from 'chart.js/auto'
import { baseOpts, css } from './chartTheme'
import type { Week } from './progress'

export interface WeeklyChartInput {
	weeks: Week[]
	totals: number[]
	rolling: number[]
	color: string
	unit: string
	/** Decimal places in tooltips. */
	dp?: number
}

/** A colour at reduced opacity. Canvas can't parse color-mix, so do it by hand. */
function fade(color: string, alpha: number): string {
	const c = color.trim()
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c)
	if (hex) {
		const h = hex[1].length === 3 ? hex[1].split('').map(x => x + x).join('') : hex[1]
		const n = parseInt(h, 16)
		return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
	}
	const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(c)
	if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`
	return c
}

export function weeklyVolumeChart(canvas: HTMLCanvasElement, input: WeeklyChartInput): Chart {
	const { weeks, totals, rolling, color, unit, dp = 1 } = input
	const last = weeks.length - 1
	// The last bar is always the current week, and it isn't over until Sunday night.
	const partial = true
	const fmt = (v: number) => (Math.round(v * 10 ** dp) / 10 ** dp).toString()
	const base = baseOpts(unit)

	return new Chart(canvas, {
		type: 'bar',
		data: {
			labels: weeks.map((w, i) => (i === last && partial ? `${w.label} so far` : w.label)),
			datasets: [
				{
					type: 'line',
					label: '4-week average',
					data: rolling,
					borderColor: css('--text-color'),
					backgroundColor: 'transparent',
					borderWidth: 1.75,
					pointRadius: 0,
					pointHoverRadius: 3,
					tension: 0.35,
					cubicInterpolationMode: 'monotone',
					order: 0,
				} as any,
				{
					type: 'bar',
					label: 'Week total',
					data: totals,
					backgroundColor: totals.map((_, i) => (i === last && partial ? fade(color, 0.35) : color)),
					borderColor: totals.map((_, i) => (i === last && partial ? color : 'transparent')),
					borderWidth: totals.map((_, i) => (i === last && partial ? 1 : 0)),
					borderDash: [3, 3],
					borderRadius: 4,
					maxBarThickness: 22,
					order: 1,
				} as any,
			],
		},
		options: {
			...base,
			animation: { duration: 450, easing: 'easeOutCubic' },
			interaction: { mode: 'index', intersect: false },
			plugins: {
				...base.plugins,
				legend: {
					display: true,
					position: 'bottom',
					labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true },
				},
				tooltip: {
					...base.plugins.tooltip,
					displayColors: false,
					callbacks: {
						label: (ctx: any) => {
							const v = fmt(ctx.raw)
							if (ctx.dataset.type === 'line') return ` 4-week average: ${v} ${unit}/wk`
							const suffix = ctx.dataIndex === last && partial ? ' (week in progress)' : ''
							return ` Week: ${v} ${unit}${suffix}`
						},
					},
				},
			},
		} as any,
	})
}
