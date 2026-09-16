/**
 * Reactive store for progress photos.
 *
 * Signed URLs expire, so they're cached with a timestamp and re-signed in one
 * batch when they're close to running out. Decoded images are cached too — the
 * player and the exporters redraw the same frames many times over.
 *
 * Everything here is dropped on sign-out (`resetPhotos`). These are the most
 * private pictures in the app; one account's must never linger in memory for
 * the next person to use the same browser.
 */
import { computed, reactive, ref } from 'vue'
import { db } from './db'
import type { ProgressPhoto, ProgressPhotoMeta } from './types'

/** Signed URLs live for an hour; re-sign with ten minutes to spare. */
const URL_TTL_MS = 60 * 60 * 1000
const URL_REFRESH_MS = 50 * 60 * 1000

export const photos = ref<ProgressPhoto[]>([])
export const photosLoaded = ref(false)
export const photosLoading = ref(false)
/** Set when the table or bucket is missing — the migration hasn't been run. */
export const photosError = ref<unknown>(null)

const urls = reactive<Record<string, { url: string; at: number }>>({})
const bitmaps = new Map<string, Promise<ImageBitmap>>()

export const photoCount = computed(() => photos.value.length)

export async function loadPhotos(force = false): Promise<void> {
	if (photosLoading.value || (photosLoaded.value && !force)) return
	photosLoading.value = true
	try {
		photos.value = await db.getProgressPhotos()
		photosError.value = null
		await signUrls(photos.value.map(p => p.path))
	} catch (e) {
		photosError.value = e
		photos.value = []
	} finally {
		photosLoaded.value = true
		photosLoading.value = false
	}
}

/** Make sure every path has a usable signed URL, signing any stale ones together. */
export async function signUrls(paths: string[]): Promise<void> {
	const now = Date.now()
	const stale = paths.filter(p => !urls[p] || now - urls[p].at > URL_REFRESH_MS)
	if (!stale.length) return
	const signed = await db.signProgressPhotos(stale, URL_TTL_MS / 1000)
	for (const [path, url] of Object.entries(signed)) urls[path] = { url, at: now }
}

/** The signed URL for a photo, or null if it hasn't been signed (yet). */
export const urlFor = (path: string): string | null => urls[path]?.url ?? null

/**
 * The decoded image for a photo, fetched once and kept.
 *
 * Fetched as a blob rather than drawn from the URL directly, so the canvas is
 * never tainted and the exporters can read it back.
 */
export function bitmapFor(path: string): Promise<ImageBitmap> {
	const hit = bitmaps.get(path)
	if (hit) return hit
	const job = (async () => {
		await signUrls([path])
		const url = urlFor(path)
		if (!url) throw new Error('Could not get a link to this photo.')
		const res = await fetch(url)
		if (!res.ok) throw new Error(`Photo download failed (${res.status}).`)
		return createImageBitmap(await res.blob())
	})()
	// A failed fetch shouldn't be cached forever — let the next call retry.
	job.catch(() => bitmaps.delete(path))
	bitmaps.set(path, job)
	return job
}

export async function addPhoto(image: Blob, size: { width: number; height: number }, meta: ProgressPhotoMeta): Promise<ProgressPhoto> {
	const created = await db.addProgressPhoto(image, size, meta)
	photos.value = [...photos.value, created].sort((a, b) => a.taken_on.localeCompare(b.taken_on))
	await signUrls([created.path])
	return created
}

export async function updatePhoto(id: number, patch: Partial<ProgressPhotoMeta>): Promise<void> {
	await db.updateProgressPhoto(id, patch)
	photos.value = photos.value
		.map(p => (p.id === id ? { ...p, ...patch } : p))
		.sort((a, b) => a.taken_on.localeCompare(b.taken_on))
}

export async function deletePhoto(photo: ProgressPhoto): Promise<void> {
	await db.deleteProgressPhoto(photo)
	photos.value = photos.value.filter(p => p.id !== photo.id)
	forget(photo.path)
}

function forget(path: string) {
	delete urls[path]
	const job = bitmaps.get(path)
	bitmaps.delete(path)
	job?.then(b => b.close()).catch(() => {})
}

/** Drop every photo, link and decoded image. Call on sign-out and account switch. */
export function resetPhotos(): void {
	for (const path of [...Object.keys(urls), ...bitmaps.keys()]) forget(path)
	photos.value = []
	photosLoaded.value = false
	photosError.value = null
}
