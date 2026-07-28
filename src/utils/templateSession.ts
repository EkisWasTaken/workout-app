/**
 * Turn a workout template into a dated workout. Shared by the Templates page and
 * the Schedule page so "add to schedule" behaves identically wherever it's used.
 */
import { db } from '@/db'
import type { WorkoutTemplate, WorkoutTemplateExercise, AddWorkoutPayload } from '@/types'

/** A one-line session plan from a gym template's exercises, e.g. "Bench 3×8-12; Squat 5×5". */
export function gymNotes(
	template: Pick<WorkoutTemplate, 'notes'>,
	exercises: Pick<WorkoutTemplateExercise, 'exercise_name' | 'sets' | 'reps'>[],
): string {
	const lines = exercises.map(ex => {
		const setsReps = [ex.sets ? `${ex.sets}×` : '', ex.reps ?? ''].join('').trim()
		return setsReps ? `${ex.exercise_name} ${setsReps}` : ex.exercise_name
	})
	return [template.notes, lines.join('; ')].filter(Boolean).join(' — ')
}

/**
 * Build the workout payload a template schedules onto `dateStr` (YYYY-MM-DD).
 * Gym templates fetch their exercise list to summarise it into the notes.
 */
export async function buildWorkoutFromTemplate(
	template: WorkoutTemplate,
	dateStr: string,
): Promise<AddWorkoutPayload> {
	if (template.kind === 'run') {
		return {
			name: template.name,
			date: dateStr,
			type: 'Running',
			isCompleted: 0,
			targetPace: template.target_pace ?? undefined,
			distance: template.distance ?? undefined,
			duration: template.duration ?? undefined,
			notes: template.notes ?? undefined,
		}
	}

	const exercises = await db.getWorkoutTemplateExercises(template.id)
	return {
		name: template.name,
		date: dateStr,
		type: 'gym',
		isCompleted: 0,
		gymType: template.workout_type ?? undefined,
		duration: template.duration ?? undefined,
		notes: gymNotes(template, exercises) || undefined,
	}
}
