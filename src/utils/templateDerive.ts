/**
 * Distil imported workout rows (e.g. a schedule CSV) into reusable templates.
 * Pure — no DB — so it can be unit-tested and reused by the import flow.
 */
import { getWorkoutType, gymSplit } from './workouts'
import type { TemplateKind, Workout } from '@/types'

/** A CSV/import row we can distil a template from — a loose subset of a workout. */
export interface WorkoutRowLike {
	name?: string
	type?: string
	targetPace?: string
	gymType?: string
	duration?: string | number
	distance?: string | number
	notes?: string
}

/** The shape db.addWorkoutTemplate accepts. */
export interface NewTemplateInput {
	name: string
	kind: TemplateKind
	workout_type: string | null
	target_pace: string | null
	duration: number | null
	distance: number | null
	notes: string | null
	exercises: never[]
}

const toNum = (v: unknown): number | null => {
	if (v === undefined || v === null || String(v).trim() === '') return null
	const n = Number(v)
	return Number.isFinite(n) ? n : null
}

const sportToKind = (sport: string): TemplateKind =>
	sport === 'gym' ? 'gym' : sport === 'bike' ? 'bike' : sport === 'running' ? 'run' : 'other'

/** A template already in the library, for dedup. */
export interface ExistingTemplateLike {
	name: string
	kind?: TemplateKind
	workout_type?: string | null
}

/**
 * Dedup key. Gym sessions collapse by split — Push, "Push (light)" and
 * "Push (deload)" are all one Push template — while runs/bike/other stay keyed
 * by full name, so "Long run 18k" and "Long run 22k" remain distinct templates
 * (each with its own distance and notes).
 */
function dedupKey(kind: TemplateKind, name: string, gymType?: string | null): string {
	if (kind === 'gym') return `gym:${gymSplit(gymType || name).toLowerCase()}`
	return `${kind}:${name.trim().toLowerCase()}`
}

/**
 * Distil workout rows into reusable templates: gym splits collapse to one each,
 * distance sessions keep their length. Skips rest days and anything already in
 * the library. A 12-week plan CSV becomes Push/Pull/Legs + each distinct run.
 */
export function templatesFromWorkoutRows(
	rows: WorkoutRowLike[],
	existing: Iterable<ExistingTemplateLike> = [],
): NewTemplateInput[] {
	const seen = new Set<string>()
	for (const t of existing) seen.add(dedupKey(t.kind ?? 'gym', t.name, t.workout_type))

	const out: NewTemplateInput[] = []
	for (const row of rows) {
		const rowName = (row.name ?? '').trim()
		if (!rowName) continue

		// getWorkoutType reads only .type and .name; a partial row is enough.
		const sport = getWorkoutType({ name: rowName, type: row.type } as Workout)
		if (sport === 'rest') continue

		const kind = sportToKind(sport)
		const key = dedupKey(kind, rowName, row.gymType)
		if (seen.has(key)) continue
		seen.add(key)

		const distanceKind = kind === 'run' || kind === 'bike'
		const split = gymSplit(row.gymType || rowName)
		out.push({
			// Gym templates take the clean split name (Push), not "Push (deload)".
			name: kind === 'gym' ? split : rowName,
			kind,
			workout_type: kind === 'gym' ? split : null,
			target_pace: distanceKind ? (row.targetPace?.trim() || null) : null,
			duration: toNum(row.duration),
			distance: distanceKind ? toNum(row.distance) : null,
			notes: (row.notes ?? '').trim() || null,
			exercises: [],
		})
	}
	return out
}
