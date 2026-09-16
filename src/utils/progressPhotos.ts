/**
 * Progress photos — the maths behind the timelapse.
 *
 * A timelapse of body photos lives or dies on consistency. Photos taken weeks
 * apart are never framed the same, and a sequence that lurches left, right and
 * closer on every frame shows the camera moving, not the body changing. So each
 * photo carries an alignment (zoom and offset), and every frame is drawn into
 * the same fixed 3:4 box through it.
 *
 * Pure: no canvas, no DOM, no database. The drawing lives in `timelapse.ts`.
 */
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export type Pose = 'front' | 'side' | 'back'

export const POSES: { key: Pose; label: string }[] = [
	{ key: 'front', label: 'Front' },
	{ key: 'side', label: 'Side' },
	{ key: 'back', label: 'Back' },
]

export interface Alignment {
	/** 1 = the photo just covers the frame; 1.2 = 20% closer. */
	scale: number
	/** Horizontal shift as a fraction of the frame width. Positive moves right. */
	x: number
	/** Vertical shift as a fraction of the frame height. Positive moves down. */
	y: number
}

export const NO_ALIGNMENT: Alignment = { scale: 1, x: 0, y: 0 }
export const MIN_SCALE = 1
export const MAX_SCALE = 3

/** Every timelapse frame is portrait 3:4 — how people stand for these photos. */
export const FRAME_ASPECT = 3 / 4

/** Longest edge kept after re-encoding. Plenty for a phone screen, a few hundred KB on disk. */
export const MAX_UPLOAD_EDGE = 1440

// ─── resizing ─────────────────────────────────────────────────────────────────

/** Scale `w × h` down so neither side exceeds `maxEdge`. Never scales up. */
export function fitWithin(w: number, h: number, maxEdge = MAX_UPLOAD_EDGE): { width: number; height: number } {
	if (!(w > 0) || !(h > 0)) return { width: 0, height: 0 }
	const k = Math.min(1, maxEdge / Math.max(w, h))
	return { width: Math.round(w * k), height: Math.round(h * k) }
}

// ─── alignment ────────────────────────────────────────────────────────────────

export interface DrawRect {
	dx: number
	dy: number
	dw: number
	dh: number
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Keep an alignment inside sane bounds, whatever the sliders or a bad row say. */
export function normaliseAlignment(a: Partial<Alignment> | null | undefined): Alignment {
	const n = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
	return {
		scale: clamp(n(a?.scale, 1), MIN_SCALE, MAX_SCALE),
		x: clamp(n(a?.x, 0), -0.5, 0.5),
		y: clamp(n(a?.y, 0), -0.5, 0.5),
	}
}

/**
 * Where to draw an image of `imgW × imgH` inside a `frameW × frameH` frame.
 *
 * The image is first scaled to *cover* the frame — no letterboxing, so every
 * frame is filled edge to edge — then zoomed about the frame's centre and
 * shifted. The result may extend past the frame; the canvas clips it.
 */
export function drawRect(
	imgW: number, imgH: number,
	frameW: number, frameH: number,
	alignment: Alignment = NO_ALIGNMENT,
): DrawRect {
	const a = normaliseAlignment(alignment)
	const cover = Math.max(frameW / imgW, frameH / imgH)
	const dw = imgW * cover * a.scale
	const dh = imgH * cover * a.scale
	return {
		dx: (frameW - dw) / 2 + a.x * frameW,
		dy: (frameH - dh) / 2 + a.y * frameH,
		dw,
		dh,
	}
}

/**
 * The alignment after dragging by `dxPx, dyPx` on a preview `frameW × frameH`
 * pixels wide. Offsets are stored as fractions, so the same alignment renders
 * identically on a phone preview and a 1080p export.
 */
export function dragAlignment(a: Alignment, dxPx: number, dyPx: number, frameW: number, frameH: number): Alignment {
	if (!(frameW > 0) || !(frameH > 0)) return a
	return normaliseAlignment({ ...a, x: a.x + dxPx / frameW, y: a.y + dyPx / frameH })
}

// ─── weight ───────────────────────────────────────────────────────────────────

export interface WeighInLike {
	date: string
	weight: number
}

/** A weigh-in further than this from the photo doesn't describe the body in it. */
export const WEIGHT_MATCH_DAYS = 3

/**
 * The weigh-in closest to `date`, within `maxDays`. On a tie the earlier one
 * wins — a morning weigh-in before the photo describes it better than next
 * week's.
 */
export function nearestWeight(weights: WeighInLike[], date: string, maxDays = WEIGHT_MATCH_DAYS): number | null {
	const target = parseISO(date)
	let best: { gap: number; date: string; weight: number } | null = null
	for (const w of weights) {
		const gap = Math.abs(differenceInCalendarDays(parseISO(w.date), target))
		if (gap > maxDays) continue
		if (!best || gap < best.gap || (gap === best.gap && w.date < best.date)) {
			best = { gap, date: w.date, weight: w.weight }
		}
	}
	return best ? best.weight : null
}

// ─── sequences ────────────────────────────────────────────────────────────────

export interface PhotoLike {
	id: number
	taken_on: string
	pose: Pose
	created_at?: string
	weight_kg?: number | null
}

/**
 * The frames for one pose, oldest first.
 *
 * Two photos on the same day for the same pose means a retake, so only the
 * latest upload that day is kept — otherwise the timelapse stutters on one
 * date.
 */
export function framesFor<T extends PhotoLike>(photos: T[], pose: Pose): T[] {
	const byDay = new Map<string, T>()
	for (const p of photos) {
		if (p.pose !== pose) continue
		const kept = byDay.get(p.taken_on)
		const newer = !kept
			|| String(p.created_at ?? '') > String(kept.created_at ?? '')
			|| (String(p.created_at ?? '') === String(kept.created_at ?? '') && p.id > kept.id)
		if (newer) byDay.set(p.taken_on, p)
	}
	return [...byDay.values()].sort((a, b) => a.taken_on.localeCompare(b.taken_on) || a.id - b.id)
}

/** The most recent photo of a pose taken before `date` — the ghost to line a new one up against. */
export function previousFrame<T extends PhotoLike>(photos: T[], pose: Pose, date: string, excludeId?: number): T | null {
	const earlier = framesFor(photos.filter(p => p.id !== excludeId), pose).filter(p => p.taken_on <= date)
	return earlier[earlier.length - 1] ?? null
}

// ─── timing ───────────────────────────────────────────────────────────────────

/** No frame flashes by faster than this, however many photos there are. */
export const MIN_FRAME_MS = 150
/** …and none lingers longer than this, however few. */
export const MAX_FRAME_MS = 1200
/** The last frame holds, so the timelapse ends on where you are now. */
export const FINAL_HOLD_MS = 1500

/**
 * How long each frame shows, aiming for a clip about `targetSeconds` long.
 * Returns one duration per frame, the last one held.
 */
export function frameDurations(count: number, targetSeconds = 8): number[] {
	if (count <= 0) return []
	if (count === 1) return [FINAL_HOLD_MS]
	const per = clamp(Math.round((targetSeconds * 1000) / count), MIN_FRAME_MS, MAX_FRAME_MS)
	return Array.from({ length: count }, (_, i) => (i === count - 1 ? Math.max(per, FINAL_HOLD_MS) : per))
}

/** Speed presets for the player and exports, as a target clip length. */
export const SPEEDS = [
	{ key: 'slow', label: 'Slow', seconds: 16 },
	{ key: 'normal', label: 'Normal', seconds: 8 },
	{ key: 'fast', label: 'Fast', seconds: 4 },
] as const

export type SpeedKey = typeof SPEEDS[number]['key']

// ─── labels & comparison ──────────────────────────────────────────────────────

export function frameLabel(p: { taken_on: string; weight_kg?: number | null }): string {
	const date = format(parseISO(p.taken_on), 'd MMM yyyy')
	return typeof p.weight_kg === 'number' ? `${date} · ${p.weight_kg.toFixed(1)} kg` : date
}

export interface Comparison {
	days: number
	/** later − earlier, kg. Null unless both photos carry a weight. */
	weightDelta: number | null
	summary: string
}

/** What changed between two photos, in words. */
export function compare(earlier: PhotoLike, later: PhotoLike): Comparison {
	const days = Math.abs(differenceInCalendarDays(parseISO(later.taken_on), parseISO(earlier.taken_on)))
	const weightDelta =
		typeof earlier.weight_kg === 'number' && typeof later.weight_kg === 'number'
			? Math.round((later.weight_kg - earlier.weight_kg) * 10) / 10
			: null

	const span = days === 0
		? 'the same day'
		: days < 14
			? `${days} day${days === 1 ? '' : 's'}`
			: days < 60
				? `${Math.round(days / 7)} weeks`
				: `${Math.round(days / 30.44)} months`

	let weight = ''
	if (weightDelta !== null) {
		weight = weightDelta === 0
			? ' at the same weight'
			: `, ${weightDelta > 0 ? '+' : '−'}${Math.abs(weightDelta).toFixed(1)} kg`
	}
	return { days, weightDelta, summary: days === 0 ? `Taken ${span}${weight}` : `${span} apart${weight}` }
}

// ─── export formats ───────────────────────────────────────────────────────────

/**
 * The best video format this browser can record, or null if it can't record
 * at all. MP4 first: it plays everywhere, including the iPhone Photos app,
 * which WebM does not.
 */
export function pickVideoMime(isSupported: (mime: string) => boolean): string | null {
	const candidates = [
		'video/mp4;codecs=avc1',
		'video/mp4',
		'video/webm;codecs=vp9',
		'video/webm;codecs=vp8',
		'video/webm',
	]
	return candidates.find(m => {
		try {
			return isSupported(m)
		} catch {
			return false
		}
	}) ?? null
}

export const extensionFor = (mime: string) => (mime.startsWith('video/mp4') ? 'mp4' : mime.startsWith('video/webm') ? 'webm' : 'gif')

/** "progress-front-2026-03-01-to-2026-09-16.mp4" */
export function exportFilename(pose: Pose, first: string, last: string, ext: string): string {
	return `progress-${pose}-${first}-to-${last}.${ext}`
}

// ─── readiness ────────────────────────────────────────────────────────────────

/**
 * The least a timelapse needs before it's worth exporting.
 *
 * Six frames is what an 8-second clip needs to read as motion rather than a
 * slideshow. Count alone isn't enough, though: six photos in one week show
 * nothing, because bodies change over weeks. So there's a span as well — four
 * weeks is roughly where visible change starts for most people.
 */
export const MIN_TIMELAPSE_PHOTOS = 6
export const MIN_TIMELAPSE_SPAN_DAYS = 28
/** The cadence the guidance recommends, and what "next photo due" counts from. */
export const PHOTO_INTERVAL_DAYS = 7

export interface Readiness {
	ready: boolean
	count: number
	/** Days from the first photo to the latest. */
	spanDays: number
	photosLeft: number
	daysLeft: number
	/**
	 * Roughly when both conditions will be met, taking one photo a week from
	 * the next due date. Null once ready, or with no photos to count from.
	 */
	readyBy: string | null
	message: string
}

export function timelapseReadiness(frames: PhotoLike[], today: Date = new Date()): Readiness {
	const count = frames.length
	const first = frames[0]
	const last = frames[count - 1]
	const spanDays = count > 1
		? differenceInCalendarDays(parseISO(last.taken_on), parseISO(first.taken_on))
		: 0
	const photosLeft = Math.max(0, MIN_TIMELAPSE_PHOTOS - count)
	const daysLeft = Math.max(0, MIN_TIMELAPSE_SPAN_DAYS - spanDays)
	const ready = photosLeft === 0 && daysLeft === 0

	let readyBy: string | null = null
	if (!ready && first && last) {
		const todayIso = format(today, 'yyyy-MM-dd')
		const due = nextPhotoDue(frames, today)!
		// An overdue photo can only be taken from today — counting on from the
		// missed date would promise a finish that's already slipped.
		const next = due.date < todayIso ? todayIso : due.date
		// The span is only met by a photo taken on or after that day.
		const spanDate = addDaysIso(first.taken_on, MIN_TIMELAPSE_SPAN_DAYS)
		// Photos still needed, one a week from the next one.
		const countDate = photosLeft > 0 ? addDaysIso(next, (photosLeft - 1) * PHOTO_INTERVAL_DAYS) : next
		readyBy = spanDate > countDate ? spanDate : countDate
		if (readyBy < todayIso) readyBy = todayIso
	}

	let message: string
	if (ready) {
		message = `${count} photos over ${spanLabel(spanDays)} — enough for a timelapse that shows real change.`
	} else if (!count) {
		message = `Take ${MIN_TIMELAPSE_PHOTOS} photos over at least 4 weeks to unlock the timelapse.`
	} else {
		const parts: string[] = []
		if (photosLeft) parts.push(`${photosLeft} more photo${photosLeft === 1 ? '' : 's'}`)
		if (daysLeft) parts.push(`${spanLabel(daysLeft)} more between your first and latest`)
		message = `Needs ${parts.join(' and ')}.`
		if (readyBy) message += ` At one a week, that's around ${format(parseISO(readyBy), 'd MMMM')}.`
	}

	return { ready, count, spanDays, photosLeft, daysLeft, readyBy, message }
}

export interface PhotoDue {
	date: string
	/** Days from today; zero or less means it's due now. */
	inDays: number
}

/** When the next photo is due: a week after the latest. Null with no photos yet. */
export function nextPhotoDue(frames: PhotoLike[], today: Date = new Date()): PhotoDue | null {
	const last = frames[frames.length - 1]
	if (!last) return null
	const date = addDaysIso(last.taken_on, PHOTO_INTERVAL_DAYS)
	return { date, inDays: differenceInCalendarDays(parseISO(date), today) }
}

export function dueLabel(due: PhotoDue | null): string {
	if (!due) return 'Take your first photo today'
	if (due.inDays < 0) return `Next photo overdue by ${-due.inDays} day${due.inDays === -1 ? '' : 's'}`
	if (due.inDays === 0) return 'Next photo due today'
	if (due.inDays === 1) return 'Next photo due tomorrow'
	return `Next photo due in ${due.inDays} days (${format(parseISO(due.date), 'EEE d MMM')})`
}

const addDaysIso = (iso: string, days: number) => format(addDays(parseISO(iso), days), 'yyyy-MM-dd')

function spanLabel(days: number): string {
	if (days < 14) return `${days} day${days === 1 ? '' : 's'}`
	const weeks = Math.round(days / 7)
	return `${weeks} week${weeks === 1 ? '' : 's'}`
}
