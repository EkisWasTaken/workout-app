// TEMPORARY visual harness — the real app shell with a stubbed database. Delete after review.
import { createApp, defineComponent, h } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { addDays, format } from 'date-fns'
import '../style.css'
import '../styles/app.css'
import '../styles/stats.css'
import '../components/charts/charts.css'
import { naiveTheme, themeOverrides } from '../theme'
import { encode } from '@mapbox/polyline'
import { db } from '../db'
import { auth } from '../auth'
import router from '../router'
import MainLayout from '../layouts/MainLayout.vue'
import { hydrateTheme } from '../theme'

// Same as the real entry point: the chosen theme has to be on the document
// before the first paint.
hydrateTheme()
const now = new Date()
let seed = 11
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const day = (n: number) => format(addDays(now, -n), 'yyyy-MM-dd')
const rest = 52

/**
 * Where a run started. Most are from home in Stockholm; a scattering are from
 * trips, which is what the place filter on the all-routes map exists for.
 */
const BASES: { lat: number; lng: number }[] = [
	{ lat: 59.3255, lng: 18.1035 },  // Stockholm (home)
	{ lat: 57.7089, lng: 11.9746 },  // Gothenburg
	{ lat: 63.1792, lng: 14.6357 },  // Ostersund
	{ lat: 52.5200, lng: 13.4050 },  // Berlin
	{ lat: 41.3874, lng: 2.1686 },   // Barcelona
]
let runNo = 0
const baseFor = () => {
	runNo++
	return runNo % 11 === 0 ? BASES[1]
		: runNo % 17 === 0 ? BASES[2]
		: runNo % 13 === 0 ? BASES[3]
		: runNo % 23 === 0 ? BASES[4]
		: BASES[0]
}

/** A plausible out-and-back, scaled to distance, around the given base. */
function loop(km: number, seedN: number, base = BASES[0]): [number, number][] {
	const lat0 = base.lat, lng0 = base.lng
	const r = km / 400
	const n = 160
	const out: [number, number][] = []
	for (let i = 0; i < n; i++) {
		const t = (i / (n - 1)) * Math.PI * 2
		const wob = 0.18 * Math.sin(t * 5 + seedN)
		out.push([
			lat0 + r * 0.55 * Math.sin(t) * (1 + wob),
			lng0 + r * Math.sin(t * 2) * (1 + wob * 0.5),
		])
	}
	return out
}

const acts: any[] = []
const ws: any[] = []
let id = 1
for (let d = 120; d >= -10; d--) {
	const dow = addDays(now, -d).getDay()
	const future = d < 0
	if ([2, 4, 6].includes(dow)) {
		const km = dow === 6 ? 14 + rnd() * 5 : 6 + rnd() * 4
		if (future) { ws.push({ id: id++, date: day(d), name: dow === 6 ? 'Long run' : 'Easy run', type: 'Running', isCompleted: 0, distance: Math.round(km), duration: 50 }); continue }
		const frac = 0.55 + rnd() * 0.25
		const speed = 2.75 * (1 + (120 - d) * 0.0009) * (frac / 0.65)
		const hr = Math.round(rest + frac * (190 - rest))
		// Matches MAX_STREAM_POINTS in the importer, so the sample spacing here is
		// what a real imported activity actually has (~5 s, not ~12 s).
		const n = 900
		const T = Math.round((km * 1000) / speed)
		const time = Array.from({ length: n }, (_, i) => Math.round((i * T) / n))
		const a = {
			id: id++, sport_type: 'Run', name: 'Run', start_date_local: `${day(d)}T07:15:00`, start_date: `${day(d)}T05:15:00Z`,
			distance: km * 1000, moving_time: T, average_speed: speed, average_heartrate: hr, max_heartrate: hr + 15,
			total_elevation_gain: 60,
			best_efforts: [{ name: '5 km', distance: 5000, elapsed_time: Math.round(5000 / (speed * 1.18)) }],
			splits_metric: Array.from({ length: Math.floor(km) }, (_, i) => ({ split: i + 1, distance: 1000, moving_time: 300, elapsed_time: 300, average_speed: speed * (0.95 + rnd() * 0.1), elevation_difference: Math.round((rnd() - 0.5) * 20), average_heartrate: hr + Math.round((rnd() - 0.5) * 8), pace_zone: 0 })),
			map: { polyline: encode(loop(km, d, baseFor())) },
			streams: {
				time,
				// A realistically imperfect recording, so the repair in `hrStream.ts`
				// has something to do: every third run logs HR every fifth sample
				// (the sparse-sampling watch), every seventh drops out for a stretch,
				// and one sample in ~120 is an interference spike.
				heartrate: time.map((_, i) => {
					const clean = Math.round(hr - 20 * Math.exp(-i / 40) + 6 * Math.sin(i / 30) + (rnd() - 0.5) * 4)
					if (d % 3 === 0 && i % 5 !== 0) return null
					if (d % 7 === 0 && i > n * 0.4 && i < n * 0.55) return 0
					if (i > 5 && i % 120 === 0) return clean + 70
					return clean
				}),
				velocity: time.map((_, i) => speed * (1 + 0.08 * Math.sin(i / 25)) + (rnd() - 0.5) * 0.6),
				cadence: time.map(() => 170 + Math.round((rnd() - 0.5) * 8)),
				altitude: time.map((_, i) => 12 + 28 * Math.sin((i / n) * Math.PI * 3) + 6 * Math.sin(i / 11)),
			},
		}
		acts.push(a)
		ws.push({ id: id++, date: day(d), name: dow === 6 ? 'Long run' : 'Easy run', type: 'Running', isCompleted: 1, distance: Math.round(km * 10) / 10, stravaActivityId: a.id, rpe: 5 })
	}
	if ([1, 3, 5].includes(dow)) {
		const split = ['Push', 'Pull', 'Legs'][dow === 1 ? 0 : dow === 3 ? 1 : 2]
		ws.push({ id: id++, date: day(d), name: `${split} day`, type: 'Gym', gymType: split, isCompleted: future ? 0 : 1, totalWeightLifted: future ? undefined : Math.round((split === 'Legs' ? 7200 : 5200) * (1 + (120 - d) * 0.001) * (0.93 + rnd() * 0.14)) })
	}
	if (dow === 0 && !future && rnd() > 0.5) {
		const a = { id: id++, sport_type: 'Ride', name: 'Ride', start_date_local: `${day(d)}T09:00:00`, distance: 45000 + rnd() * 20000, moving_time: 6000, average_speed: 8, average_heartrate: 138, total_elevation_gain: 300 + rnd() * 400 }
		acts.push(a)
		ws.push({ id: id++, date: day(d), name: 'Sunday ride', type: 'Bike', isCompleted: 1, stravaActivityId: a.id })
	}
}
const weights = Array.from({ length: 70 }, (_, i) => 70 - i).filter(() => rnd() > 0.5).map(d => ({ id: d, date: day(d), weight: Math.round((82.5 - (70 - d) * 0.04 + (rnd() - 0.5) * 1.2) * 10) / 10 }))
const races = [{ id: 1, name: 'Stockholm Half', date: format(addDays(now, 40), 'yyyy-MM-dd'), distance_km: 21.1, goal_time_secs: 6300, priority: 'A' }]

const d = db as any
d.getWorkouts = async () => ws
d.getDailyWeights = async () => weights
d.addDailyWeight = async (w: any) => { const id = 10000 + weights.length; weights.push({ id, ...w }); return id }
d.getRaceGoals = async () => races
d.getImportedActivities = async () => acts
d.getImportedActivityById = async (i: number) => acts.find(a => a.id === i) ?? null
d.getWorkoutById = async (i: number) => ws.find(w => w.id === i) ?? null
const tpls: any[] = [
	{ id: 1, name: 'Push day', kind: 'gym', workout_type: 'Push', duration: 60, user_id: 'me' },
	{ id: 2, name: 'Pull day', kind: 'gym', workout_type: 'Pull', duration: 60, user_id: 'me' },
	{ id: 3, name: 'Threshold 5×1k', kind: 'run', workout_type: 'Threshold', distance: 10, target_pace: '4:30', notes: '2 km warm-up, 5×1k, 2 km cool-down', user_id: 'other' },
	{ id: 4, name: 'Long run', kind: 'run', workout_type: 'Long', distance: 22, target_pace: '5:30', user_id: 'me' },
]
const tplEx: any[] = [
	{ id: 1, template_id: 1, exercise_name: 'Bench press', sets: 4, reps: '6-8', notes: null },
	{ id: 2, template_id: 1, exercise_name: 'Incline dumbbell press', sets: 3, reps: '8-12', notes: null },
	{ id: 3, template_id: 1, exercise_name: 'Overhead press', sets: 3, reps: '8', notes: null },
	{ id: 4, template_id: 1, exercise_name: 'Triceps pushdown', sets: 3, reps: '12-15', notes: null },
	{ id: 5, template_id: 2, exercise_name: 'Pull-up', sets: 4, reps: '6-10', notes: null },
	{ id: 6, template_id: 2, exercise_name: 'Barbell row', sets: 3, reps: '8', notes: null },
]
// Above whatever the seed loop reached, so a newly added row can never collide
// with a seeded id — duplicate v-for keys silently drop a card from the calendar.
let tplId = 100000
d.getWorkoutTemplates = async () =>
	[...tpls].sort((a, b) => String(a.kind).localeCompare(String(b.kind)) || a.name.localeCompare(b.name))
d.getTemplateExerciseCounts = async () => {
	const out: Record<number, any[]> = {}
	for (const e of tplEx) (out[e.template_id] ??= []).push(e)
	return out
}
d.getWorkoutTemplateExercises = async (id: number) => tplEx.filter(e => e.template_id === id)
d.addWorkoutTemplate = async (t: any) => {
	const id = tplId++
	tpls.push({ ...t, id, user_id: 'me' })
	for (const ex of t.exercises ?? []) tplEx.push({ ...ex, id: tplId++, template_id: id })
	return id
}
d.updateWorkoutTemplate = async (id: number, t: any) => {
	const row = tpls.find(x => x.id === id)
	if (!row || row.user_id !== 'me') throw new Error('NOT_YOUR_TEMPLATE')
	Object.assign(row, t, { id, user_id: 'me' })
	for (let i = tplEx.length - 1; i >= 0; i--) if (tplEx[i].template_id === id) tplEx.splice(i, 1)
	for (const ex of t.exercises ?? []) tplEx.push({ ...ex, id: tplId++, template_id: id })
	return true
}
d.deleteWorkoutTemplate = async (id: number) => {
	const i = tpls.findIndex(x => x.id === id)
	if (i < 0 || tpls[i].user_id !== 'me') throw new Error('NOT_YOUR_TEMPLATE')
	tpls.splice(i, 1)
	return true
}
d.addWorkout = async (w: any) => { const id = tplId++; ws.push({ ...w, id }); return id }
d.addWorkouts = async (list: any[]) => { for (const w of list) ws.push({ ...w, id: tplId++ }); return list.length }
d.deletePlannedWorkoutsBetween = async (from: string, to: string) => {
	let n = 0
	for (let i = ws.length - 1; i >= 0; i--) {
		const w = ws[i]
		if (w.date >= from && w.date <= to && w.isCompleted !== 1) { ws.splice(i, 1); n++ }
	}
	return n
}
d.updateWorkout = async (w: any) => { const i = ws.findIndex(x => x.id === w.id); if (i >= 0) ws[i] = { ...ws[i], ...w }; return 1 }
d.completeWorkout = async (w: any) => { const i = ws.findIndex(x => x.id === w.id); if (i >= 0) ws[i] = { ...ws[i], ...w }; return 1 }
d.deleteWorkout = async (id: number) => { const i = ws.findIndex(x => x.id === id); if (i >= 0) ws.splice(i, 1); return 1 }
d.getRaceGoals = async () => races
d.getExercises = async () => [
	{ id: 1, name: 'Bench press', body_part: 'chest' }, { id: 2, name: 'Incline dumbbell press', body_part: 'chest' },
	{ id: 3, name: 'Squat', body_part: 'legs' }, { id: 4, name: 'Romanian deadlift', body_part: 'legs' },
	{ id: 5, name: 'Pull-up', body_part: 'back' },
]
d.getProfile = async () => ({
	user_name: 'Elias', goal_weight: 78, resting_hr: rest, max_hr: null, vdot_override: null,
	birth_year: now.getFullYear() - 29, height_cm: 183, sex: 'male', activity_level: 'light',
})
d.saveProfile = async () => {}
d.getDistanceGoals = async () => []

// Progress photos: drawn silhouettes that slim down over five months, each
// framed slightly differently so the alignment tool has something to fix.
function fakePhoto(i: number, n: number, pose: string): Promise<string> {
	const c = document.createElement('canvas')
	c.width = 900
	c.height = 1200
	const g = c.getContext('2d')!
	const wall = g.createLinearGradient(0, 0, 0, 1200)
	wall.addColorStop(0, '#d9d2c5')
	wall.addColorStop(1, '#b9b0a0')
	g.fillStyle = wall
	g.fillRect(0, 0, 900, 1200)
	g.fillStyle = '#8a7f6e'
	g.fillRect(0, 1020, 900, 180)
	const t = i / Math.max(1, n - 1)
	const shift = (rnd() - 0.5) * 90
	const zoom = 0.9 + rnd() * 0.2
	g.translate(450 + shift, 600)
	g.scale(zoom, zoom)
	g.fillStyle = '#c98f6f'
	const waist = (pose === 'side' ? 95 : 150) - 38 * t
	const chest = (pose === 'side' ? 110 : 185) - 10 * t
	g.beginPath(); g.arc(0, -330, 62, 0, Math.PI * 2); g.fill()                 // head
	g.beginPath()
	g.moveTo(-chest, -230); g.lineTo(chest, -230)                              // shoulders
	g.quadraticCurveTo(waist + 20, -20, waist, 120)
	g.lineTo(-waist, 120)
	g.quadraticCurveTo(-waist - 20, -20, -chest, -230)
	g.fill()
	g.fillStyle = '#2c3e66'
	g.fillRect(-waist - 6, 110, (waist + 6) * 2, 120)                           // shorts
	g.fillStyle = '#c98f6f'
	g.fillRect(-waist + 10, 230, 60, 190); g.fillRect(waist - 70, 230, 60, 190) // legs
	if (pose !== 'side') {
		g.fillRect(-chest - 40, -220, 42, 300); g.fillRect(chest - 2, -220, 42, 300) // arms
	}
	return new Promise(res => c.toBlob(b => res(URL.createObjectURL(b!)), 'image/jpeg', 0.85))
}

const photoUrls: Record<string, string> = {}
const photoRows: any[] = []
let photoId = 1
async function seedPhotos() {
	const plan = [
		...Array.from({ length: 11 }, (_, i) => ({ pose: 'front', i, n: 11, days: 150 - i * 14 })),
		...Array.from({ length: 3 }, (_, i) => ({ pose: 'side', i, n: 3, days: 150 - i * 70 })),
	]
	for (const p of plan) {
		const path = `me/${photoId}.jpg`
		photoUrls[path] = await fakePhoto(p.i, p.n, p.pose)
		photoRows.push({
			id: photoId++, taken_on: day(p.days), pose: p.pose, path, width: 900, height: 1200,
			weight_kg: Math.round((86.5 - (150 - p.days) * 0.03) * 10) / 10,
			note: p.i === 0 ? 'Start of the block' : null,
			align_scale: 1, align_x: 0, align_y: 0, created_at: `${day(p.days)}T07:00:00Z`,
		})
	}
}
const photosReady = seedPhotos()
d.getProgressPhotos = async () => { await photosReady; return [...photoRows] }
d.signProgressPhotos = async (paths: string[]) => { await photosReady; return Object.fromEntries(paths.filter(p => photoUrls[p]).map(p => [p, photoUrls[p]])) }
d.addProgressPhoto = async (blob: Blob, size: any, meta: any) => {
	const path = `me/${photoId}.jpg`
	photoUrls[path] = URL.createObjectURL(blob)
	const row = { id: photoId++, path, width: size.width, height: size.height, created_at: new Date().toISOString(), ...meta }
	photoRows.push(row)
	return row
}
d.updateProgressPhoto = async (id: number, patch: any) => { Object.assign(photoRows.find(r => r.id === id), patch) }
d.deleteProgressPhoto = async (ph: any) => { photoRows.splice(photoRows.findIndex(r => r.id === ph.id), 1) }
/**
 * Every stub above answers in the same tick, which the real database never
 * does — so loading states flashed past and couldn't be judged in the harness
 * at all. Wrapping the reads in a round-trip-ish delay makes this behave like
 * the app talking to Supabase over a network.
 */
const LATENCY_MS = 450
for (const name of [
	'getWorkouts', 'getDailyWeights', 'getRaceGoals', 'getImportedActivities',
	'getImportedActivityById', 'getWorkoutById', 'getExercises', 'getProfile',
	'getDistanceGoals', 'getWorkoutTemplates', 'getTemplateExerciseCounts',
	'getWorkoutTemplateExercises', 'getProgressPhotos',
]) {
	const original = d[name]
	if (typeof original !== 'function') continue
	d[name] = async (...args: any[]) => {
		const value = await original(...args)
		await new Promise(res => setTimeout(res, LATENCY_MS))
		// A fresh array, like a real query returns. The stubs hand back their own
		// backing array, and assigning the same object reference to a ref is a
		// no-op in Vue — so a row added here never appeared until a full reload.
		return Array.isArray(value) ? [...value] : value
	}
}

;(auth as any).user = { id: 'me', email: 'preview@example.com' }
;(auth as any).ready = true

const Root = defineComponent(() => () =>
	h(NConfigProvider, { theme: naiveTheme.value, themeOverrides: themeOverrides.value, class: 'full-height' }, () =>
		h(NDialogProvider, null, () => h(NMessageProvider, null, () => h(MainLayout)))))

createApp(Root).use(router).mount('#app')
