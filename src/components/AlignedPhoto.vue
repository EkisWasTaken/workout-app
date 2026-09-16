<script setup lang="ts">
/**
 * A progress photo as a thumbnail, framed the way the timelapse frames it.
 *
 * CSS does the same job as `drawRect` here: `object-fit: cover` is the cover
 * fit, and `translate(…) scale(…)` applies the zoom about the centre and then
 * the offset — transforms run right to left, so the order matches the canvas.
 * A thumbnail grid of <img>s is far cheaper than a grid of canvases.
 */
import { computed, onMounted, ref } from 'vue'
import { signUrls, urlFor } from '@/photos'
import { normaliseAlignment } from '@/utils/progressPhotos'
import type { ProgressPhoto } from '@/types'

const props = defineProps<{
	photo: ProgressPhoto
	alt?: string
}>()

const failed = ref(false)
const src = computed(() => urlFor(props.photo.path))

const transform = computed(() => {
	const a = normaliseAlignment({ scale: props.photo.align_scale, x: props.photo.align_x, y: props.photo.align_y })
	return `translate(${a.x * 100}%, ${a.y * 100}%) scale(${a.scale})`
})

// A link that expired while the page was open gets one retry with a fresh signature.
async function onError() {
	if (failed.value) return
	failed.value = true
	await signUrls([props.photo.path])
}

onMounted(() => { if (!src.value) signUrls([props.photo.path]) })
</script>

<template>
	<div class="aligned-photo">
		<img
			v-if="src"
			:src="src"
			:alt="alt ?? ''"
			:style="{ transform }"
			loading="lazy"
			decoding="async"
			draggable="false"
			@error="onError"
		/>
	</div>
</template>

<style scoped>
.aligned-photo {
	position: relative;
	aspect-ratio: 3 / 4;
	overflow: hidden;
	background: var(--surface-2);
}
.aligned-photo img {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	transform-origin: center;
	user-select: none;
}
</style>
