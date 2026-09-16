<script setup lang="ts">
/**
 * How to take progress photos that are worth comparing.
 *
 * Almost every useless progress timelapse fails the same way: a different room,
 * a different light, the phone held at a different height. None of that is
 * obvious until you've taken months of photos that don't line up, so the
 * guidance is shown up front and kept one tap away afterwards.
 */
import { ref } from 'vue'
import { NIcon } from 'naive-ui'
import {
	BulbOutline, CalendarOutline, CameraOutline, ChevronDownOutline, LockClosedOutline,
	MoveOutline, PersonOutline, SunnyOutline, TimeOutline,
} from '@vicons/ionicons5'
import { MIN_TIMELAPSE_PHOTOS, MIN_TIMELAPSE_SPAN_DAYS, PHOTO_INTERVAL_DAYS } from '@/utils/progressPhotos'

const props = withDefaults(defineProps<{
	/** Start expanded — for a first visit, before any photos exist. */
	open?: boolean
}>(), { open: false })

const expanded = ref(props.open)

const TIPS = [
	{
		icon: SunnyOutline,
		title: 'Same place, same light',
		body: 'Pick one spot and always use it. Daylight from in front of you is best; a single ceiling light casts shadows that look like — or hide — definition.',
	},
	{
		icon: TimeOutline,
		title: 'Same time of day',
		body: 'Morning, after the bathroom and before eating or drinking. Food, water and salt change how you look by the afternoon more than a week of training does.',
	},
	{
		icon: CameraOutline,
		title: 'Same camera position',
		body: 'Prop the phone at chest height, about 2–3 m away, and use the timer. Hand-held mirror selfies change angle every time.',
	},
	{
		icon: PersonOutline,
		title: 'Same clothes, same pose',
		body: 'Fitted shorts, the same pair each time. Stand relaxed — don\'t flex or suck in — arms slightly away from your sides, head to feet in frame.',
	},
	{
		icon: MoveOutline,
		title: 'Front, side and back',
		body: 'Each pose gets its own timelapse. Side shows the most change for most people; do all three if you can.',
	},
	{
		icon: CalendarOutline,
		title: `Once every ${PHOTO_INTERVAL_DAYS} days`,
		body: 'Pick a weekday and stick to it. Change is too slow to see day to day, and weekly photos make a smooth timelapse.',
	},
]
</script>

<template>
	<section class="guide" :class="{ open: expanded }">
		<button class="guide-head" :aria-expanded="expanded" @click="expanded = !expanded">
			<span class="guide-icon"><n-icon :component="BulbOutline" /></span>
			<span class="guide-title">
				<strong>How to take photos that show progress</strong>
				<span>Six habits that make the difference between a timelapse and a slideshow</span>
			</span>
			<n-icon :component="ChevronDownOutline" class="guide-chev" />
		</button>

		<div v-if="expanded" class="guide-body">
			<ul class="tips">
				<li v-for="t in TIPS" :key="t.title">
					<span class="tip-icon"><n-icon :component="t.icon" /></span>
					<span>
						<strong>{{ t.title }}</strong>
						<span class="tip-body">{{ t.body }}</span>
					</span>
				</li>
			</ul>

			<div class="facts">
				<div class="fact">
					<strong>When is the timelapse ready?</strong>
					<p>
						After <b>{{ MIN_TIMELAPSE_PHOTOS }} photos</b> of a pose spread over at least
						<b>{{ MIN_TIMELAPSE_SPAN_DAYS / 7 }} weeks</b>. Fewer frames plays as a slideshow, and
						bodies rarely change visibly in less than a month. You can preview it before then;
						saving as a video or GIF unlocks once it's ready.
					</p>
				</div>
				<div class="fact">
					<strong>Why photos, when you already weigh in?</strong>
					<p>
						The scale can sit still while you lose fat and build muscle at the same time. Photos
						show that change; weight can't. Each photo is labelled with your weight that day, so
						you see both together.
					</p>
				</div>
				<div class="fact">
					<strong>Lining photos up</strong>
					<p>
						When you add a photo, your previous one appears faintly on top. Drag and zoom until
						your shoulders and feet match. Two taken on the same day count as a retake — only the
						latest is used.
					</p>
				</div>
				<div class="fact">
					<strong><n-icon :component="LockClosedOutline" /> Private</strong>
					<p>
						Only you can see your photos — not other people using this app. Location data is
						removed from each photo before it's uploaded.
					</p>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.guide {
	background: var(--surface-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	margin-bottom: 18px;
	overflow: hidden;
}

.guide-head {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	padding: 12px 16px;
	background: none;
	border: none;
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;
}
.guide-head:hover { background: var(--surface-hover); }
.guide-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background: var(--warning-soft);
	color: var(--pr-gold);
	font-size: 1.1rem;
}
.guide-title { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.guide-title strong { font-size: 0.9rem; }
.guide-title span { font-size: 0.76rem; color: var(--text-muted); }
.guide-chev { color: var(--text-muted); transition: transform 0.15s ease; flex-shrink: 0; }
.guide.open .guide-chev { transform: rotate(180deg); }

.guide-body { padding: 4px 16px 16px; border-top: 1px solid var(--border-subtle); }

.tips {
	list-style: none;
	margin: 12px 0 0;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 14px 20px;
}
.tips li { display: flex; gap: 10px; }
.tip-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 28px;
	height: 28px;
	border-radius: var(--radius-sm);
	background: var(--primary-soft);
	color: var(--primary-color);
}
.tips strong { display: block; font-size: 0.84rem; margin-bottom: 2px; }
.tip-body { display: block; font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary); }

.facts {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;
	margin-top: 16px;
}
.fact {
	padding: 11px 13px;
	border-radius: var(--radius-sm);
	background: var(--surface-2);
}
.fact strong { display: flex; align-items: center; gap: 5px; font-size: 0.82rem; }
.fact p { margin: 4px 0 0; font-size: 0.78rem; line-height: 1.55; color: var(--text-secondary); }
.fact b { color: var(--text-color); }

@media (max-width: 640px) {
	.tips, .facts { grid-template-columns: 1fr; }
}
</style>
