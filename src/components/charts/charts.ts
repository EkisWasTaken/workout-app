/**
 * Shared plumbing for the Unovis chart components.
 */
import { addWeeks, format, startOfMonth, startOfWeek } from 'date-fns'

export interface TipRow {
	label: string
	value: string
	color?: string
	/** Draw the swatch as a line (for line series) rather than a square. */
	line?: boolean
}

const esc = (s: string) =>
	s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/**
 * Tooltip HTML. Everything is escaped — labels include activity names, which
 * are user data, and Unovis inserts the template as markup.
 */
export function chartTooltip(title: string, rows: TipRow[], note?: string | null): string {
	const body = rows.map(r => {
		const sw = r.color
			? `<span class="vc-tip-swatch" style="background:${esc(r.color)};${r.line ? 'height:2px;border-radius:1px' : ''}"></span>`
			: ''
		return `<div class="vc-tip-row">${sw}<span class="vc-tip-label">${esc(r.label)}</span><span class="vc-tip-value">${esc(r.value)}</span></div>`
	}).join('')
	const n = note ? `<div class="vc-tip-note">${esc(note)}</div>` : ''
	return `<div class="vc-tip"><div class="vc-tip-title">${esc(title)}</div>${body}${n}</div>`
}

/** Time-axis tick labels that stay short: months over long spans, days over short ones. */
export function timeTickFormat(spanMs: number) {
	const days = spanMs / 86_400_000
	const pattern = days > 400 ? 'MMM yy' : days > 70 ? 'MMM' : 'd MMM'
	return (t: number | Date) => format(new Date(t), pattern)
}

/**
 * Tick positions on calendar boundaries — the first of a month over long spans,
 * Mondays over short ones — so a label always names the point it sits on. Left
 * to itself the scale ticks every couple of weeks, and "MMM" then prints the
 * same month twice.
 */
export function timeTickValues(from: number, to: number, maxTicks: number): number[] {
	const days = (to - from) / 86_400_000
	const out: number[] = []
	if (days > 70) {
		const d = startOfMonth(new Date(from))
		if (d.getTime() < from) d.setMonth(d.getMonth() + 1)
		const months: number[] = []
		for (; d.getTime() <= to; d.setMonth(d.getMonth() + 1)) months.push(d.getTime())
		const step = Math.max(1, Math.ceil(months.length / maxTicks))
		for (let i = 0; i < months.length; i += step) out.push(months[i])
	} else {
		let d = startOfWeek(new Date(from), { weekStartsOn: 1 })
		if (d.getTime() < from) d = addWeeks(d, 1)
		const weeks: number[] = []
		for (; d.getTime() <= to; d = addWeeks(d, 1)) weeks.push(d.getTime())
		const step = Math.max(1, Math.ceil(weeks.length / maxTicks))
		for (let i = 0; i < weeks.length; i += step) out.push(weeks[i])
	}
	return out
}

/** A padded [min, max] around the given values, so lines never touch the frame. */
export function paddedDomain(values: number[], pad = 0.08, minSpan = 0): [number, number] | undefined {
	const v = values.filter(Number.isFinite)
	if (!v.length) return undefined
	let lo = Math.min(...v)
	let hi = Math.max(...v)
	const span = Math.max(hi - lo, minSpan, Math.abs(hi) * 0.02, 1e-6)
	const mid = (lo + hi) / 2
	lo = Math.min(lo, mid - span / 2)
	hi = Math.max(hi, mid + span / 2)
	const p = (hi - lo) * pad
	return [lo - p, hi + p]
}
