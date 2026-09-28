<script setup lang="ts">
/**
 * One day's fuelling, at a glance.
 *
 * Calories lead and everything else is subordinate to them. That isn't a
 * styling preference: the deficit is what decides whether the weight moves, and
 * the macro split only decides how pleasant the week is while it does. Someone
 * glancing at this before breakfast needs one number.
 *
 * The rest is deliberately quiet — the macros as a single row, the burn as
 * context for why today's number differs from yesterday's. A long-run Saturday
 * reading 800 kcal higher than a rest Sunday is the whole idea, so the day's
 * training is named right next to it.
 */
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { FlameOutline } from '@vicons/ionicons5'
import { SPORT_LABELS, type EnergyDay } from '@/utils/energy'

const props = withDefaults(defineProps<{
	day: EnergyDay | null
	/** Shown above the number. "Today" on Home; a date on the schedule. */
	label?: string
	/** Why there's nothing to show, from the fuel store. */
	blocked?: 'stats' | 'weight' | null
	/** Render at half size, for sitting inside a denser panel. */
	compact?: boolean
	/**
	 * One line instead of a card, for panels where fuel is supporting detail
	 * rather than the headline. Calories still lead within the line — they are
	 * the number that decides whether the weight moves — but they no longer
	 * outrank the session the day is actually about.
	 */
	strip?: boolean
}>(), {
	label: 'Today',
	blocked: null,
	compact: false,
	strip: false,
})

const sports = computed(() => {
	const list = props.day?.sports ?? []
	return list.length ? list.map(s => SPORT_LABELS[s]).join(' + ') : 'Rest day'
})

const kcal = (n: number) => Math.round(n).toLocaleString()
</script>

<template>
	<div class="fuel-card" :class="{ compact, strip }">
		<template v-if="blocked">
			<span class="fc-kicker"><n-icon :component="FlameOutline" /> Fuel</span>
			<p class="fc-blocked">
				<template v-if="blocked === 'weight'">
					Log a weigh-in and this becomes your daily calorie target.
				</template>
				<template v-else>
					Add your height, year of birth and sex in Profile and this becomes your daily
					calorie target.
				</template>
			</p>
			<router-link :to="blocked === 'weight' ? '/schedule' : '/profile'" class="fc-link">
				{{ blocked === 'weight' ? 'Log weight' : 'Open profile' }} →
			</router-link>
		</template>

		<!-- The strip drops the kicker: whatever panel it sits in has already
		     said which day this is, and saying it twice is noise. -->
		<template v-else-if="day && strip">
			<span class="fc-strip-main">
				<strong class="mono">{{ kcal(day.intakeKcal) }}</strong> kcal to eat
			</span>
			<span class="fc-strip-rest">
				{{ day.macros.proteinG }}<abbr title="protein">P</abbr> /
				{{ day.macros.carbsG }}<abbr title="carbohydrate">C</abbr> /
				{{ day.macros.fatG }}<abbr title="fat">F</abbr>
			</span>
			<span class="fc-strip-rest">burn ~{{ kcal(day.burnKcal) }}</span>
		</template>

		<template v-else-if="day">
			<div class="fc-head">
				<span class="fc-kicker"><n-icon :component="FlameOutline" /> {{ label }} · {{ sports }}</span>
				<span class="fc-burn">burn ~{{ kcal(day.burnKcal) }}</span>
			</div>
			<div class="fc-main">
				<span class="fc-val mono">{{ kcal(day.intakeKcal) }}</span>
				<span class="fc-unit">kcal to eat</span>
			</div>
			<div class="fc-macros">
				<span><strong class="mono">{{ day.macros.proteinG }}</strong>g protein</span>
				<span><strong class="mono">{{ day.macros.carbsG }}</strong>g carbs</span>
				<span><strong class="mono">{{ day.macros.fatG }}</strong>g fat</span>
				<span v-if="day.deficitKcal !== 0" class="fc-def" :class="{ surplus: day.deficitKcal < 0 }">
					{{ day.deficitKcal > 0 ? '−' : '+' }}{{ kcal(Math.abs(day.deficitKcal)) }} vs burn
				</span>
			</div>
		</template>

		<template v-else>
			<span class="fc-kicker"><n-icon :component="FlameOutline" /> Fuel</span>
			<p class="fc-blocked">No target for this day — the plan runs from this week onward.</p>
		</template>
	</div>
</template>

<style scoped>
.fuel-card {
	padding: 14px 16px;
	border-radius: var(--radius-sm);
	border-left: 2px solid var(--primary-color);
	background: var(--surface-2);
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.fc-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.fc-kicker {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 0.68rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-secondary);
}
.fc-burn { margin-left: auto; font-size: 0.74rem; color: var(--text-muted); }

.fc-main { display: flex; align-items: baseline; gap: 7px; }
.fc-val { font-size: 2rem; font-weight: 600; line-height: 1.05; color: var(--text-color); }
.fc-unit { font-size: 0.82rem; color: var(--text-muted); }

.fc-macros {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 16px;
	margin-top: 3px;
	font-size: 0.78rem;
	color: var(--text-secondary);
}
.fc-macros strong { color: var(--text-color); }
.fc-def { color: var(--primary-color); }
.fc-def.surplus { color: var(--success-color); }

.fc-blocked { margin: 2px 0 0; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary); }
.fc-link { font-size: 0.8rem; color: var(--primary-color); text-decoration: none; }
.fc-link:hover { text-decoration: underline; }

/* A rule, not a card: no fill, no accent edge, just a line of numbers under
   whatever it belongs to. */
.strip {
	flex-direction: row;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 4px 16px;
	padding: 11px 0 0;
	border-left: none;
	border-top: 1px solid var(--border-subtle);
	border-radius: 0;
	background: none;
	font-size: 0.82rem;
	color: var(--text-muted);
}
.fc-strip-main { color: var(--text-secondary); }
.fc-strip-main strong { font-size: 1.05rem; font-weight: 600; color: var(--text-color); }
.fc-strip-rest { color: var(--text-muted); }
.strip abbr { text-decoration: none; }
.strip .fc-blocked { margin: 0; font-size: 0.78rem; }
.strip .fc-kicker { display: none; }

.compact { padding: 10px 12px; }
.compact .fc-val { font-size: 1.45rem; }
.compact .fc-macros { font-size: 0.74rem; }
</style>
