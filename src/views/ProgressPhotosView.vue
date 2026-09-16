<script setup lang="ts">
/**
 * Progress photos: take them, line them up, watch them change.
 *
 * Laid out in the order you'd use it: the timelapse first (the reason to take
 * the photos at all), then a before/after you can point at any two dates, then
 * every photo in a grid to fix one up or delete it.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NIcon, NProgress, NSelect, useMessage } from 'naive-ui'
import {
	AddOutline, ArrowBackOutline, CameraOutline, ChevronBackOutline, ChevronForwardOutline,
	CalendarOutline, CheckmarkCircle, DownloadOutline, EllipseOutline, LockClosedOutline, PauseOutline, PlayOutline,
} from '@vicons/ionicons5'
import { format, parseISO } from 'date-fns'
import PhotoEditor from '@/components/PhotoEditor.vue'
import AlignedPhoto from '@/components/AlignedPhoto.vue'
import PhotoGuide from '@/components/PhotoGuide.vue'
import EmptyState from '@/components/stats/EmptyState.vue'
import SectionHead from '@/components/stats/SectionHead.vue'
import {
	bitmapFor, loadPhotos, photos, photosError, photosLoaded, photosLoading,
} from '@/photos'
import { dailyWeights, loadStats, loaded as statsLoaded } from '@/stats'
import { MISSING_PHOTOS } from '@/db'
import { isOwner, GENERIC_SCHEMA_MESSAGE } from '@/owner'
import {
	POSES, SPEEDS, compare, dueLabel, exportFilename, extensionFor, frameDurations, frameLabel, framesFor,
	nextPhotoDue, normaliseAlignment, timelapseReadiness, MIN_TIMELAPSE_PHOTOS, MIN_TIMELAPSE_SPAN_DAYS,
	type Pose, type SpeedKey,
} from '@/utils/progressPhotos'
import {
	ExportAbortedError, drawFrame, exportGif, exportVideo, frameSize, saveFile, videoMime,
	type TimelapseFrame,
} from '@/utils/timelapse'
import type { ProgressPhoto } from '@/types'

const route = useRoute()
const router = useRouter()
const message = useMessage()

// ─── data ─────────────────────────────────────────────────────────────────────

onMounted(() => {
	loadPhotos()
	if (!statsLoaded.value) loadStats()
})

const missingMigration = computed(() => (photosError.value as Error | null)?.message === MISSING_PHOTOS)
const loadFailed = computed(() => !!photosError.value && !missingMigration.value)

/** The pose lives in the URL, like Home's tabs, so a reload keeps your place. */
const pose = computed<Pose>(() => {
	const q = String(route.query.pose || '')
	return POSES.some(p => p.key === q) ? (q as Pose) : 'front'
})
const setPose = (p: Pose) => router.replace({ query: { ...route.query, pose: p === 'front' ? undefined : p } })

const counts = computed(() =>
	Object.fromEntries(POSES.map(p => [p.key, framesFor(photos.value, p.key).length])) as Record<Pose, number>)

const frames = computed(() => framesFor(photos.value, pose.value))

/** Whether this pose has enough photos, over enough time, to be worth exporting. */
const readiness = computed(() => timelapseReadiness(frames.value))
const due = computed(() => nextPhotoDue(frames.value))
const dueClass = computed(() => (due.value && due.value.inDays <= 0 ? 'due-now' : ''))
const spanWeeks = computed(() => Math.floor(readiness.value.spanDays / 7))

const alignmentOf = (p: ProgressPhoto) =>
	normaliseAlignment({ scale: p.align_scale, x: p.align_x, y: p.align_y })

// ─── editor ───────────────────────────────────────────────────────────────────

const editorOpen = ref(false)
const editing = shallowRef<ProgressPhoto | null>(null)

function addNew() {
	editing.value = null
	editorOpen.value = true
}

function edit(p: ProgressPhoto) {
	editing.value = p
	editorOpen.value = true
}

async function onSaved(created: ProgressPhoto | null) {
	if (!created) return redraw()
	// Jump to the pose you just added to, and show the new photo.
	if (created.pose !== pose.value) await setPose(created.pose)
	await nextTick()
	const at = frames.value.findIndex(f => f.id === created.id)
	index.value = at >= 0 ? at : frames.value.length - 1
	compareB.value = null
	redraw()
}

// ─── player ───────────────────────────────────────────────────────────────────

const stage = ref<HTMLCanvasElement | null>(null)
const index = ref(0)
const playing = ref(false)
const speed = ref<SpeedKey>('normal')
const captions = ref(true)
const preloading = ref(0)

const current = computed(() => frames.value[Math.min(index.value, frames.value.length - 1)] ?? null)
const speedSeconds = computed(() => SPEEDS.find(s => s.key === speed.value)!.seconds)

let timer: ReturnType<typeof setTimeout> | null = null
let drawToken = 0

async function redraw() {
	const c = stage.value
	const f = current.value
	if (!c || !f) return
	const token = ++drawToken
	let image: ImageBitmap
	try {
		image = await bitmapFor(f.path)
	} catch {
		return
	}
	// A later frame may have been asked for while this one was downloading.
	if (token !== drawToken) return
	const dpr = window.devicePixelRatio || 1
	const w = Math.round(c.clientWidth * dpr)
	const h = Math.round(c.clientHeight * dpr)
	if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h })
	drawFrame(c.getContext('2d')!, image, alignmentOf(f), { label: captions.value ? frameLabel(f) : undefined })
}

function stop() {
	playing.value = false
	if (timer) clearTimeout(timer)
	timer = null
}

function tick() {
	const durations = frameDurations(frames.value.length, speedSeconds.value)
	const hold = durations[Math.min(index.value, durations.length - 1)] ?? 500
	timer = setTimeout(() => {
		if (!playing.value) return
		// Loop back to the start after holding on the latest photo.
		index.value = index.value >= frames.value.length - 1 ? 0 : index.value + 1
		tick()
	}, hold)
}

function togglePlay() {
	if (playing.value) return stop()
	if (frames.value.length < 2) return
	if (index.value >= frames.value.length - 1) index.value = 0
	playing.value = true
	tick()
}

function step(by: number) {
	stop()
	index.value = Math.max(0, Math.min(frames.value.length - 1, index.value + by))
}

/**
 * Decode every frame of the pose up front. Playback that stalls on each new
 * photo while it downloads isn't a timelapse.
 */
async function preload() {
	const list = frames.value
	preloading.value = 0
	let done = 0
	await Promise.all(list.map(f => bitmapFor(f.path).catch(() => null).finally(() => {
		done++
		preloading.value = done / list.length
	})))
}

// A new pose opens on its latest photo.
watch(pose, async () => {
	stop()
	compareA.value = null
	compareB.value = null
	await nextTick()
	index.value = Math.max(0, frames.value.length - 1)
})

watch(frames, (list, old) => {
	// First load opens on the latest photo; afterwards just keep the index valid.
	if (!old?.length) index.value = Math.max(0, list.length - 1)
	else if (index.value >= list.length) index.value = Math.max(0, list.length - 1)
	preload()
}, { immediate: true })

watch([current, captions, stage], () => redraw())

onBeforeUnmount(() => {
	stop()
	exportAbort?.abort()
	resizeObserver?.disconnect()
})

let resizeObserver: ResizeObserver | null = null
watch(stage, el => {
	resizeObserver?.disconnect()
	if (!el) return
	resizeObserver = new ResizeObserver(() => redraw())
	resizeObserver.observe(el)
})

// ─── compare ──────────────────────────────────────────────────────────────────

/** Ids of the two photos to compare. Null means first / latest. */
const compareA = ref<number | null>(null)
const compareB = ref<number | null>(null)

const before = computed(() => frames.value.find(f => f.id === compareA.value) ?? frames.value[0] ?? null)
const after = computed(() => frames.value.find(f => f.id === compareB.value) ?? frames.value[frames.value.length - 1] ?? null)
const comparison = computed(() => (before.value && after.value ? compare(before.value, after.value) : null))

/** Short labels — two pickers side by side on a phone have about 150px each. */
const frameOptions = computed(() =>
	frames.value.map(f => ({
		label: `${format(parseISO(f.taken_on), 'd MMM yy')}${typeof f.weight_kg === 'number' ? ` · ${f.weight_kg.toFixed(1)}` : ''}`,
		value: f.id,
	})))
const shortLabel = (f: ProgressPhoto) => frameOptions.value.find(o => o.value === f.id)?.label ?? f.taken_on

// ─── export ───────────────────────────────────────────────────────────────────

const exporting = ref<'video' | 'gif' | null>(null)
const exportProgress = ref(0)
let exportAbort: AbortController | null = null
const canRecordVideo = typeof window !== 'undefined' && videoMime() !== null

async function exportAs(kind: 'video' | 'gif') {
	if (exporting.value || !readiness.value.ready) return
	stop()
	exporting.value = kind
	exportProgress.value = 0
	exportAbort = new AbortController()
	try {
		const list: TimelapseFrame[] = []
		for (const f of frames.value) {
			list.push({ image: await bitmapFor(f.path), alignment: alignmentOf(f), taken_on: f.taken_on, weight_kg: f.weight_kg })
		}
		const opts = {
			seconds: speedSeconds.value,
			// GIFs are 256 colours a frame and grow fast, so they're made smaller.
			width: kind === 'gif' ? 360 : 720,
			captions: captions.value,
			onProgress: (p: number) => { exportProgress.value = p },
			signal: exportAbort.signal,
		}
		const first = frames.value[0].taken_on
		const last = frames.value[frames.value.length - 1].taken_on
		let blob: Blob
		let ext: string
		if (kind === 'video') {
			const out = await exportVideo(list, opts)
			blob = out.blob
			ext = extensionFor(out.mime)
		} else {
			blob = await exportGif(list, opts)
			ext = 'gif'
		}
		const how = await saveFile(blob, exportFilename(pose.value, first, last, ext))
		if (how === 'downloaded') message.success(`Saved ${ext.toUpperCase()} (${(blob.size / 1024 / 1024).toFixed(1)} MB).`)
	} catch (e) {
		if (!(e instanceof ExportAbortedError)) {
			console.error('Timelapse export failed', e)
			message.error((e as Error).message || "Couldn't make the timelapse.")
		}
	} finally {
		exporting.value = null
		exportAbort = null
	}
}

const cancelExport = () => exportAbort?.abort()

// ─── labels ───────────────────────────────────────────────────────────────────

const span = computed(() => {
	const f = frames.value
	if (f.length < 2) return ''
	return `${format(parseISO(f[0].taken_on), 'd MMM yyyy')} – ${format(parseISO(f[f.length - 1].taken_on), 'd MMM yyyy')}`
})

const clipLength = computed(() => {
	const ms = frameDurations(frames.value.length, speedSeconds.value).reduce((a, b) => a + b, 0)
	return `${Math.round(ms / 100) / 10} s`
})

const exportSize = frameSize(720)
</script>

<template>
	<div class="photos-view">
		<header class="pv-head">
			<router-link :to="{ name: 'Home', query: { tab: 'body' } }" class="pv-back">
				<n-icon :component="ArrowBackOutline" /> Body
			</router-link>
			<div class="pv-title-row">
				<h1 class="page-title">Progress photos</h1>
				<n-button v-if="!missingMigration" type="primary" @click="addNew">
					<template #icon><n-icon :component="AddOutline" /></template>
					Add photo
				</n-button>
			</div>
			<p v-if="photosLoaded && photos.length" class="pv-due" :class="dueClass">
				<n-icon :component="CalendarOutline" /> {{ dueLabel(due) }}
				<span class="pv-due-pose">· {{ pose }}</span>
			</p>
			<p class="pv-sub">
				<n-icon :component="LockClosedOutline" />
				Private to you. Stored without location data, and never visible to other accounts.
			</p>
		</header>

		<div v-if="missingMigration" class="pv-banner">
			<template v-if="isOwner">
				Progress photos need a one-off database update. Run
				<code>supabase_progress_photos.sql</code> in the Supabase SQL editor, then reload.
			</template>
			<template v-else>{{ GENERIC_SCHEMA_MESSAGE }}</template>
		</div>

		<div v-else-if="loadFailed" class="pv-banner">
			Couldn't load your photos. Check your connection and
			<button class="stat-link-btn" @click="loadPhotos(true)">try again</button>.
		</div>

		<template v-else-if="photosLoaded">
			<PhotoGuide :open="!photos.length" />

			<EmptyState
				v-if="!photos.length"
				:icon="CameraOutline"
				title="Start your timelapse"
				:body="`Take a photo today, then one a week. After ${MIN_TIMELAPSE_PHOTOS} photos over ${MIN_TIMELAPSE_SPAN_DAYS / 7} weeks you'll have a timelapse that shows what the scale can't. The guide above has the habits that make it work.`"
			>
				<n-button type="primary" size="small" class="pv-empty-btn" @click="addNew">Add your first photo</n-button>
			</EmptyState>

			<template v-else>
				<nav class="tabbar" role="tablist">
					<button
						v-for="p in POSES"
						:key="p.key"
						role="tab"
						:aria-selected="pose === p.key"
						:class="{ active: pose === p.key }"
						@click="setPose(p.key)"
					>
						{{ p.label }}<span class="pv-count">{{ counts[p.key] }}</span>
					</button>
				</nav>

				<EmptyState
					v-if="!frames.length"
					bare
					:icon="CameraOutline"
					:title="`No ${pose} photos yet`"
					body="Each pose gets its own timelapse, so the frames always match."
				>
					<n-button size="small" class="pv-empty-btn" @click="addNew">Add a {{ pose }} photo</n-button>
				</EmptyState>

				<template v-else>
					<!-- ─── timelapse ─────────────────────────────────────────── -->
					<SectionHead title="Timelapse" :note="span || 'one photo so far'" />

					<div v-if="!readiness.ready" class="panel pv-ready">
						<div class="pv-ready-head">
							<strong>Building your {{ pose }} timelapse</strong>
							<span>{{ readiness.message }}</span>
						</div>
						<ul class="pv-ready-list">
							<li :class="{ met: readiness.photosLeft === 0 }">
								<n-icon :component="readiness.photosLeft === 0 ? CheckmarkCircle : EllipseOutline" />
								<span class="pv-ready-lbl">{{ MIN_TIMELAPSE_PHOTOS }} photos</span>
								<span class="pv-ready-bar"><i :style="{ width: Math.min(100, (readiness.count / MIN_TIMELAPSE_PHOTOS) * 100) + '%' }"></i></span>
								<span class="pv-ready-val mono">{{ Math.min(readiness.count, MIN_TIMELAPSE_PHOTOS) }}/{{ MIN_TIMELAPSE_PHOTOS }}</span>
							</li>
							<li :class="{ met: readiness.daysLeft === 0 }">
								<n-icon :component="readiness.daysLeft === 0 ? CheckmarkCircle : EllipseOutline" />
								<span class="pv-ready-lbl">{{ MIN_TIMELAPSE_SPAN_DAYS / 7 }} weeks, first to latest</span>
								<span class="pv-ready-bar"><i :style="{ width: Math.min(100, (readiness.spanDays / MIN_TIMELAPSE_SPAN_DAYS) * 100) + '%' }"></i></span>
								<span class="pv-ready-val mono">{{ Math.min(spanWeeks, MIN_TIMELAPSE_SPAN_DAYS / 7) }}/{{ MIN_TIMELAPSE_SPAN_DAYS / 7 }}</span>
							</li>
						</ul>
						<p class="pv-ready-foot">
							You can preview below in the meantime — it's the best way to check your photos line up.
							Saving as video or GIF unlocks once both are done.
						</p>
					</div>
					<section class="panel pv-player">
						<div class="pv-stage-wrap">
							<canvas ref="stage" class="pv-stage"></canvas>
							<div v-if="preloading < 1 && frames.length > 1" class="pv-loading">
								<n-progress type="line" :percentage="Math.round(preloading * 100)" :show-indicator="false" :height="3" />
							</div>
						</div>

						<div class="pv-controls">
							<div class="pv-transport">
								<button class="pv-btn" aria-label="Previous photo" :disabled="index <= 0" @click="step(-1)">
									<n-icon :component="ChevronBackOutline" />
								</button>
								<button
									class="pv-btn pv-play"
									:aria-label="playing ? 'Pause' : 'Play'"
									:disabled="frames.length < 2"
									@click="togglePlay"
								>
									<n-icon :component="playing ? PauseOutline : PlayOutline" />
								</button>
								<button
									class="pv-btn"
									aria-label="Next photo"
									:disabled="index >= frames.length - 1"
									@click="step(1)"
								>
									<n-icon :component="ChevronForwardOutline" />
								</button>
								<span class="pv-pos mono">{{ Math.min(index, frames.length - 1) + 1 }} / {{ frames.length }}</span>
							</div>

							<input
								v-if="frames.length > 1"
								class="pv-scrub"
								type="range"
								:min="0"
								:max="frames.length - 1"
								:value="Math.min(index, frames.length - 1)"
								aria-label="Scrub through photos"
								@input="stop(); index = Number(($event.target as HTMLInputElement).value)"
							/>

							<div class="pv-options">
								<div class="pv-chips">
									<button
										v-for="s in SPEEDS"
										:key="s.key"
										class="pv-chip"
										:class="{ active: speed === s.key }"
										@click="speed = s.key"
									>{{ s.label }}</button>
								</div>
								<label class="pv-check"><input v-model="captions" type="checkbox" /> Date &amp; weight</label>
							</div>

							<div v-if="current" class="pv-current">
								<span>{{ frameLabel(current) }}</span>
								<span v-if="current.note" class="pv-note">“{{ current.note }}”</span>
								<button class="stat-link-btn" @click="edit(current)">Adjust</button>
							</div>

							<div class="pv-export">
								<template v-if="exporting">
									<div class="pv-export-progress">
										<span>Making {{ exporting === 'gif' ? 'GIF' : 'video' }}…</span>
										<n-progress type="line" :percentage="Math.round(exportProgress * 100)" :height="6" />
									</div>
									<n-button size="small" quaternary @click="cancelExport">Cancel</n-button>
								</template>
								<template v-else>
									<n-button
										v-if="canRecordVideo"
										size="small"
										:disabled="!readiness.ready"
										@click="exportAs('video')"
									>
										<template #icon><n-icon :component="DownloadOutline" /></template>
										Video
									</n-button>
									<n-button size="small" :disabled="!readiness.ready" @click="exportAs('gif')">
										<template #icon><n-icon :component="DownloadOutline" /></template>
										GIF
									</n-button>
									<span class="pv-export-note">
										<template v-if="!readiness.ready">
											<n-icon :component="LockClosedOutline" /> Unlocks at {{ MIN_TIMELAPSE_PHOTOS }} photos over {{ MIN_TIMELAPSE_SPAN_DAYS / 7 }} weeks
										</template>
										<template v-else>
											{{ clipLength }}<template v-if="canRecordVideo"> · video {{ exportSize.width }}×{{ exportSize.height }}, recorded in real time</template>
										</template>
									</span>
								</template>
							</div>
						</div>
					</section>

					<!-- ─── before / after ────────────────────────────────────── -->
					<template v-if="frames.length >= 2 && before && after && comparison">
						<SectionHead title="Before &amp; after" :note="comparison.summary" />
						<section class="panel pv-compare">
							<div class="pv-side">
								<n-select v-model:value="compareA" :options="frameOptions" size="small" :placeholder="shortLabel(before)" />
								<AlignedPhoto :photo="before" :alt="`Photo from ${before.taken_on}`" class="pv-cmp-img" />
							</div>
							<div class="pv-side">
								<n-select v-model:value="compareB" :options="frameOptions" size="small" :placeholder="shortLabel(after)" />
								<AlignedPhoto :photo="after" :alt="`Photo from ${after.taken_on}`" class="pv-cmp-img" />
							</div>
							<div v-if="comparison.weightDelta !== null" class="pv-delta">
								<span class="pv-delta-val mono" :class="{ down: comparison.weightDelta < 0 }">
									{{ comparison.weightDelta > 0 ? '+' : comparison.weightDelta < 0 ? '−' : '' }}{{ Math.abs(comparison.weightDelta).toFixed(1) }} kg
								</span>
								<span class="pv-delta-lbl">over {{ comparison.days }} days</span>
							</div>
						</section>
					</template>

					<!-- ─── every photo ───────────────────────────────────────── -->
					<SectionHead title="All photos" :note="`${frames.length} ${pose}`" />
					<section class="pv-grid">
						<button
							v-for="(f, i) in frames"
							:key="f.id"
							class="pv-thumb"
							:class="{ active: i === Math.min(index, frames.length - 1) }"
							@click="stop(); index = i"
							@dblclick="edit(f)"
						>
							<AlignedPhoto :photo="f" :alt="`Photo from ${f.taken_on}`" />
							<span class="pv-thumb-date">{{ format(parseISO(f.taken_on), 'd MMM yy') }}</span>
							<span v-if="f.weight_kg" class="pv-thumb-kg mono">{{ f.weight_kg.toFixed(1) }}</span>
						</button>
					</section>
					<p class="stat-note">Tap a photo to jump the timelapse to it; use <em>Adjust</em> to re-align, re-date or delete it.</p>
				</template>
			</template>
		</template>

		<div v-else-if="photosLoading" class="pv-loading-page">Loading photos…</div>

		<PhotoEditor
			v-model:show="editorOpen"
			:photo="editing"
			:photos="photos"
			:weights="dailyWeights"
			:default-pose="pose"
			@saved="onSaved"
		/>
	</div>
</template>

<style scoped>
.photos-view {
	max-width: 900px;
	margin: 0 auto;
	padding: 24px 28px 40px;
	box-sizing: border-box;
}
@media (max-width: 768px) { .photos-view { padding: 16px 16px 32px; } }

.pv-head { margin-bottom: 18px; }
.pv-back {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 0.8rem;
	color: var(--text-muted);
	margin-bottom: 8px;
}
.pv-back:hover { color: var(--text-color); }
.pv-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pv-due {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin: 8px 0 0;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--surface-2);
	font-size: 0.78rem;
	color: var(--text-secondary);
}
.pv-due.due-now { background: var(--primary-soft); color: var(--primary-color); font-weight: 600; }
.pv-due-pose { color: var(--text-muted); font-weight: 400; }

.pv-ready { padding: 14px 16px; margin-bottom: 12px; border-left: 2px solid var(--primary-color); }
.pv-ready-head { display: flex; flex-direction: column; gap: 3px; }
.pv-ready-head strong { font-size: 0.9rem; }
.pv-ready-head span { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; }
.pv-ready-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pv-ready-list li {
	display: grid;
	grid-template-columns: 18px minmax(0, 170px) 1fr auto;
	align-items: center;
	gap: 10px;
	font-size: 0.8rem;
	color: var(--text-secondary);
}
.pv-ready-list li .n-icon { color: var(--text-muted); }
.pv-ready-list li.met .n-icon { color: var(--success-color); }
.pv-ready-bar { height: 5px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.pv-ready-bar i { display: block; height: 100%; border-radius: inherit; background: var(--primary-color); }
.pv-ready-list li.met .pv-ready-bar i { background: var(--success-color); }
.pv-ready-val { font-size: 0.78rem; color: var(--text-color); }
.pv-ready-foot { margin: 12px 0 0; font-size: 0.76rem; line-height: 1.5; color: var(--text-muted); }
.pv-export-note .n-icon { vertical-align: -2px; }

.pv-sub {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 6px 0 0;
	font-size: 0.78rem;
	color: var(--text-muted);
}

.pv-banner {
	padding: 12px 14px;
	border-radius: var(--radius-sm);
	background: var(--warning-soft);
	color: var(--warning-color);
	font-size: 0.85rem;
	line-height: 1.5;
}
.pv-banner code { font-family: ui-monospace, monospace; font-size: 0.8rem; }
.pv-empty-btn { margin-top: 6px; }
.pv-loading-page { color: var(--text-muted); font-size: 0.85rem; padding: 30px 0; text-align: center; }

.tabbar {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid var(--border-color);
	margin-bottom: 18px;
}
.tabbar button {
	font: inherit;
	font-size: 0.9rem;
	padding: 8px 14px;
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	color: var(--text-secondary);
	cursor: pointer;
}
.tabbar button:hover { color: var(--text-color); }
.tabbar button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
.pv-count {
	margin-left: 6px;
	font-size: 0.7rem;
	padding: 0 6px;
	border-radius: 999px;
	background: var(--surface-2);
	color: var(--text-muted);
}

.panel {
	background: var(--surface-color);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
	box-shadow: var(--shadow-card);
	margin-bottom: 8px;
}

/* ─── player ─── */
.pv-player { display: grid; grid-template-columns: minmax(0, 320px) 1fr; gap: 20px; padding: 16px; }
.pv-stage-wrap {
	position: relative;
	aspect-ratio: 3 / 4;
	border-radius: var(--radius-sm);
	overflow: hidden;
	background: var(--background-color);
}
.pv-stage { display: block; width: 100%; height: 100%; }
.pv-loading { position: absolute; left: 10px; right: 10px; bottom: 10px; }

.pv-controls { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.pv-transport { display: flex; align-items: center; gap: 6px; }
.pv-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	border: 1px solid var(--border-color);
	background: var(--surface-2);
	color: var(--text-color);
	font-size: 1rem;
	cursor: pointer;
}
.pv-btn:hover:not(:disabled) { background: var(--surface-hover); }
.pv-btn:disabled { opacity: 0.4; cursor: default; }
.pv-play {
	width: 44px;
	height: 44px;
	font-size: 1.2rem;
	background: var(--primary-fill);
	border-color: var(--primary-fill);
	color: #fff;
}
.pv-play:hover:not(:disabled) { background: var(--primary-fill-hover); }
.pv-pos { margin-left: 8px; font-size: 0.8rem; color: var(--text-muted); }

.pv-scrub { width: 100%; accent-color: var(--primary-color); }

.pv-options { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.pv-chips { display: flex; gap: 4px; }
.pv-chip {
	font: inherit;
	font-size: 0.75rem;
	padding: 4px 10px;
	border-radius: 999px;
	border: 1px solid var(--border-color);
	background: transparent;
	color: var(--text-secondary);
	cursor: pointer;
}
.pv-chip.active { background: var(--primary-soft); border-color: var(--primary-color); color: var(--primary-color); }
.pv-check { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--text-secondary); cursor: pointer; }

.pv-current {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 8px;
	font-size: 0.85rem;
	padding-top: 12px;
	border-top: 1px solid var(--border-subtle);
}
.pv-note { color: var(--text-muted); font-style: italic; }

.pv-export {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: auto;
	padding-top: 12px;
	border-top: 1px solid var(--border-subtle);
}
.pv-export-note { font-size: 0.72rem; color: var(--text-muted); }
.pv-export-progress { flex: 1; display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--text-secondary); }

/* ─── compare ─── */
.pv-compare {
	display: grid;
	/* Capped so two 3:4 photos side by side stay on one screen. */
	grid-template-columns: repeat(2, minmax(0, 260px));
	justify-content: center;
	gap: 14px;
	padding: 16px;
}
.pv-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pv-cmp-img { border-radius: var(--radius-sm); }
.pv-delta {
	grid-column: 1 / -1;
	display: flex;
	align-items: baseline;
	justify-content: center;
	gap: 8px;
	padding-top: 4px;
}
.pv-delta-val { font-size: 1.3rem; font-weight: 700; }
.pv-delta-lbl { font-size: 0.78rem; color: var(--text-muted); }

/* ─── grid ─── */
.pv-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
	gap: 10px;
}
.pv-thumb {
	position: relative;
	padding: 0;
	border: 2px solid transparent;
	border-radius: var(--radius-sm);
	overflow: hidden;
	background: none;
	cursor: pointer;
}
.pv-thumb.active { border-color: var(--primary-color); }
.pv-thumb-date, .pv-thumb-kg {
	position: absolute;
	bottom: 5px;
	font-size: 0.66rem;
	padding: 1px 6px;
	border-radius: 999px;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
}
.pv-thumb-date { left: 5px; }
.pv-thumb-kg { right: 5px; }

@media (max-width: 640px) {
	.pv-ready-list li { grid-template-columns: 18px 1fr auto; }
	.pv-ready-bar { grid-column: 2 / -1; grid-row: 2; }
	.pv-player { grid-template-columns: 1fr; padding: 12px; gap: 14px; }
	/* Short enough that play, the scrubber and export stay on the first screen. */
	.pv-stage-wrap { max-width: 250px; width: 100%; margin: 0 auto; }
	.pv-grid { grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
	.pv-compare { padding: 12px; gap: 10px; }
	.pv-title-row .page-title { font-size: 1.35rem; }
}
</style>
