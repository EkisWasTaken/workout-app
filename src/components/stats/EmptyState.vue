<script setup lang="ts">
/**
 * What a section says before it has anything to show.
 *
 * The app used to `v-if` these sections away entirely, which left a brand-new
 * account staring at a blank tab with no idea whether it was broken or empty.
 * An empty state names the gap and gives one thing to do about it.
 */
import { NIcon } from 'naive-ui'
import { RouterLink } from 'vue-router'
import type { Component } from 'vue'

defineProps<{
	icon?: Component
	title: string
	body?: string
	/** Optional call to action, as an in-app route. */
	actionLabel?: string
	actionTo?: string
	/** Renders inside a panel of its own. Off when the parent is already a card. */
	bare?: boolean
}>()
</script>

<template>
	<div class="empty-state" :class="{ bare }">
		<span v-if="icon" class="es-icon"><n-icon :component="icon" /></span>
		<h3 class="es-title">{{ title }}</h3>
		<p v-if="body" class="es-body">{{ body }}</p>
		<slot />
		<router-link v-if="actionLabel && actionTo" :to="actionTo" class="es-action">
			{{ actionLabel }} →
		</router-link>
	</div>
</template>

<style scoped>
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 8px;
	padding: 34px 22px;
	background: var(--surface-color);
	border: 1px dashed var(--border-strong);
	border-radius: var(--radius);
}
.empty-state.bare {
	background: transparent;
	border: none;
	padding: 22px 12px;
}

.es-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: var(--surface-2);
	color: var(--text-muted);
	font-size: 1.2rem;
	margin-bottom: 2px;
}

.es-title {
	font-size: 0.98rem;
	font-weight: 600;
	font-family: var(--font-family);
	color: var(--text-color);
	margin: 0;
}

.es-body {
	margin: 0;
	max-width: 46ch;
	font-size: 0.83rem;
	line-height: 1.55;
	color: var(--text-secondary);
}

.es-action {
	margin-top: 4px;
	font-size: 0.83rem;
	font-weight: 600;
	color: var(--primary-color);
}
.es-action:hover { text-decoration: underline; }
</style>
