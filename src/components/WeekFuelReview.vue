<script setup lang="ts">
/**
 * How a week actually went — training done, and what the scale says you ate.
 *
 * Without any food logging, the week's completed sessions and two trend
 * weights are enough to work backwards to an average intake. With the diary,
 * that estimate gets a second opinion: the two bars side by side are the check.
 *
 * It says "can't tell yet" often and deliberately. One week of body weight
 * genuinely cannot separate a 200 kcal error from a salty dinner, so the
 * four-week roll-up carries the verdict whenever the single week can't.
 */
import { computed } from 'vue'
import { format, parseISO } from 'date-fns'
import type { FuelTrend, FuelWeekReview } from '@/utils/fuelReview'
import { diaryGap } from '@/utils/meals'

const props = withDefaults(defineProps<{
	review: FuelWeekReview | null
	/** The four-week roll-up, which is where a trustworthy verdict lives. */
	trend?: FuelTrend | null
	/** Why there's nothing to show. */
	blocked?: 'stats' | 'weight' | null
	title?: string
	/** What the food diary recorded that week: average over the days that have entries. */
	logged?: { perDay: number; days: number } | null
}>(), {
	trend: null,
	blocked: null,
	title: 'Last week',
	logged: null,
})

const kcal = (n: number) => Math.round(Math.abs(n)).toLocaleString()

const range = computed(() => {
	const r = props.review
	if (!r) return ''
	return `${format(parseISO(r.weekStart), 'd MMM')} – ${format(parseISO(r.weekEnd), 'd MMM')}`
})

/**
 * The scale's estimate, only when the week will commit to one. A number
 * computed from one morning's weigh-in is something people would act on, and
 * it is meaningless — better to say so than to show false precision.
 */
const implied = computed(() => {
	const r = props.review
	return r && r.impliedIntakePerDay !== null && r.verdict !== 'unknown' ? r.impliedIntakePerDay : null
})

const headline = computed(() => {
	const r = props.review!
	if (implied.value === null) {
		return r.unknownReason === 'partial' ? 'Too early in the week to tell what you ate'
			: r.unknownReason === 'weight' ? 'Weigh in at both ends of the week to see what you ate'
			: 'One week of weigh-ins is too noisy to call'
	}
	return `You ate about ${kcal(implied.value)} kcal a day`
})

const verdictText = computed(() => {
	const g = props.review?.intakeGapPerDay
	if (implied.value === null || g == null) return ''
	if (Math.abs(g) < 10 || props.review!.verdict === 'on-track') return 'On target'
	return `${kcal(g)} ${g > 0 ? 'over' : 'under'} target`
})

/**
 * Target, scale estimate and diary on one shared scale from zero, so bar
 * length is the comparison. The target is a hollow bar: it is the yardstick,
 * not a measurement.
 */
const bars = computed(() => {
	const r = props.review
	if (!r) return []
	const rows = [
		{ key: 'target', label: 'Target', value: r.targetIntakePerDay, note: '' },
		...(implied.value !== null ? [{ key: 'scale', label: 'Scale says', value: implied.value, note: '' }] : []),
		...(props.logged ? [{ key: 'diary', label: 'Diary', value: props.logged.perDay, note: `${props.logged.days} of 7 days logged` }] : []),
	]
	const max = Math.max(...rows.map(b => b.value), 1)
	return rows.map(b => ({ ...b, pct: (b.value / max) * 100 }))
})

/** When the scale and a well-kept diary disagree, say which way and by how much. */
const gap = computed(() => diaryGap(implied.value, props.logged))

/** A week barely begun hasn't moved on the scale yet. */
const showScale = computed(() =>
	!!props.review && props.review.actualChangeKg !== null && props.review.unknownReason !== 'partial')

/** A signed kilo, where "+0.0" would be a lie about the sign of nothing. */
const kgDelta = (v: number) => {
	const r = Math.round(v * 10) / 10
	return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)}`
}

const verdictClass = computed(() => props.review?.verdict ?? 'unknown')

/** The roll-up is the point when the single week couldn't call it, and corroboration when it did. */
const showTrend = computed(() => !!props.trend && props.trend.measured > 0)
</script>

<template>
	<div class="wfr">
		<div class="wfr-head">
			<h2 class="wfr-title">{{ title }}</h2>
			<span v-if="range" class="wfr-range">{{ range }}</span>
		</div>

		<p v-if="blocked" class="wfr-msg">
			<template v-if="blocked === 'weight'">
				Weigh in a couple of times a week and this will estimate what you actually ate.
			</template>
			<template v-else>
				Add your height, year of birth and sex in Profile to turn your weigh-ins into a fuelling
				review.
			</template>
		</p>

		<p v-else-if="!review" class="wfr-msg">
			Nothing to review yet. This appears once you have a week of sessions behind you.
		</p>

		<template v-else>
			<div class="wfr-lead">
				<p class="wfr-headline" :class="{ muted: implied === null }">{{ headline }}</p>
				<span v-if="verdictText" class="wfr-verdict" :class="verdictClass">{{ verdictText }}</span>
			</div>

			<div class="wfr-bars" role="table" aria-label="Daily kcal: target compared with estimates">
				<div v-for="b in bars" :key="b.key" class="wfr-bar" :class="b.key" role="row">
					<span class="wb-label" role="rowheader">{{ b.label }}</span>
					<span class="wb-track" role="cell" :title="`${b.label}: ${kcal(b.value)} kcal/day`">
						<span class="wb-fill" :style="{ width: b.pct + '%' }" />
					</span>
					<span class="wb-value mono" role="cell">{{ kcal(b.value) }}</span>
					<span v-if="b.note" class="wb-note">{{ b.note }}</span>
				</div>
			</div>

			<p v-if="gap" class="wfr-gap">
				<template v-if="gap.kind === 'under'">
					The scale says you ate about <strong class="mono">{{ kcal(gap.kcal) }}</strong> kcal a day more than you logged.
					That's usually cooking oil, drinks, snacks or eyeballed portions, so weighing those for a week is the fastest fix.
				</template>
				<template v-else>
					You logged about <strong class="mono">{{ kcal(gap.kcal) }}</strong> kcal a day more than the scale shows.
					Portions may be logged generously, or water weight is hiding a drop. Give it another week before changing anything.
				</template>
			</p>

			<dl class="wfr-facts">
				<div>
					<dt>Burned</dt>
					<dd>
						<strong class="mono">{{ kcal(review.actualBurnPerDay) }}</strong> kcal/day<template
							v-if="review.actualBurnPerDay !== review.plannedBurnPerDay">, plan {{ kcal(review.plannedBurnPerDay) }}</template>
					</dd>
				</div>
				<div>
					<dt>{{ review.complete ? 'Training done' : 'Training done so far' }}</dt>
					<dd>
						<strong class="mono">{{ review.loadPct ?? '—' }}<template v-if="review.loadPct !== null">%</template></strong>
						<template v-if="review.due.sessions">, {{ review.completed.sessions }} of {{ review.due.sessions }} sessions</template>
					</dd>
				</div>
				<div>
					<dt>Scale</dt>
					<dd>
						<strong class="mono">{{ showScale ? kgDelta(review.actualChangeKg!) + ' kg' : '—' }}</strong>,
						plan {{ kgDelta(review.predictedChangeKg) }} kg
					</dd>
				</div>
			</dl>

			<p class="wfr-msg">{{ review.message }}</p>

			<p v-if="showTrend" class="wfr-trend" :class="trend!.verdict">
				<strong>Over {{ trend!.measured }} weeks:</strong> {{ trend!.message }}
			</p>
		</template>
	</div>
</template>

<style scoped>
.wfr { display: flex; flex-direction: column; gap: 14px; }
.wfr-head { display: flex; align-items: baseline; gap: 10px; }
.wfr-title { margin: 0; font-size: 1rem; font-weight: 600; font-family: var(--font-family); color: var(--text-color); }
.wfr-range { margin-left: auto; font-size: 0.82rem; color: var(--text-muted); }

.wfr-lead { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.wfr-headline {
	margin: 0; font-family: var(--font-display); font-size: 1.2rem; font-weight: 600;
	line-height: 1.3; letter-spacing: -0.01em; color: var(--text-color);
}
.wfr-headline.muted { font-size: 1rem; color: var(--text-secondary); }
/* Verdict colour sits on a chip with words, never on a bare number. */
.wfr-verdict {
	font-size: 0.8rem; font-weight: 600; padding: 3px 10px; border-radius: 999px;
	background: var(--surface-2); color: var(--text-secondary);
}
.wfr-verdict.on-track { background: var(--success-soft); color: var(--success-color); }
.wfr-verdict.over { background: var(--warning-soft); color: var(--warning-color); }
.wfr-verdict.under { background: var(--primary-soft); color: var(--primary-color); }

.wfr-bars { display: flex; flex-direction: column; gap: 8px; }
.wfr-bar { display: grid; grid-template-columns: 84px minmax(0, 1fr) 56px; align-items: center; gap: 12px; }
.wb-label { font-size: 0.84rem; color: var(--text-secondary); }
.wb-track { height: 10px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.wb-fill { display: block; height: 100%; border-radius: 999px; }
.target .wb-fill { box-shadow: inset 0 0 0 1.5px var(--text-muted); }
.scale .wb-fill { background: var(--primary-color); }
.diary .wb-fill { background: var(--text-secondary); }
.wb-value { font-size: 0.92rem; font-weight: 600; color: var(--text-color); text-align: right; }
.wb-note { grid-column: 2 / -1; margin-top: -4px; font-size: 0.76rem; color: var(--text-muted); }

.wfr-facts {
	display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 0;
	padding-top: 12px; border-top: 1px solid var(--border-subtle);
}
.wfr-facts dt { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 2px; }
.wfr-facts dd { margin: 0; font-size: 0.86rem; color: var(--text-secondary); }
.wfr-facts strong { color: var(--text-color); font-weight: 600; }

.wfr-gap { margin: 0; font-size: 0.86rem; line-height: 1.55; color: var(--text-secondary); max-width: 68ch; }
.wfr-gap strong { color: var(--text-color); font-weight: 600; }
.wfr-msg { margin: 0; font-size: 0.88rem; line-height: 1.55; color: var(--text-secondary); max-width: 68ch; }
.wfr-trend {
	margin: 0; font-size: 0.86rem; line-height: 1.55; max-width: 68ch;
	padding: 2px 0 2px 12px; border-left: 2px solid var(--border-strong); color: var(--text-secondary);
}
.wfr-trend strong { color: var(--text-color); font-weight: 600; }
.wfr-trend.over { border-left-color: var(--warning-color); }
.wfr-trend.under { border-left-color: var(--primary-color); }
.wfr-trend.on-track { border-left-color: var(--success-color); }

@media (max-width: 480px) {
	.wfr-bar { grid-template-columns: 72px minmax(0, 1fr) 48px; gap: 8px; }
	.wfr-facts { gap: 10px 20px; }
}
</style>
