<script setup lang="ts">
/**
 * An activity's sensor streams as stacked tracks over one time axis.
 *
 * The old chart put heart rate and pace on a single plot with a y-axis on each
 * side, so you had to work out which line belonged to which scale. Here each
 * stream gets its own strip, with its own scale and units, lined up on the same
 * elapsed time — read down the page to see how pace and heart rate moved
 * together.
 */
import { computed } from 'vue'
import { VisArea, VisAxis, VisCrosshair, VisLine, VisTooltip, VisXYContainer } from '@unovis/vue'
import { chartTooltip, paddedDomain } from './charts'

export interface StreamTrack {
	key: string
	label: string
	unit: string
	color: string
	/** One value per `time` sample. */
	values: (number | null)[]
	format: (v: number) => string
	/** Smaller values draw higher — pace, where faster should look like up. */
	reverse?: boolean
	/** Fill under the line. */
	area?: boolean
	/** Summary shown in the strip header, e.g. "avg 148". */
	summary?: string
}

const props = withDefaults(defineProps<{
	time: number[]
	tracks: StreamTrack[]
	trackHeight?: number
}>(), {
	trackHeight: 120,
})

type Row = { t: number; [k: string]: number | undefined }

const rows = computed<Row[]>(() => props.time.map((t, i) => {
	const r: Row = { t }
	for (const tr of props.tracks) {
		const v = tr.values[i]
		if (v !== null && v !== undefined && Number.isFinite(v)) r[tr.key] = v
	}
	return r
}))

const xDomain = computed<[number, number]>(() => [props.time[0] ?? 0, props.time[props.time.length - 1] ?? 1])

function fmtElapsed(secs: number) {
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = Math.round(secs % 60)
	return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

/** Round minute marks for the time axis, about six of them. */
const timeTicks = computed(() => {
	const [a, b] = xDomain.value
	const span = b - a
	const steps = [60, 120, 300, 600, 900, 1200, 1800, 3600]
	const step = steps.find(s => span / s <= 6) ?? 3600
	const out: number[] = []
	for (let t = Math.ceil(a / step) * step; t <= b; t += step) out.push(t)
	return out
})

const x = (d: Row) => d.t
const acc = (key: string) => (d: Row) => d[key]

function yDomain(tr: StreamTrack) {
	const vals = tr.values.filter((v): v is number => v !== null && Number.isFinite(v))
	// Trim the extreme 1% each side so a GPS spike or a stop doesn't flatten the strip.
	const sorted = [...vals].sort((p, q) => p - q)
	const lo = sorted[Math.floor(sorted.length * 0.01)]
	const hi = sorted[Math.ceil(sorted.length * 0.99) - 1]
	return paddedDomain(lo === undefined ? [] : [lo, hi], 0.1)
}

function template(tr: StreamTrack) {
	return (d: Row | undefined) => {
		if (!d || d[tr.key] === undefined) return ''
		return chartTooltip(fmtElapsed(d.t), [{ label: tr.label, value: `${tr.format(d[tr.key]!)} ${tr.unit}`, color: tr.color, line: true }])
	}
}
</script>

<template>
	<div class="stream-tracks">
		<div v-for="(tr, i) in tracks" :key="tr.key" class="st-track">
			<div class="st-head">
				<span class="st-label"><i :style="{ background: tr.color }"></i>{{ tr.label }}</span>
				<span v-if="tr.summary" class="st-summary mono">{{ tr.summary }}</span>
			</div>
			<VisXYContainer
				:data="rows"
				:height="trackHeight"
				:x-domain="xDomain"
				:y-domain="yDomain(tr)"
				:y-direction="tr.reverse ? 'south' : 'north'"
				:margin="{ top: 4, right: 8 }"
				:duration="0"
			>
				<VisArea
					v-if="tr.area"
					:x="x"
					:y="acc(tr.key)"
					:color="tr.color"
					:opacity="0.12"
					curve-type="monotoneX"
				/>
				<VisLine :x="x" :y="acc(tr.key)" :color="tr.color" :line-width="1.6" curve-type="monotoneX" />
				<VisAxis
					type="x"
					:tick-values="timeTicks"
					:tick-format="(v: number | Date) => (i === tracks.length - 1 ? fmtElapsed(Number(v)) : '')"
					:grid-line="true"
				/>
				<VisAxis type="y" :num-ticks="3" :tick-format="(v: number | Date) => tr.format(Number(v))" />
				<VisCrosshair :x="x" :y="[acc(tr.key)]" :color="tr.color" :template="template(tr)" :snapToData="true" />
				<VisTooltip :horizontal-shift="14" :vertical-shift="10" />
			</VisXYContainer>
		</div>
	</div>
</template>

<style scoped>
.stream-tracks { display: flex; flex-direction: column; gap: 10px; }
.st-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
.st-label { display: inline-flex; align-items: center; gap: 7px; font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); }
.st-label i { width: 12px; height: 2px; border-radius: 1px; display: inline-block; }
.st-summary { font-size: 0.72rem; color: var(--text-muted); }
</style>
