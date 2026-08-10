<script setup lang="ts">
/** Section heading plus a quiet note, used by every stats tab. */
defineProps<{ title: string; note?: string }>()
</script>

<template>
	<div class="section-head">
		<h2>{{ title }}</h2>
		<span v-if="note" class="section-note">{{ note }}</span>
		<slot name="aside" />
	</div>
</template>

<style scoped>
.section-head {
	display: flex;
	align-items: baseline;
	gap: 10px;
	flex-wrap: wrap;
	margin: 22px 0 11px;
}
.section-head h2 {
	font-size: 1.02rem;
	font-weight: 600;
	font-family: var(--font-family);
	margin: 0;
}
.section-note {
	font-size: 0.78rem;
	color: var(--text-muted);
}
</style>
