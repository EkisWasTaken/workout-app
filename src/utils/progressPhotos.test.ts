import { describe, it, expect } from 'vitest'
import {
	fitWithin, drawRect, dragAlignment, normaliseAlignment, nearestWeight, framesFor,
	previousFrame, frameDurations, frameLabel, compare, pickVideoMime, extensionFor,
	exportFilename, MAX_UPLOAD_EDGE, MIN_FRAME_MS, MAX_FRAME_MS, FINAL_HOLD_MS, MAX_SCALE,
	timelapseReadiness, nextPhotoDue, dueLabel, MIN_TIMELAPSE_PHOTOS, MIN_TIMELAPSE_SPAN_DAYS,
	type PhotoLike,
} from './progressPhotos'

const photo = (id: number, taken_on: string, over: Partial<PhotoLike> = {}): PhotoLike => ({
	id, taken_on, pose: 'front', created_at: `${taken_on}T08:00:00Z`, ...over,
})

describe('fitWithin', () => {
	it('shrinks the long edge to the limit, keeping the aspect', () => {
		expect(fitWithin(3024, 4032)).toEqual({ width: 1080, height: MAX_UPLOAD_EDGE })
		expect(fitWithin(4032, 3024)).toEqual({ width: MAX_UPLOAD_EDGE, height: 1080 })
	})

	it('never scales a small photo up', () => {
		expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
	})

	it('returns nothing for a broken image', () => {
		expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 })
	})
})

describe('drawRect', () => {
	it('covers the frame edge to edge with no alignment', () => {
		// A landscape photo in a portrait frame: height fits, width overflows equally.
		const r = drawRect(1600, 900, 300, 400)
		expect(r.dh).toBeCloseTo(400)
		expect(r.dw).toBeGreaterThan(300)
		expect(r.dx).toBeCloseTo((300 - r.dw) / 2)
		expect(r.dy).toBeCloseTo(0)
	})

	it('fills a frame of the same aspect exactly', () => {
		expect(drawRect(900, 1200, 300, 400)).toEqual({ dx: 0, dy: 0, dw: 300, dh: 400 })
	})

	it('zooms about the centre', () => {
		const r = drawRect(900, 1200, 300, 400, { scale: 2, x: 0, y: 0 })
		expect(r.dw).toBe(600)
		expect(r.dx).toBe(-150)
		expect(r.dy).toBe(-200)
	})

	it('shifts by a fraction of the frame, so it looks the same at any size', () => {
		const small = drawRect(900, 1200, 300, 400, { scale: 1, x: 0.1, y: -0.05 })
		const big = drawRect(900, 1200, 1080, 1440, { scale: 1, x: 0.1, y: -0.05 })
		expect(small.dx / 300).toBeCloseTo(big.dx / 1080)
		expect(small.dy / 400).toBeCloseTo(big.dy / 1440)
	})
})

describe('normaliseAlignment', () => {
	it('fills in missing or broken values', () => {
		expect(normaliseAlignment(null)).toEqual({ scale: 1, x: 0, y: 0 })
		expect(normaliseAlignment({ scale: NaN, x: undefined })).toEqual({ scale: 1, x: 0, y: 0 })
	})

	it('never zooms out past covering the frame, or in past the limit', () => {
		expect(normaliseAlignment({ scale: 0.5 }).scale).toBe(1)
		expect(normaliseAlignment({ scale: 10 }).scale).toBe(MAX_SCALE)
	})

	it('keeps the photo from being dragged off the frame entirely', () => {
		expect(normaliseAlignment({ x: 4, y: -4 })).toEqual({ scale: 1, x: 0.5, y: -0.5 })
	})
})

describe('dragAlignment', () => {
	it('turns a pixel drag into a fractional offset', () => {
		const a = dragAlignment({ scale: 1, x: 0, y: 0 }, 30, -40, 300, 400)
		expect(a.x).toBeCloseTo(0.1)
		expect(a.y).toBeCloseTo(-0.1)
	})

	it('ignores a drag on a frame with no size', () => {
		const a = { scale: 1.2, x: 0.1, y: 0 }
		expect(dragAlignment(a, 30, 30, 0, 0)).toBe(a)
	})
})

describe('nearestWeight', () => {
	const weights = [
		{ date: '2026-03-01', weight: 84 },
		{ date: '2026-03-05', weight: 83.5 },
		{ date: '2026-03-09', weight: 83 },
	]

	it('takes the closest weigh-in', () => {
		expect(nearestWeight(weights, '2026-03-06')).toBe(83.5)
	})

	it('prefers the earlier reading on a tie', () => {
		expect(nearestWeight(weights, '2026-03-07')).toBe(83.5)
	})

	it('refuses a weigh-in too far from the photo', () => {
		expect(nearestWeight(weights, '2026-03-20')).toBeNull()
		expect(nearestWeight([], '2026-03-01')).toBeNull()
	})
})

describe('framesFor', () => {
	it('keeps one pose, oldest first', () => {
		const out = framesFor([
			photo(1, '2026-03-10'),
			photo(2, '2026-03-01'),
			photo(3, '2026-03-05', { pose: 'side' }),
		], 'front')
		expect(out.map(p => p.id)).toEqual([2, 1])
	})

	it('keeps only the latest retake on a given day', () => {
		const out = framesFor([
			photo(1, '2026-03-01', { created_at: '2026-03-01T07:00:00Z' }),
			photo(2, '2026-03-01', { created_at: '2026-03-01T07:05:00Z' }),
			photo(3, '2026-03-02'),
		], 'front')
		expect(out.map(p => p.id)).toEqual([2, 3])
	})

	it('breaks a timestamp tie by id', () => {
		const out = framesFor([photo(5, '2026-03-01'), photo(4, '2026-03-01')], 'front')
		expect(out.map(p => p.id)).toEqual([5])
	})
})

describe('previousFrame', () => {
	const photos = [photo(1, '2026-03-01'), photo(2, '2026-03-08'), photo(3, '2026-03-15')]

	it('finds the last photo of the pose on or before the date', () => {
		expect(previousFrame(photos, 'front', '2026-03-10')!.id).toBe(2)
	})

	it('never ghosts a photo against itself', () => {
		expect(previousFrame(photos, 'front', '2026-03-08', 2)!.id).toBe(1)
	})

	it('is null when nothing came before', () => {
		expect(previousFrame(photos, 'front', '2026-02-01')).toBeNull()
		expect(previousFrame(photos, 'back', '2026-04-01')).toBeNull()
	})
})

describe('frameDurations', () => {
	it('holds a single photo', () => {
		expect(frameDurations(1)).toEqual([FINAL_HOLD_MS])
		expect(frameDurations(0)).toEqual([])
	})

	it('spreads frames over the target length', () => {
		const d = frameDurations(16, 8)
		expect(d.slice(0, -1).every(ms => ms === 500)).toBe(true)
	})

	it('never flashes frames by too fast or lingers too long', () => {
		expect(frameDurations(500, 8)[0]).toBe(MIN_FRAME_MS)
		expect(frameDurations(2, 8)[0]).toBe(MAX_FRAME_MS)
	})

	it('holds on the final frame', () => {
		const d = frameDurations(40, 4)
		expect(d[d.length - 1]).toBe(FINAL_HOLD_MS)
		expect(d[d.length - 1]).toBeGreaterThan(d[0])
	})
})

describe('frameLabel', () => {
	it('shows the date, and the weight when there is one', () => {
		expect(frameLabel({ taken_on: '2026-03-01' })).toBe('1 Mar 2026')
		expect(frameLabel({ taken_on: '2026-03-01', weight_kg: 83.44 })).toBe('1 Mar 2026 · 83.4 kg')
	})
})

describe('compare', () => {
	it('describes the gap and the weight change', () => {
		const c = compare(photo(1, '2026-01-01', { weight_kg: 86 }), photo(2, '2026-07-01', { weight_kg: 81.5 }))
		expect(c.days).toBe(181)
		expect(c.weightDelta).toBe(-4.5)
		expect(c.summary).toBe('6 months apart, −4.5 kg')
	})

	it('uses weeks for a medium gap and days for a short one', () => {
		expect(compare(photo(1, '2026-01-01'), photo(2, '2026-01-29')).summary).toBe('4 weeks apart')
		expect(compare(photo(1, '2026-01-01'), photo(2, '2026-01-02')).summary).toBe('1 day apart')
	})

	it('says nothing about weight unless both photos have one', () => {
		expect(compare(photo(1, '2026-01-01', { weight_kg: 80 }), photo(2, '2026-02-01')).weightDelta).toBeNull()
	})

	it('handles photos on the same day, and at the same weight', () => {
		const c = compare(photo(1, '2026-01-01', { weight_kg: 80 }), photo(2, '2026-01-01', { weight_kg: 80 }))
		expect(c.summary).toBe('Taken the same day at the same weight')
	})
})

describe('pickVideoMime', () => {
	it('prefers MP4, which plays on every phone', () => {
		expect(pickVideoMime(() => true)).toBe('video/mp4;codecs=avc1')
	})

	it('falls back to WebM where MP4 is not recordable', () => {
		expect(pickVideoMime(m => m.startsWith('video/webm'))).toBe('video/webm;codecs=vp9')
	})

	it('is null when the browser cannot record video', () => {
		expect(pickVideoMime(() => false)).toBeNull()
	})

	it('survives a support check that throws', () => {
		expect(pickVideoMime(() => { throw new Error('nope') })).toBeNull()
	})
})

describe('export naming', () => {
	it('picks the extension from the mime type', () => {
		expect(extensionFor('video/mp4;codecs=avc1')).toBe('mp4')
		expect(extensionFor('video/webm')).toBe('webm')
		expect(extensionFor('image/gif')).toBe('gif')
	})

	it('names the file after the pose and the date range', () => {
		expect(exportFilename('side', '2026-01-01', '2026-09-16', 'mp4'))
			.toBe('progress-side-2026-01-01-to-2026-09-16.mp4')
	})
})

/** `n` weekly photos, the first on `start`. */
const weekly = (n: number, start = '2026-08-03') =>
	Array.from({ length: n }, (_, i) => {
		const d = new Date(`${start}T12:00:00`)
		d.setDate(d.getDate() + i * 7)
		const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
		return photo(i + 1, iso)
	})

const TODAY = new Date('2026-09-16T10:00:00')

describe('timelapseReadiness', () => {
	it('asks for the full set when there are no photos', () => {
		const r = timelapseReadiness([], TODAY)
		expect(r.ready).toBe(false)
		expect(r.photosLeft).toBe(MIN_TIMELAPSE_PHOTOS)
		expect(r.daysLeft).toBe(MIN_TIMELAPSE_SPAN_DAYS)
		expect(r.readyBy).toBeNull()
	})

	it('is ready with enough photos spread over enough time', () => {
		// Six weekly photos span five weeks.
		const r = timelapseReadiness(weekly(6), TODAY)
		expect(r.ready).toBe(true)
		expect(r.spanDays).toBe(35)
		expect(r.readyBy).toBeNull()
		expect(r.message).toContain('6 photos over 5 weeks')
	})

	it('is not ready with plenty of photos crammed into a few days', () => {
		const burst = Array.from({ length: 8 }, (_, i) => photo(i + 1, `2026-09-0${i + 1}`))
		const r = timelapseReadiness(burst, TODAY)
		expect(r.photosLeft).toBe(0)
		expect(r.daysLeft).toBe(MIN_TIMELAPSE_SPAN_DAYS - 7)
		expect(r.ready).toBe(false)
		expect(r.message).toMatch(/^Needs 3 weeks more between/)
	})

	it('is not ready with a long span but too few photos', () => {
		const sparse = [photo(1, '2026-06-01'), photo(2, '2026-09-01')]
		const r = timelapseReadiness(sparse, TODAY)
		expect(r.daysLeft).toBe(0)
		expect(r.photosLeft).toBe(4)
		expect(r.message).toMatch(/^Needs 4 more photos\./)
	})

	it('estimates the ready date at one photo a week from the next due date', () => {
		// Three weekly photos, latest 2026-08-17: next due 08-24, three more → 09-07.
		// The span needs 08-31 (first photo + 28 days); the count is the later of the two.
		const r = timelapseReadiness(weekly(3), new Date('2026-08-18T10:00:00'))
		expect(r.readyBy).toBe('2026-09-07')
		expect(r.message).toContain('around 7 September')
	})

	it('waits for the span when the count is already met sooner', () => {
		// Five photos in a week, then one more: count met at the next photo, span not.
		const five = Array.from({ length: 5 }, (_, i) => photo(i + 1, `2026-09-0${i + 1}`))
		const r = timelapseReadiness(five, new Date('2026-09-06T10:00:00'))
		expect(r.readyBy).toBe('2026-09-29')
	})

	it('counts on from today when the next photo is overdue', () => {
		// Latest photo 6 Sep, so one was due 13 Sep; three still needed. Taken
		// weekly from today (16 Sep): 16th, 23rd, 30th.
		const three = [photo(1, '2026-07-01'), photo(2, '2026-08-01'), photo(3, '2026-09-06')]
		expect(timelapseReadiness(three, TODAY).readyBy).toBe('2026-09-30')
	})

	it('never estimates a date in the past', () => {
		// Latest photo long ago: the next one is overdue, so "ready by" is today at the earliest.
		const r = timelapseReadiness(weekly(5, '2026-01-05'), TODAY)
		expect(r.readyBy).toBe('2026-09-16')
	})
})

describe('nextPhotoDue', () => {
	it('is a week after the latest photo', () => {
		const due = nextPhotoDue([photo(1, '2026-09-10')], TODAY)!
		expect(due.date).toBe('2026-09-17')
		expect(due.inDays).toBe(1)
	})

	it('is null before the first photo', () => {
		expect(nextPhotoDue([], TODAY)).toBeNull()
	})
})

describe('dueLabel', () => {
	it('reads naturally at every distance', () => {
		expect(dueLabel(null)).toBe('Take your first photo today')
		expect(dueLabel({ date: '2026-09-16', inDays: 0 })).toBe('Next photo due today')
		expect(dueLabel({ date: '2026-09-17', inDays: 1 })).toBe('Next photo due tomorrow')
		expect(dueLabel({ date: '2026-09-15', inDays: -1 })).toBe('Next photo overdue by 1 day')
		expect(dueLabel({ date: '2026-09-12', inDays: -4 })).toBe('Next photo overdue by 4 days')
		expect(dueLabel({ date: '2026-09-20', inDays: 4 })).toBe('Next photo due in 4 days (Sun 20 Sep)')
	})
})
