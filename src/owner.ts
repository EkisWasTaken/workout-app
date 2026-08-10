/**
 * Who is allowed to see developer diagnostics.
 *
 * Now that other people have accounts, the app can't keep telling whoever is
 * signed in to "run supabase_goals_v2.sql in the Supabase SQL editor" — they
 * have no dashboard, no database and no idea what that means. Messages about
 * schema state are gated on this so the owner still gets the exact filename
 * and everyone else gets plain language.
 *
 * Set VITE_OWNER_EMAIL in .env. If it's unset nobody is the owner, which fails
 * safe: everyone sees the friendly message.
 */
import { computed } from 'vue'
import { auth } from './auth'

const OWNER_EMAIL = String(import.meta.env.VITE_OWNER_EMAIL || '').trim().toLowerCase()

export const isOwner = computed(() => {
	if (!OWNER_EMAIL) return false
	return (auth.user?.email || '').toLowerCase() === OWNER_EMAIL
})

/** What to tell a non-owner when the database is behind the app. */
export const GENERIC_SCHEMA_MESSAGE =
	'Some features are temporarily unavailable while the app is being updated. Nothing you have logged is lost.'
