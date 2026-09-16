<script setup lang="ts">
/**
 * Add a progress photo, or adjust one already taken.
 *
 * The alignment step is what makes the timelapse watchable. Your previous photo
 * of the same pose is drawn over the new one, faintly, and you drag and zoom
 * until the two line up — shoulders on shoulders, feet on feet. After that
 * every frame sits in the same place and only the body changes.
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { NButton, NDatePicker, NIcon, NInputNumber, NPopconfirm, NSlider, useMessage } from 'naive-ui'
import { CameraOutline } from '@vicons/ionicons5'
import { format, isAfter, parseISO } from 'date-fns'
import CustomModal from './CustomModal.vue'
import {
	POSES, MAX_SCALE, MIN_SCALE, NO_ALIGNMENT, dragAlignment, nearestWeight, normaliseAlignment,
	previousFrame, clamp, type Alignment, type Pose, type WeighInLike,
} from '@/utils/progressPhotos'
import { decodeFile, drawFrame, preparePhoto, UnreadableImageError, type Drawable } from '@/utils/timelapse'
import { addPhoto, bitmapFor, deletePhoto, updatePhoto } from '@/photos'
import { MISSING_PHOTOS } from '@/db'
import { isOwner, GENERIC_SCHEMA_MESSAGE } from '@/owner'
import type { ProgressPhoto } from '@/types'

const props = defineProps<{
	show: boolean
	/** The photo being edited, or null to add a new one. */
	photo: ProgressPhoto | null
	/** Every photo, for finding the one to line up against. */
	photos: ProgressPhoto[]
	weights: WeighInLike[]
	/** Pose to start a new photo in — whichever tab was open. */
	defaultPose: Pose
	/**
	 * Date and weight for a new photo, when it's being added straight after a
	 * weigh-in. Both were just chosen on purpose, so neither is second-guessed
	 * from the file or the weigh-in history.
	 */
	initialDate?: string | null
	initialWeight?: number | null
}>()

const emit = defineEmits<{
	(e: 'update:show', v: boolean): void
	(e: 'saved', photo: ProgressPhoto | null): void
}>()

const message = useMessage()
const isNew = computed(() => props.photo === null)

// ─── form state ───────────────────────────────────────────────────────────────

const form = reactive({
	date: format(new Date(), 'yyyy-MM-dd'),
	pose: 'front' as Pose,
	weight: null as number | null,
	note: '',
})
const alignment = ref<Alignment>({ ...NO_ALIGNMENT })
const file = shallowRef<File | null>(null)
const image = shallowRef<Drawable | null>(null)
const ghost = shallowRef<{ image: Drawable; photo: ProgressPhoto } | null>(null)
const ghostOn = ref(true)
const ghostOpacity = ref(0.4)
const saving = ref(false)
const loadError = ref<string | null>(null)
/** Whether the weight was typed, so changing the date doesn't overwrite it. */
const weightTouched = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

watch(() => props.show, async open => {
	if (!open) return
	loadError.value = null
	file.value = null
	image.value = null
	ghost.value = null
	weightTouched.value = false
	if (props.photo) {
		form.date = props.photo.taken_on
		form.pose = props.photo.pose
		form.weight = props.photo.weight_kg ?? null
		form.note = props.photo.note ?? ''
		weightTouched.value = true
		alignment.value = normaliseAlignment({
			scale: props.photo.align_scale, x: props.photo.align_x, y: props.photo.align_y,
		})
		try {
			image.value = await bitmapFor(props.photo.path)
		} catch (e) {
			loadError.value = (e as Error).message
		}
	} else {
		form.date = props.initialDate || format(new Date(), 'yyyy-MM-dd')
		form.pose = props.defaultPose
		form.weight = props.initialWeight ?? nearestWeight(props.weights, form.date)
		weightTouched.value = props.initialWeight != null
		form.note = ''
		alignment.value = { ...NO_ALIGNMENT }
	}
	await loadGhost()
	scheduleDraw()
}, { immediate: true })

// A new date or pose changes which earlier photo to line up against, and —
// unless the weight was typed by hand — which weigh-in describes the photo.
watch(() => [form.date, form.pose], async () => {
	if (!props.show) return
	if (!weightTouched.value) form.weight = nearestWeight(props.weights, form.date)
	await loadGhost()
	scheduleDraw()
})

async function loadGhost() {
	const prev = previousFrame(props.photos, form.pose, form.date, props.photo?.id)
	if (!prev) {
		ghost.value = null
		return
	}
	if (ghost.value?.photo.id === prev.id) return
	try {
		ghost.value = { image: await bitmapFor(prev.path), photo: prev }
	} catch {
		ghost.value = null
	}
}

// ─── picking a file ───────────────────────────────────────────────────────────

function pick() {
	fileInput.value?.click()
}

async function onPicked(e: Event) {
	const f = (e.target as HTMLInputElement).files?.[0]
	if (fileInput.value) fileInput.value.value = ''
	if (!f) return
	loadError.value = null
	try {
		image.value = await decodeFile(f)
		file.value = f
		alignment.value = { ...NO_ALIGNMENT }
		// The file's own date is the best guess at when it was taken — but never
		// a future date, and never something implausibly old.
		const modified = new Date(f.lastModified)
		if (!props.initialDate && f.lastModified && !isAfter(modified, new Date()) && modified.getFullYear() >= 2000) {
			form.date = format(modified, 'yyyy-MM-dd')
		}
		await nextTick()
		scheduleDraw()
	} catch (err) {
		loadError.value = err instanceof UnreadableImageError ? err.message : "That file couldn't be opened."
	}
}

// ─── the aligner ──────────────────────────────────────────────────────────────

let raf = 0
function scheduleDraw() {
	cancelAnimationFrame(raf)
	raf = requestAnimationFrame(draw)
}

function draw() {
	const c = canvas.value
	if (!c || !image.value) return
	const dpr = window.devicePixelRatio || 1
	const w = Math.round(c.clientWidth * dpr)
	const h = Math.round(c.clientHeight * dpr)
	if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h })
	const ctx = c.getContext('2d')
	if (!ctx) return
	drawFrame(ctx, image.value, alignment.value, {
		ghost: ghostOn.value && ghost.value
			? {
				image: ghost.value.image,
				alignment: normaliseAlignment({
					scale: ghost.value.photo.align_scale, x: ghost.value.photo.align_x, y: ghost.value.photo.align_y,
				}),
				opacity: ghostOpacity.value,
			}
			: null,
	})
}

watch([alignment, ghostOn, ghostOpacity, ghost, image], scheduleDraw, { deep: true })

// Drag to move, pinch or wheel to zoom. Pointer events cover mouse, pen and touch.
const pointers = new Map<number, { x: number; y: number }>()
let pinchStart: { dist: number; scale: number } | null = null

const pinchDistance = () => {
	const [a, b] = [...pointers.values()]
	return Math.hypot(a.x - b.x, a.y - b.y)
}

function onPointerDown(e: PointerEvent) {
	// Keeps the drag alive if the finger leaves the canvas. Not essential, so a
	// browser that refuses capture still gets a working drag.
	try { (e.target as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
	if (pointers.size === 2) pinchStart = { dist: pinchDistance(), scale: alignment.value.scale }
}

function onPointerMove(e: PointerEvent) {
	const prev = pointers.get(e.pointerId)
	const c = canvas.value
	if (!prev || !c) return
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

	if (pointers.size >= 2 && pinchStart) {
		const scale = clamp(pinchStart.scale * (pinchDistance() / pinchStart.dist), MIN_SCALE, MAX_SCALE)
		alignment.value = normaliseAlignment({ ...alignment.value, scale })
		return
	}
	alignment.value = dragAlignment(alignment.value, e.clientX - prev.x, e.clientY - prev.y, c.clientWidth, c.clientHeight)
}

function onPointerUp(e: PointerEvent) {
	pointers.delete(e.pointerId)
	if (pointers.size < 2) pinchStart = null
}

function onWheel(e: WheelEvent) {
	const scale = clamp(alignment.value.scale * (e.deltaY < 0 ? 1.05 : 1 / 1.05), MIN_SCALE, MAX_SCALE)
	alignment.value = normaliseAlignment({ ...alignment.value, scale })
}

function resetAlignment() {
	alignment.value = { ...NO_ALIGNMENT }
}

/** Copy the previous photo's framing — a good starting point when the setup hasn't changed. */
function matchPrevious() {
	if (!ghost.value) return
	const p = ghost.value.photo
	alignment.value = normaliseAlignment({ scale: p.align_scale, x: p.align_x, y: p.align_y })
}

const scaleModel = computed({
	get: () => alignment.value.scale,
	set: (v: number) => { alignment.value = normaliseAlignment({ ...alignment.value, scale: v }) },
})

onBeforeUnmount(() => cancelAnimationFrame(raf))

// ─── saving ───────────────────────────────────────────────────────────────────

const canSave = computed(() => !saving.value && !!image.value && (!isNew.value || !!file.value) && !!form.date)

function explain(e: unknown): string {
	if ((e as Error)?.message === MISSING_PHOTOS) {
		return isOwner.value
			? 'Progress photos need a database update — run supabase_progress_photos.sql in the Supabase SQL editor.'
			: GENERIC_SCHEMA_MESSAGE
	}
	return (e as Error)?.message || "Couldn't save the photo. Check your connection and try again."
}

async function save() {
	if (!canSave.value) return
	saving.value = true
	const meta = {
		taken_on: form.date,
		pose: form.pose,
		weight_kg: form.weight ?? null,
		note: form.note.trim() || null,
		align_scale: alignment.value.scale,
		align_x: alignment.value.x,
		align_y: alignment.value.y,
	}
	try {
		if (isNew.value) {
			const prepared = await preparePhoto(image.value as HTMLImageElement)
			const created = await addPhoto(prepared.blob, prepared, meta)
			message.success('Photo saved.')
			emit('saved', created)
		} else {
			await updatePhoto(props.photo!.id, meta)
			message.success('Photo updated.')
			emit('saved', null)
		}
		emit('update:show', false)
	} catch (e) {
		console.error('Saving progress photo failed', e)
		message.error(explain(e))
	} finally {
		saving.value = false
	}
}

async function remove() {
	if (!props.photo) return
	saving.value = true
	try {
		await deletePhoto(props.photo)
		message.success('Photo deleted.')
		emit('saved', null)
		emit('update:show', false)
	} catch (e) {
		console.error('Deleting progress photo failed', e)
		message.error("Couldn't delete the photo. Check your connection and try again.")
	} finally {
		saving.value = false
	}
}

const dateDisabled = (ts: number) => isAfter(new Date(ts), new Date())
const ghostDate = computed(() => ghost.value ? format(parseISO(ghost.value.photo.taken_on), 'd MMM yyyy') : '')
</script>

<template>
	<CustomModal :show="show" :title="isNew ? 'Add progress photo' : 'Edit photo'" @update:show="emit('update:show', $event)">
		<input
			ref="fileInput"
			type="file"
			accept="image/*"
			style="display: none"
			@change="onPicked"
		/>

		<div class="pe">
			<!-- Nothing picked yet: one big, obvious target. -->
			<button v-if="isNew && !image" class="pe-drop" @click="pick">
				<n-icon :component="CameraOutline" class="pe-drop-icon" />
				<span class="pe-drop-title">Take or choose a photo</span>
				<span class="pe-drop-sub">Same spot, same light, same distance each time — it makes the timelapse.</span>
			</button>

			<template v-else>
				<div class="pe-align">
					<div class="pe-frame">
						<canvas
							ref="canvas"
							class="pe-canvas"
							@pointerdown="onPointerDown"
							@pointermove="onPointerMove"
							@pointerup="onPointerUp"
							@pointercancel="onPointerUp"
							@wheel.prevent="onWheel"
						></canvas>
						<!-- Thirds, so there's something to line a shoulder or a knee up against. -->
						<div class="pe-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
					</div>

					<div class="pe-tools">
						<p class="pe-hint">
							Drag to move, pinch or scroll to zoom.
							<template v-if="ghost">Line yourself up with the faint photo from {{ ghostDate }}.</template>
						</p>

						<label class="pe-field">
							<span class="pe-lbl">Zoom</span>
							<n-slider v-model:value="scaleModel" :min="MIN_SCALE" :max="MAX_SCALE" :step="0.01" :tooltip="false" />
						</label>

						<template v-if="ghost">
							<label class="pe-check">
								<input v-model="ghostOn" type="checkbox" /> Show previous photo
							</label>
							<label v-if="ghostOn" class="pe-field">
								<span class="pe-lbl">Overlay strength</span>
								<n-slider v-model:value="ghostOpacity" :min="0.1" :max="0.8" :step="0.05" :tooltip="false" />
							</label>
						</template>

						<div class="pe-row">
							<n-button size="tiny" quaternary @click="resetAlignment">Reset</n-button>
							<n-button v-if="ghost" size="tiny" quaternary @click="matchPrevious">Copy previous framing</n-button>
							<n-button v-if="isNew" size="tiny" quaternary @click="pick">Choose another</n-button>
						</div>
					</div>
				</div>
			</template>

			<p v-if="loadError" class="pe-error">{{ loadError }}</p>

			<div class="pe-form">
				<div class="pe-field">
					<span class="pe-lbl">Pose</span>
					<div class="pe-poses">
						<button
							v-for="p in POSES"
							:key="p.key"
							class="pe-pose"
							:class="{ active: form.pose === p.key }"
							@click="form.pose = p.key"
						>{{ p.label }}</button>
					</div>
				</div>

				<label class="pe-field">
					<span class="pe-lbl">Taken on</span>
					<n-date-picker
						v-model:formatted-value="form.date"
						value-format="yyyy-MM-dd"
						type="date"
						size="small"
						:is-date-disabled="dateDisabled"
					/>
				</label>

				<label class="pe-field">
					<span class="pe-lbl">Weight (kg)</span>
					<n-input-number
						v-model:value="form.weight"
						:min="20"
						:max="400"
						:step="0.1"
						:precision="1"
						size="small"
						clearable
						placeholder="Optional"
						@update:value="weightTouched = true"
					/>
				</label>

				<label class="pe-field pe-wide">
					<span class="pe-lbl">Note</span>
					<input v-model="form.note" class="pe-input" maxlength="140" placeholder="Optional — e.g. end of cut, morning, fasted" />
				</label>
			</div>

			<p class="pe-privacy">
				Only you can see your photos. They're stored privately, and location data is removed from
				the file before upload.
			</p>

			<div class="pe-actions">
				<n-popconfirm v-if="!isNew" placement="top" @positive-click="remove">
					<template #trigger>
						<n-button size="small" type="error" quaternary :disabled="saving">Delete</n-button>
					</template>
					Delete this photo permanently?
				</n-popconfirm>
				<span class="pe-spacer"></span>
				<n-button size="small" @click="emit('update:show', false)">Cancel</n-button>
				<n-button type="primary" size="small" :disabled="!canSave" :loading="saving" @click="save">
					{{ isNew ? 'Save photo' : 'Save changes' }}
				</n-button>
			</div>
		</div>
	</CustomModal>
</template>

<style scoped>
.pe { display: flex; flex-direction: column; gap: 14px; }

.pe-drop {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 34px 20px;
	border: 1.5px dashed var(--border-strong);
	border-radius: var(--radius);
	background: var(--surface-2);
	color: var(--text-color);
	font: inherit;
	cursor: pointer;
	text-align: center;
}
.pe-drop:hover { border-color: var(--primary-color); background: var(--primary-soft); }
.pe-drop-icon { font-size: 2rem; color: var(--primary-color); }
.pe-drop-title { font-weight: 600; }
.pe-drop-sub { font-size: 0.78rem; color: var(--text-muted); max-width: 300px; line-height: 1.5; }

.pe-align { display: grid; grid-template-columns: minmax(0, 240px) 1fr; gap: 16px; align-items: start; }
.pe-frame {
	position: relative;
	aspect-ratio: 3 / 4;
	border-radius: var(--radius-sm);
	overflow: hidden;
	background: var(--background-color);
	border: 1px solid var(--border-color);
}
.pe-canvas {
	display: block;
	width: 100%;
	height: 100%;
	cursor: grab;
	/* Let the canvas own the gesture, so a drag doesn't scroll the dialog. */
	touch-action: none;
}
.pe-canvas:active { cursor: grabbing; }
.pe-grid { position: absolute; inset: 0; pointer-events: none; }
.pe-grid i { position: absolute; background: rgba(255, 255, 255, 0.14); }
.pe-grid i:nth-child(1) { left: 33.33%; top: 0; bottom: 0; width: 1px; }
.pe-grid i:nth-child(2) { left: 66.66%; top: 0; bottom: 0; width: 1px; }
.pe-grid i:nth-child(3) { top: 33.33%; left: 0; right: 0; height: 1px; }
.pe-grid i:nth-child(4) { top: 66.66%; left: 0; right: 0; height: 1px; }

.pe-tools { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.pe-hint { margin: 0; font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary); }
.pe-check { display: flex; align-items: center; gap: 7px; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; }
.pe-row { display: flex; flex-wrap: wrap; gap: 4px; }

.pe-error {
	margin: 0;
	padding: 8px 11px;
	border-radius: var(--radius-sm);
	background: var(--danger-soft);
	color: var(--danger-color);
	font-size: 0.8rem;
	line-height: 1.5;
}

.pe-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pe-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.pe-wide { grid-column: 1 / -1; }
.pe-lbl {
	font-size: 0.68rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}
.pe-poses { display: flex; gap: 4px; }
.pe-pose {
	flex: 1;
	font: inherit;
	font-size: 0.8rem;
	padding: 5px 0;
	border-radius: var(--radius-sm);
	border: 1px solid var(--border-color);
	background: var(--surface-2);
	color: var(--text-secondary);
	cursor: pointer;
}
.pe-pose.active { border-color: var(--primary-color); background: var(--primary-soft); color: var(--primary-color); }
.pe-input {
	font: inherit;
	font-size: 0.85rem;
	padding: 6px 10px;
	border-radius: var(--radius-sm);
	border: 1px solid var(--border-color);
	background: var(--surface-2);
	color: var(--text-color);
}
.pe-input:focus { outline: none; border-color: var(--primary-color); }

.pe-privacy { margin: 0; font-size: 0.74rem; line-height: 1.5; color: var(--text-muted); }

.pe-actions { display: flex; align-items: center; gap: 8px; }
.pe-spacer { flex: 1; }

@media (max-width: 600px) {
	.pe-align { grid-template-columns: 1fr; }
	.pe-frame { max-width: 280px; width: 100%; margin: 0 auto; }
	.pe-form { grid-template-columns: 1fr 1fr; }
	.pe-form > .pe-field:first-child { grid-column: 1 / -1; }
	/* Below 16px iOS zooms the page on focus. */
	.pe-input { font-size: 16px; }
}
</style>
