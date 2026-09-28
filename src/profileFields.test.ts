import { describe, expect, it } from 'vitest'
import {
	PROFILE_COLUMNS, PROFILE_V4_BLANKS, PROFILE_V4_FIELDS,
	stripUnstorable, unstorableFields,
} from './profileFields'

const CURRENT = { v2: true, v4: true }
const NO_BODY_STATS = { v2: true, v4: false }
const ANCIENT = { v2: false, v4: false }

/** What Profile sends when someone fills in the fuel planner's stats. */
const withBodyStats = () => ({
	user_id: 'u1',
	user_name: 'Elias',
	goal_weight: 78,
	resting_hr: 52,
	max_hr: null,
	vdot_override: null,
	birth_year: 1997,
	height_cm: 183,
	sex: 'male',
	activity_level: 'light',
})

describe('PROFILE_COLUMNS', () => {
	it('adds a tier at a time, never dropping what an earlier one had', () => {
		for (const col of PROFILE_COLUMNS.base.split(', ')) {
			expect(PROFILE_COLUMNS.v2, col).toContain(col)
			expect(PROFILE_COLUMNS.v4, col).toContain(col)
		}
		expect(PROFILE_COLUMNS.v2).toContain('vdot_override')
		expect(PROFILE_COLUMNS.base).not.toContain('vdot_override')
	})

	it('only the newest tier knows about the body stats', () => {
		for (const field of PROFILE_V4_FIELDS) {
			expect(PROFILE_COLUMNS.v4, field).toContain(field)
			expect(PROFILE_COLUMNS.v2, field).not.toContain(field)
			expect(PROFILE_COLUMNS.base, field).not.toContain(field)
		}
	})

	it('blanks every field it cannot read, so no stale value survives a fallback', () => {
		expect(Object.keys(PROFILE_V4_BLANKS).sort()).toEqual([...PROFILE_V4_FIELDS].sort())
		for (const v of Object.values(PROFILE_V4_BLANKS)) expect(v).toBeNull()
	})
})

describe('unstorableFields', () => {
	it('finds nothing to lose on a current database', () => {
		expect(unstorableFields(withBodyStats(), CURRENT)).toEqual([])
	})

	it('names every body stat a database behind the migration would swallow', () => {
		expect(unstorableFields(withBodyStats(), NO_BODY_STATS).sort())
			.toEqual(['activity_level', 'birth_year', 'height_cm', 'sex'])
	})

	it('says nothing when the values being saved are empty anyway', () => {
		// Clearing your height on an old database is not a failed save: there was
		// never a height there to lose.
		const row = { user_name: 'Elias', birth_year: null, height_cm: null, sex: null, activity_level: null }
		expect(unstorableFields(row, NO_BODY_STATS)).toEqual([])
	})

	it('ignores fields the caller never mentioned', () => {
		expect(unstorableFields({ user_name: 'Elias' }, NO_BODY_STATS)).toEqual([])
	})

	it('reports a partial edit, not just an all-or-nothing one', () => {
		const row = { height_cm: 183, birth_year: null, sex: null, activity_level: null }
		expect(unstorableFields(row, NO_BODY_STATS)).toEqual(['height_cm'])
	})

	it('covers the older tier too', () => {
		expect(unstorableFields({ vdot_override: 44 }, ANCIENT)).toEqual(['vdot_override'])
		expect(unstorableFields({ vdot_override: 44 }, NO_BODY_STATS)).toEqual([])
	})
})

describe('stripUnstorable', () => {
	it('leaves a current database row untouched', () => {
		const row = withBodyStats()
		expect(stripUnstorable(row, CURRENT)).toEqual(row)
	})

	it('removes only what cannot be stored, so the rest of the save still lands', () => {
		const stripped = stripUnstorable(withBodyStats(), NO_BODY_STATS)
		expect(stripped.user_name).toBe('Elias')
		expect(stripped.goal_weight).toBe(78)
		expect(stripped.resting_hr).toBe(52)
		for (const field of PROFILE_V4_FIELDS) expect(stripped, field).not.toHaveProperty(field)
	})

	it('does not mutate what it was given', () => {
		const row = withBodyStats()
		stripUnstorable(row, ANCIENT)
		expect(row.height_cm).toBe(183)
		expect(row.vdot_override).toBeNull()
	})

	it('strips a field whether or not it had a value — the column is simply absent', () => {
		const stripped = stripUnstorable({ height_cm: null, user_name: 'Elias' }, NO_BODY_STATS)
		expect(stripped).not.toHaveProperty('height_cm')
		expect(stripped.user_name).toBe('Elias')
	})
})
