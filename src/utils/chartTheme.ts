/**
 * Chart.js styling pulled from the app's CSS custom properties, so charts stay
 * in step with the design system instead of hard-coding a second palette.
 */
import type Chart from 'chart.js/auto'
import { onUnmounted } from 'vue'

export const css = (name: string): string =>
	getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Shared axis/tooltip/legend defaults. Spread it and override what differs. */
export function baseOpts(yLabel?: string): any {
	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: css('--surface-2'),
				borderColor: css('--border-strong'),
				borderWidth: 1,
				titleColor: css('--text-color'),
				bodyColor: css('--text-secondary'),
				padding: 10,
				cornerRadius: 8,
				displayColors: false,
			},
		},
		scales: {
			x: {
				ticks: { color: css('--text-muted'), font: { size: 10 }, maxRotation: 0 },
				grid: { display: false },
				border: { display: false },
			},
			y: {
				ticks: { color: css('--text-muted'), font: { size: 10 } },
				grid: { color: css('--border-color') },
				border: { display: false },
				title: yLabel
					? { display: true, text: yLabel, color: css('--text-muted'), font: { size: 11 } }
					: undefined,
			},
		},
	}
}

/** A legend row in the app's type scale. */
export const legend = () => ({
	display: true,
	position: 'bottom' as const,
	labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true },
})

/**
 * Owns a component's charts: register each one, and they're all destroyed on
 * unmount. Forgetting the teardown leaks the canvas and Chart.js then refuses
 * to reuse it, which is what made the old tab switching flaky.
 */
export function useCharts() {
	let charts: Chart[] = []

	const add = (c: Chart) => {
		charts.push(c)
		return c
	}

	const destroy = () => {
		for (const c of charts) c.destroy()
		charts = []
	}

	onUnmounted(destroy)
	return { add, destroy }
}
