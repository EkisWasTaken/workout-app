/**
 * Drawing and exporting progress-photo timelapses.
 *
 * Browser-only: canvas, MediaRecorder, image decoding. The arithmetic these
 * rely on — alignment, timing, format choice — lives in `progressPhotos.ts`,
 * where it can be tested without a DOM.
 *
 * Two exports, for two jobs:
 *
 *   Video (MediaRecorder) — full colour, small files, plays on any phone.
 *                           Records in real time, so an 8-second clip takes
 *                           about 8 seconds to make.
 *   GIF (gifenc)          — plays anywhere a picture does, including chats that
 *                           won't autoplay video. 256 colours per frame and no
 *                           dithering, so skin tones band a little; it's drawn
 *                           smaller to keep the file sensible.
 */
import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import {
	FRAME_ASPECT, MAX_UPLOAD_EDGE, drawRect, fitWithin, frameDurations, frameLabel,
	pickVideoMime, type Alignment,
} from './progressPhotos'

// ─── upload preparation ───────────────────────────────────────────────────────

export class UnreadableImageError extends Error {}

/**
 * Decode a picked file into an element that respects the photo's EXIF
 * orientation — every current browser applies it to <img>, and drawing that
 * element onto a canvas bakes the rotation in.
 */
export function decodeFile(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file)
		const img = new Image()
		img.onload = () => {
			URL.revokeObjectURL(url)
			resolve(img)
		}
		img.onerror = () => {
			URL.revokeObjectURL(url)
			const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
			reject(new UnreadableImageError(heic
				? "This browser can't open HEIC photos. Upload from your iPhone (Safari converts them automatically), or set Camera → Formats → Most Compatible."
				: "That file couldn't be opened as a photo."))
		}
		img.src = url
	})
}

export interface PreparedPhoto {
	blob: Blob
	width: number
	height: number
}

/**
 * Shrink and re-encode a photo for upload.
 *
 * Re-encoding through a canvas is also what strips the EXIF block — including
 * the GPS position most phones write into every picture. Nothing about where
 * a photo was taken ever reaches storage.
 */
export async function preparePhoto(img: HTMLImageElement, quality = 0.86): Promise<PreparedPhoto> {
	const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_UPLOAD_EDGE)
	if (!width || !height) throw new UnreadableImageError("That photo appears to be empty.")

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')!
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(img, 0, 0, width, height)

	const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality))
	if (!blob) throw new UnreadableImageError("The photo couldn't be converted for upload.")
	return { blob, width, height }
}

// ─── drawing ──────────────────────────────────────────────────────────────────

export type Drawable = HTMLImageElement | ImageBitmap

const sizeOf = (img: Drawable) =>
	img instanceof HTMLImageElement
		? { w: img.naturalWidth, h: img.naturalHeight }
		: { w: img.width, h: img.height }

export interface FrameStyle {
	/** Caption drawn along the bottom — date and weight. */
	label?: string
	/** A second image drawn semi-transparent on top, for lining photos up. */
	ghost?: { image: Drawable; alignment: Alignment; opacity?: number } | null
}

/** Draw one frame: the photo, aligned and covering the canvas, plus its caption. */
export function drawFrame(
	ctx: CanvasRenderingContext2D,
	image: Drawable,
	alignment: Alignment,
	style: FrameStyle = {},
): void {
	const { width: W, height: H } = ctx.canvas
	ctx.save()
	ctx.fillStyle = '#0b0d11'
	ctx.fillRect(0, 0, W, H)

	const { w, h } = sizeOf(image)
	const r = drawRect(w, h, W, H, alignment)
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(image, r.dx, r.dy, r.dw, r.dh)

	if (style.ghost) {
		const g = sizeOf(style.ghost.image)
		const gr = drawRect(g.w, g.h, W, H, style.ghost.alignment)
		ctx.globalAlpha = style.ghost.opacity ?? 0.4
		ctx.drawImage(style.ghost.image, gr.dx, gr.dy, gr.dw, gr.dh)
		ctx.globalAlpha = 1
	}

	if (style.label) drawCaption(ctx, style.label)
	ctx.restore()
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string) {
	const { width: W, height: H } = ctx.canvas
	const size = Math.max(12, Math.round(W * 0.042))
	const pad = Math.round(size * 0.9)

	// A soft gradient rather than a box, so the caption reads on any photo
	// without covering it.
	const grad = ctx.createLinearGradient(0, H - size * 4, 0, H)
	grad.addColorStop(0, 'rgba(0,0,0,0)')
	grad.addColorStop(1, 'rgba(0,0,0,0.65)')
	ctx.fillStyle = grad
	ctx.fillRect(0, H - size * 4, W, size * 4)

	ctx.font = `600 ${size}px "Space Grotesk", Inter, system-ui, sans-serif`
	ctx.textBaseline = 'bottom'
	ctx.fillStyle = '#ffffff'
	ctx.fillText(text, pad, H - pad)
}

/** Canvas size for a frame whose width is `width`. */
export const frameSize = (width: number) => ({ width, height: Math.round(width / FRAME_ASPECT) })

// ─── export ───────────────────────────────────────────────────────────────────

export interface TimelapseFrame {
	image: Drawable
	alignment: Alignment
	taken_on: string
	weight_kg?: number | null
}

export interface ExportOptions {
	/** Target clip length, seconds. */
	seconds: number
	/** Frame width in pixels; height follows from the 3:4 aspect. */
	width: number
	captions: boolean
	onProgress?: (fraction: number) => void
	signal?: AbortSignal
}

export class ExportAbortedError extends Error {}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** The video format this browser can record, or null. */
export const videoMime = () =>
	typeof MediaRecorder === 'undefined'
		? null
		: pickVideoMime(m => MediaRecorder.isTypeSupported(m))

/**
 * How often a held frame is repainted while recording. Canvas capture only
 * emits a video frame when the canvas is drawn on, so a photo that's simply
 * left on screen records as a single instant — and the final hold, the frame
 * that matters most, vanished from the end of the clip.
 */
const HOLD_REPAINT_MS = 100

/**
 * Record the frames to a video.
 *
 * Each photo is rendered once to an offscreen canvas, then copied onto the
 * recorded canvas repeatedly for as long as it should show. Recording happens
 * in real time, so an 8-second clip takes about 8 seconds to make.
 */
export async function exportVideo(frames: TimelapseFrame[], opts: ExportOptions): Promise<{ blob: Blob; mime: string }> {
	const mime = videoMime()
	if (!mime) throw new Error("This browser can't record video. Try the GIF export instead.")
	if (!frames.length) throw new Error('No photos to export.')

	const canvas = document.createElement('canvas')
	Object.assign(canvas, frameSize(opts.width))
	const ctx = canvas.getContext('2d')!
	drawFrame(ctx, frames[0].image, frames[0].alignment, { label: opts.captions ? frameLabel(frames[0]) : undefined })

	const stream = canvas.captureStream(30)
	const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 })
	const chunks: Blob[] = []
	recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
	const stopped = new Promise<void>(res => { recorder.onstop = () => res() })

	const durations = frameDurations(frames.length, opts.seconds)
	const total = durations.reduce((a, b) => a + b, 0)
	let elapsed = 0

	const still = document.createElement('canvas')
	Object.assign(still, { width: canvas.width, height: canvas.height })
	const stillCtx = still.getContext('2d')!

	recorder.start(250)
	try {
		for (let i = 0; i < frames.length; i++) {
			const f = frames[i]
			drawFrame(stillCtx, f.image, f.alignment, { label: opts.captions ? frameLabel(f) : undefined })
			const until = performance.now() + durations[i]
			do {
				if (opts.signal?.aborted) throw new ExportAbortedError()
				ctx.drawImage(still, 0, 0)
				await sleep(Math.min(HOLD_REPAINT_MS, Math.max(0, until - performance.now())))
			} while (performance.now() < until)
			elapsed += durations[i]
			opts.onProgress?.(elapsed / total)
		}
		// One last paint, so the recorder has a frame stamped at the very end of the hold.
		ctx.drawImage(still, 0, 0)
		await sleep(50)
	} finally {
		recorder.stop()
		stream.getTracks().forEach(t => t.stop())
		await stopped
	}

	return { blob: new Blob(chunks, { type: mime.split(';')[0] }), mime }
}

/**
 * Encode the frames as an animated GIF.
 *
 * Each frame gets its own 256-colour palette — photos taken months apart
 * rarely share a lighting setup, and one global palette would muddy all of
 * them. The encoder yields to the page between frames so the progress bar
 * keeps moving.
 */
export async function exportGif(frames: TimelapseFrame[], opts: ExportOptions): Promise<Blob> {
	if (!frames.length) throw new Error('No photos to export.')

	const canvas = document.createElement('canvas')
	const { width, height } = frameSize(opts.width)
	Object.assign(canvas, { width, height })
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!

	const gif = GIFEncoder()
	const durations = frameDurations(frames.length, opts.seconds)

	for (let i = 0; i < frames.length; i++) {
		if (opts.signal?.aborted) throw new ExportAbortedError()
		const f = frames[i]
		drawFrame(ctx, f.image, f.alignment, { label: opts.captions ? frameLabel(f) : undefined })
		const { data } = ctx.getImageData(0, 0, width, height)
		const palette = quantize(data, 256)
		const index = applyPalette(data, palette)
		gif.writeFrame(index, width, height, { palette, delay: durations[i], repeat: 0 })
		opts.onProgress?.((i + 1) / frames.length)
		await sleep(0)
	}

	gif.finish()
	const bytes = gif.bytes()
	return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
}

/**
 * Hand a finished file to the user.
 *
 * On a phone the share sheet is where people want it — straight into Photos or
 * a chat. Elsewhere, or if sharing is refused, it downloads.
 */
export async function saveFile(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
	const file = new File([blob], filename, { type: blob.type })
	const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
	const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
	if (touch && nav.canShare?.({ files: [file] })) {
		try {
			await nav.share({ files: [file] })
			return 'shared'
		} catch (e) {
			// Cancelling the share sheet isn't an error worth reporting.
			if ((e as DOMException)?.name === 'AbortError') return 'shared'
		}
	}
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
	setTimeout(() => URL.revokeObjectURL(url), 10_000)
	return 'downloaded'
}
