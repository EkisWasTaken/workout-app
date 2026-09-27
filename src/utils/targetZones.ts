/**
 * The target-pace zones a session can be given by hand.
 *
 * `targetPace` is what turns a line on the calendar into a prescription: the
 * schedule reads it and shows the pace your current fitness says that zone is
 * worth today (see `paceAdvice.ts`). Generated plans and CSV imports have
 * always written it — but there was no field for it anywhere in the UI, so a
 * session you created yourself could never have one. You had to build a plan or
 * import a spreadsheet to get a paced session.
 *
 * This is the list that field offers. Every label here is one `matchZone` in
 * `vdot.ts` recognises, which is the whole contract: a stored label that
 * doesn't match derives no pace and is shown verbatim instead.
 */

export interface TargetZoneOption {
	/** Stored verbatim in `targetPace`. */
	value: string
	label: string
	/** What the zone is for, shown under the picker. */
	hint: string
}

/**
 * Ordered easiest to hardest, plus race pace.
 *
 * "Race pace" is separate from the others because it resolves against the goal
 * a session is training for rather than current fitness — rehearsing goal pace
 * is the point of the session, so it must not be scaled down to what you can
 * do today.
 */
export const TARGET_ZONES: TargetZoneOption[] = [
	{ value: 'Recovery', label: 'Recovery', hint: 'Deliberately slow — moving blood through tired legs.' },
	{ value: 'Easy', label: 'Easy', hint: 'Conversational. Most of your running should be here.' },
	{ value: 'Threshold', label: 'Threshold', hint: 'Comfortably hard — a sentence, not a conversation.' },
	{ value: 'VO₂ max', label: 'VO₂ max', hint: 'Hard intervals, 3–5 minutes, where the last rep is a fight.' },
	{ value: 'Repetition', label: 'Reps / strides', hint: 'Short and fast, fully recovered. Form and economy work.' },
	{ value: 'Race pace', label: 'Race pace', hint: 'From the goal this session trains for, not from today’s fitness.' },
]

/** Everything in the list must be something `paceAdvice` can actually resolve. */
export const ZONE_VALUES = TARGET_ZONES.map(z => z.value)

/**
 * Which option a stored `targetPace` corresponds to, or null.
 *
 * Deliberately an exact match and nothing cleverer. Mapping by zone *key*
 * looked tempting — "Marathon" and "Race pace" share one — but they do not mean
 * the same thing: race pace resolves against the goal, the marathon zone
 * against current fitness, and quietly rewriting one as the other on save would
 * change what the session prescribes. Anything not on the list stays free text,
 * which the schedule already knows how to show verbatim.
 */
export function zoneOptionFor(targetPace: string | null | undefined): TargetZoneOption | null {
	const raw = (targetPace || '').trim()
	if (!raw) return null
	return TARGET_ZONES.find(z => z.value.toLowerCase() === raw.toLowerCase()) ?? null
}

/** True when the stored value is free text the picker shouldn't try to own. */
export const isFreeformTarget = (targetPace: string | null | undefined): boolean => {
	const raw = (targetPace || '').trim()
	return !!raw && zoneOptionFor(raw) === null
}
