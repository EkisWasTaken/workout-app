// TEMPORARY visual harness — the real app shell with a stubbed database. Delete after review.
import { createApp, defineComponent, h } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { addDays, format } from 'date-fns'
import '../style.css'
import '../styles/app.css'
import '../styles/stats.css'
import '../components/charts/charts.css'
import { naiveTheme, themeOverrides } from '../theme'
import { db } from '../db'
import { auth } from '../auth'
import router from '../router'
import MainLayout from '../layouts/MainLayout.vue'

document.documentElement.setAttribute('data-theme', 'dark')
const now = new Date()
let seed = 11
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const day = (n: number) => format(addDays(now, -n), 'yyyy-MM-dd')
const rest = 52

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
		const n = 400
		const T = Math.round((km * 1000) / speed)
		const time = Array.from({ length: n }, (_, i) => Math.round((i * T) / n))
		const a = {
			id: id++, sport_type: 'Run', name: 'Run', start_date_local: `${day(d)}T07:15:00`, start_date: `${day(d)}T05:15:00Z`,
			distance: km * 1000, moving_time: T, average_speed: speed, average_heartrate: hr, max_heartrate: hr + 15,
			total_elevation_gain: 60,
			best_efforts: [{ name: '5 km', distance: 5000, elapsed_time: Math.round(5000 / (speed * 1.18)) }],
			splits_metric: Array.from({ length: Math.floor(km) }, (_, i) => ({ split: i + 1, distance: 1000, moving_time: 300, elapsed_time: 300, average_speed: speed * (0.95 + rnd() * 0.1), elevation_difference: Math.round((rnd() - 0.5) * 20), average_heartrate: hr + Math.round((rnd() - 0.5) * 8), pace_zone: 0 })),
			streams: {
				time,
				heartrate: time.map((_, i) => Math.round(hr - 20 * Math.exp(-i / 40) + 6 * Math.sin(i / 30) + (rnd() - 0.5) * 4)),
				velocity: time.map((_, i) => speed * (1 + 0.08 * Math.sin(i / 25)) + (rnd() - 0.5) * 0.6),
				cadence: time.map(() => 170 + Math.round((rnd() - 0.5) * 8)),
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
d.getRaceGoals = async () => races
d.getImportedActivities = async () => acts
d.getImportedActivityById = async (i: number) => acts.find(a => a.id === i) ?? null
d.getWorkoutById = async (i: number) => ws.find(w => w.id === i) ?? null
d.getWorkoutTemplates = async () => [
	{ id: 1, name: 'Push day', kind: 'gym', workout_type: 'Push', duration: 60, user_id: 'me' },
	{ id: 2, name: 'Threshold 5×1k', kind: 'run', workout_type: 'Threshold', distance: 10, target_pace: '4:30', user_id: 'other' },
]
d.getExercises = async () => [
	{ id: 1, name: 'Bench press', body_part: 'chest' }, { id: 2, name: 'Incline dumbbell press', body_part: 'chest' },
	{ id: 3, name: 'Squat', body_part: 'legs' }, { id: 4, name: 'Romanian deadlift', body_part: 'legs' },
	{ id: 5, name: 'Pull-up', body_part: 'back' },
]
d.getProfile = async () => ({ user_name: 'Elias', goal_weight: 78, resting_hr: rest, max_hr: null, vdot_override: null })
d.getDistanceGoals = async () => []
;(auth as any).user = { id: 'me', email: 'preview@example.com' }
;(auth as any).ready = true

const Root = defineComponent(() => () =>
	h(NConfigProvider, { theme: naiveTheme.value, themeOverrides: themeOverrides.value, class: 'full-height' }, () =>
		h(NDialogProvider, null, () => h(NMessageProvider, null, () => h(MainLayout)))))

createApp(Root).use(router).mount('#app')
