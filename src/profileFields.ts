/**
 * Which profile columns each migration added, and what a database that is
 * still behind one can and cannot store.
 *
 * Split out from `db.ts` because it is a policy decision rather than a database
 * call — "this tier cannot hold a height" is a fact about the schema, not about
 * the network — and because `db.ts` cannot be imported without a configured
 * Supabase client, which made the one rule that matters here untestable.
 *
 * The rule that matters: a value the schema cannot hold must never be dropped
 * quietly. Doing so reports a successful save for something that never left the
 * browser, which is how body stats typed into Profile looked saved, survived
 * every reload on that machine, and were simply absent on the next device.
 */

/** Columns present since the first goals migration. */
export const PROFILE_BASE = ['user_name', 'goal_weight', 'resting_hr', 'max_hr'] as const

/** Added by supabase_goals_v2.sql. */
export const PROFILE_V2_FIELDS = ['vdot_override'] as const

/** Added by supabase_body_stats.sql — everything the fuel planner needs. */
export const PROFILE_V4_FIELDS = ['birth_year', 'height_cm', 'sex', 'activity_level'] as const

const select = (...groups: readonly (readonly string[])[]) => groups.flat().join(', ')

export const PROFILE_COLUMNS = {
	base: select(PROFILE_BASE),
	v2: select(PROFILE_BASE, PROFILE_V2_FIELDS),
	v4: select(PROFILE_BASE, PROFILE_V2_FIELDS, PROFILE_V4_FIELDS),
}

/** Blanked on read, so a caller never sees a stale value for a column that isn't there. */
export const PROFILE_V4_BLANKS: Record<string, null> =
	Object.fromEntries(PROFILE_V4_FIELDS.map(f => [f, null]))

export interface SchemaTier {
	v2: boolean
	v4: boolean
}

/**
 * The fields of `row` this schema cannot store *and* which carry a value.
 *
 * A null or an absent field is nothing to lose — clearing your height on an old
 * database is not a failed save, it already has no height. Only a real value
 * going nowhere is worth interrupting someone for.
 */
export function unstorableFields(row: Record<string, unknown>, schema: SchemaTier): string[] {
	const out: string[] = []
	const check = (fields: readonly string[]) => {
		for (const f of fields) {
			if (row[f] !== undefined && row[f] !== null) out.push(f)
		}
	}
	if (!schema.v2) check(PROFILE_V2_FIELDS)
	if (!schema.v4) check(PROFILE_V4_FIELDS)
	return out
}

/** A copy of `row` with everything this schema can't store removed. */
export function stripUnstorable(row: Record<string, unknown>, schema: SchemaTier): Record<string, unknown> {
	const out = { ...row }
	if (!schema.v2) for (const f of PROFILE_V2_FIELDS) delete out[f]
	if (!schema.v4) for (const f of PROFILE_V4_FIELDS) delete out[f]
	return out
}
