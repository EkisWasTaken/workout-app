<script setup lang="ts">
/**
 * How a week actually went — training done, and what the scale says you ate.
 *
 * The number nobody else can give you is the last one: without any food logging
 * at all, the week's completed sessions and two trend weights are enough to
 * work backwards to an average intake. That's the feedback loop the fuel plan
 * needs, and it's why this sits next to the plan rather than inside it.
 *
 * It says "can't tell yet" often and deliberately. One week of body weight
 * genuinely cannot separate a 200 kcal error from a salty dinner, so the
 * four-week roll-up carries the verdict whenever the single week can't.
 */
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { FlameOutline } from '@vicons/ionicons5'
import { format, parseISO } from 'date-fns'
import type { FuelTrend, FuelWeekReview } from '@/utils/fuelReview'

const props = withDefaults(defineProps<{
	review: FuelWeekReview | null
	/** The four-week roll-up, which is where a trustworthy verdict lives. */
	trend?: FuelTrend | null
	/** Why there's nothing to show. */
	blocked?: 'stats' | 'weight' | null
	title?: string
}>(), {
	trend: null,
	blocked: null,
	title: 'Last week',
})

const kcal = (n: number) => Math.round(Math.abs(n)).toLocaleString()

const range = computed(() => {
	const r = props.review
	if (!r) return ''
	return `${format(parseISO(r.weekStart), 'd MMM')} – ${format(parseISO(r.weekEnd), 'd MMM')}`
})

/**
 * The headline: what the scale says you ate, against what was asked.
 *
 * Blank whenever the week won't commit to a verdict. A "+361 kcal/day" on the
 * Monday of a week, computed from one morning's weigh-in, is a number people
 * would act on — and it is meaningless. Better to show nothing than to show
 * precision that isn't there.
 */
const gapLabel = computed(() => {
	const r = props.review
	if (!r || r.intakeGapPerDay === null || r.verdict === 'unknown') return '—'
	if (Math.abs(r.intakeGapPerDay) < 10) return 'on target'
	return `${r.intakeGapPerDay > 0 ? '+' : '−'}${kcal(r.intakeGapPerDay)}`
})

/** Likewise the scale reading: a week barely begun hasn't moved yet. */
const showScale = computed(() =>
	!!props.review && props.review.actualChangeKg !== null && props.review.unknownReason !== 'partial')

/** A signed kilo, where "+0.0" would be a lie about the sign of nothing. */
const kgDelta = (v: number) => {
	const r = Math.round(v * 10) / 10
	return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)}`
}

const verdictClass = computed(() => props.review?.verdict ?? 'unknown')

/**
 * Only show the roll-up when it adds something: it's the whole point when the
 * single week couldn't call it, and corroboration when it did.
 */
const showTrend = computed(() => !!props.trend && props.trend.measured > 0)
</script>

<template>
	<div class="wfr">
		<div class="wfr-head">
			<span class="wfr-kicker"><n-icon :component="FlameOutline" /> {{ title }}</span>
			<span v-if="range" class="wfr-range">{{ range }}</span>
		</div>

		<p v-if="blocked" class="wfr-msg">
			<template v-if="blocked === 'weight'">
				Weigh in a couple of times a week and this will tell you what you actually ate, without
				logging a single meal.
			</template>
			<template v-else>
				Add your height, year of birth and sex in Profile to turn your weigh-ins into a fuelling
				review.
			</template>
		</p>

		<p v-else-if="!review" class="wfr-msg">
			Nothing to review yet — this appears once you have a week of sessions behind you.
		</p>

		<template v-else>
			<div class="wfr-stats">
				<div class="wfr-stat">
					<span class="wfr-val mono" :class="verdictClass">{{ gapLabel }}</span>
					<span class="wfr-lbl">
						kcal/day vs target
						<template v-if="review.targetIntakePerDay"> ({{ kcal(review.targetIntakePerDay) }})</template>
					</span>
				</div>
				<div class="wfr-stat">
					<span class="wfr-val mono">{{ kcal(review.actualBurnPerDay) }}</span>
					<span class="wfr-lbl">
						kcal/day burned
						<template v-if="review.actualBurnPerDay !== review.plannedBurnPerDay">
							· planned {{ kcal(review.plannedBurnPerDay) }}
						</template>
					</span>
				</div>
				<div class="wfr-stat">
					<span class="wfr-val mono">
						{{ review.loadPct ?? '—' }}<span v-if="review.loadPct !== null" class="wfr-unit">%</span>
					</span>
					<span class="wfr-lbl">
						of training {{ review.complete ? 'planned' : 'due so far' }} done
						<template v-if="review.due.sessions">
							· {{ review.completed.sessions }}/{{ review.due.sessions }} sessions
						</template>
					</span>
				</div>
				<div class="wfr-stat">
					<span class="wfr-val mono">
						{{ showScale ? kgDelta(review.actualChangeKg!) : '—' }}
					</span>
					<span class="wfr-lbl">kg on the scale · plan said {{ kgDelta(review.predictedChangeKg) }}</span>
				</div>
			</div>

			<p class="wfr-msg">{{ review.message }}</p>

			<p v-if="showTrend" class="wfr-trend" :class="trend!.verdict">
				<span class="wfr-trend-lbl">{{ trend!.measured }}-week view</span>
				{{ trend!.message }}
			</p>
		</template>
	</div>
</template>

<style scoped>
.wfr { display: flex; flex-direction: column; gap: 10px; }
.wfr-head { display: flex; align-items: baseline; gap: 10px; }
.wfr-kicker {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 0.68rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-secondary);
}
.wfr-range { margin-left: auto; font-size: 0.74rem; color: var(--text-muted); }

.wfr-stats {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 14px;
}
.wfr-stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.wfr-val { font-size: 1.15rem; font-weight: 600; line-height: 1.2; color: var(--text-color); }
.wfr-val.over { color: var(--warning-color); }
.wfr-val.under { color: var(--primary-color); }
.wfr-val.on-track { color: var(--success-color); }
.wfr-unit { font-size: 0.78rem; font-weight: 500; color: var(--text-muted); }
.wfr-lbl { font-size: 0.7rem; line-height: 1.35; color: var(--text-muted); }

.wfr-msg { margin: 0; font-size: 0.78rem; line-height: 1.55; color: var(--text-secondary); }

.wfr-trend {
	margin: 0;
	font-size: 0.78rem;
	line-height: 1.55;
	padding: 8px 11px;
	border-radius: var(--radius-sm);
	background: var(--surface-2);
	color: var(--text-secondary);
}
.wfr-trend.over { background: var(--warning-soft); color: var(--warning-color); }
.wfr-trend.under { background: var(--primary-soft); color: var(--primary-color); }
.wfr-trend-lbl {
	display: block;
	font-size: 0.64rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	opacity: 0.75;
	margin-bottom: 2px;
}

@media (max-width: 720px) {
	.wfr-stats { grid-template-columns: 1fr 1fr; gap: 12px; }
}
</style>
