<script setup lang="ts">
/**
 * A placeholder block with a slow shimmer, for the moment before real content
 * arrives.
 *
 * The app used to jump: a page would be blank (or hold a centred spinner in a
 * box the wrong shape), then everything would appear at once and the layout
 * would settle. A skeleton in the shape of what's coming keeps the page the
 * same height throughout, so nothing moves when the data lands — and it says
 * "this is loading" without a spinner claiming the whole screen.
 *
 * The shimmer is one keyframe on a gradient, and the global
 * `prefers-reduced-motion` rule in `app.css` stops it for anyone who asked for
 * that — leaving a plain grey block, which still does the layout job.
 */
withDefaults(defineProps<{
	/** CSS width, e.g. "60%" or "120px". */
	width?: string
	/** CSS height. */
	height?: string
	/** Corner radius; defaults to the app's small radius. */
	radius?: string
	/** Stagger the shimmer so a stack of rows ripples instead of pulsing as one. */
	delay?: number
}>(), {
	width: '100%',
	height: '1rem',
	radius: 'var(--radius-sm, 6px)',
	delay: 0,
})
</script>

<template>
	<span
		class="skeleton"
		aria-hidden="true"
		:style="{ width, height, borderRadius: radius, animationDelay: `${delay}ms` }"
	></span>
</template>

<style scoped>
.skeleton {
	display: block;
	flex-shrink: 0;
	background: linear-gradient(
		100deg,
		var(--surface-2) 30%,
		var(--surface-hover, rgba(255, 255, 255, 0.06)) 50%,
		var(--surface-2) 70%
	);
	background-size: 300% 100%;
	animation: skeleton-shimmer 1.6s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
	from { background-position: 150% 0; }
	to { background-position: -150% 0; }
}
</style>
