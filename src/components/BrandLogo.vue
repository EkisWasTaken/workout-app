<template>
	<!-- The app mark. public/favicon.svg is the same drawing: change both together. -->
	<svg class="brand-logo" :width="size" :height="size" viewBox="0 0 64 64" role="img" aria-label="Trainlog">
		<defs>
			<linearGradient :id="gid" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#f59a52" />
				<stop offset="1" stop-color="#c2530b" />
			</linearGradient>
		</defs>
		<rect width="64" height="64" rx="16" :fill="`url(#${gid})`" />
		<path d="M11 35h9l5-10 7 17 7-21 5 14h9" fill="none" stroke="#fff" stroke-width="5.5"
			stroke-linecap="round" stroke-linejoin="round" />
	</svg>
</template>

<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{ size?: number }>(), { size: 32 })

// Per instance: two logos on one page must not share a gradient id, or hiding
// the first one (display: none) blanks the fill of the second.
const gid = `brand-grad-${useId()}`
</script>

<style scoped>
.brand-logo { display: block; flex-shrink: 0; border-radius: 26%; }
</style>
