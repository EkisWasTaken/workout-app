/**
 * Authentication state, backed by Supabase Auth.
 *
 * The supabase-js client persists the session to localStorage, so a signed-in
 * user stays signed in across reloads. `initAuth()` runs once at boot; the rest
 * of the app reads the reactive `auth` object and calls `currentUserId()` when
 * it needs to stamp a row with its owner.
 */
import { reactive } from 'vue'
import { supabase } from './supabase'
import { db } from './db'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
	/** null until the first getSession() resolves — used to avoid a login flash. */
	ready: boolean
	session: Session | null
	user: User | null
	/**
	 * Arrived through a password-reset link. The link signs you in, but the
	 * point of it is choosing a new password — so the gate stays up, asking for
	 * one, until that's done.
	 */
	recovering: boolean
	/** Why an email link didn't work (expired, already used), to show on the gate. */
	linkError: string | null
}

export const auth = reactive<AuthState>({ ready: false, session: null, user: null, recovering: false, linkError: null })

/** The signed-in user's id. Throws if called before login — never happens once
 *  the AuthGate has let the app render, which is the only time db writes run. */
export function currentUserId(): string {
	const id = auth.user?.id
	if (!id) throw new Error('NOT_AUTHENTICATED')
	return id
}

let listeners: Array<(user: User | null) => void> = []

/** Register a callback fired whenever the signed-in user changes (login/logout).
 *  Used to (re)hydrate per-user state and clear the previous user's cache. */
export function onUserChange(fn: (user: User | null) => void): void {
	listeners.push(fn)
}

let previousUserId: string | null = null

function emitIfUserChanged(user: User | null) {
	const id = user?.id ?? null
	if (id === previousUserId) return
	previousUserId = id
	for (const fn of listeners) fn(user)
}

/**
 * Where email links should send people back to: this page, path included.
 * `location.origin` alone dropped the `/workout-app/` that GitHub Pages serves
 * the app under, so every reset link opened a 404.
 */
function appBaseUrl(): string {
	return window.location.origin + window.location.pathname
}

/** Marker added to the reset link, so the return trip is recognisable. */
const RESET_PARAM = 'reset'

/**
 * Read what an email link left in the URL, then tidy it away.
 *
 * Errors come back in the query string (PKCE) or, from older links, the hash —
 * and a hash like `#error=…` is something the hash router would try to route.
 */
function consumeReturnUrl(): { reset: boolean; hadCode: boolean } {
	const url = new URL(window.location.href)
	const reset = url.searchParams.has(RESET_PARAM)
	const hadCode = url.searchParams.has('code')

	const hashParams = new URLSearchParams(url.hash.startsWith('#error') ? url.hash.slice(1) : '')
	const hasHashError = hashParams.has('error')
	const err = url.searchParams.get('error_description') || hashParams.get('error_description')
	if (err) {
		auth.linkError = /expired|invalid/i.test(err)
			? 'That link has expired or was already used. Request a new one below.'
			: err.replace(/\+/g, ' ')
	}

	const junk = [RESET_PARAM, 'code', 'error', 'error_code', 'error_description']
	if (junk.some(k => url.searchParams.has(k)) || hasHashError) {
		for (const k of junk) url.searchParams.delete(k)
		if (hasHashError) url.hash = '#/'
		window.history.replaceState(window.history.state, '', url.toString())
	}
	return { reset, hadCode }
}

export async function initAuth(): Promise<void> {
	// Listen before the first getSession(): that call is what finishes exchanging
	// an email link's code, and it announces PASSWORD_RECOVERY as it does.
	supabase.auth.onAuthStateChange((event, session) => {
		if (event === 'PASSWORD_RECOVERY') auth.recovering = true
		if (event === 'SIGNED_OUT') auth.recovering = false
		auth.session = session
		auth.user = session?.user ?? null
		emitIfUserChanged(auth.user)
	})

	const { data } = await supabase.auth.getSession()
	const { reset, hadCode } = consumeReturnUrl()
	auth.session = data.session
	auth.user = data.session?.user ?? null
	if (reset && auth.user) auth.recovering = true
	// PKCE ties a link to the browser that asked for it. Opened anywhere else,
	// the code can't be exchanged and the link silently does nothing — say why.
	if (hadCode && !auth.user && !auth.linkError) {
		auth.linkError = reset
			? 'Open the reset link in the same browser you requested it from, or request a new one here.'
			: 'That link didn’t sign you in. Sign in below, or request a new link.'
	}
	auth.ready = true
	previousUserId = auth.user?.id ?? null
}

export async function signIn(email: string, password: string): Promise<void> {
	const { error } = await supabase.auth.signInWithPassword({ email, password })
	if (error) throw error
}

/**
 * Create an account. The display name rides along as user metadata so the app
 * can greet someone by name on their very first load — the profile row doesn't
 * exist yet at this point, and an unnamed "Good evening," is a poor welcome.
 *
 * The invite code rides along the same way. The database checks it as the
 * account is created (supabase_invites.sql) and refuses the sign-up without a
 * valid one — checking it here instead would stop no one, since the sign-up
 * endpoint is public.
 */
export async function signUp(email: string, password: string, name: string | undefined, inviteCode: string): Promise<void> {
	const data: Record<string, string> = { invite_code: inviteCode.trim() }
	if (name?.trim()) data.display_name = name.trim()
	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: { data, emailRedirectTo: appBaseUrl() },
	})
	if (error) throw error
}

/** Email a password-reset link back to this app. */
export async function resetPassword(email: string): Promise<void> {
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${appBaseUrl()}?${RESET_PARAM}=1`,
	})
	if (error) throw error
}

/** Finish a reset, or change the password from Profile. */
export async function updatePassword(password: string): Promise<void> {
	const { error } = await supabase.auth.updateUser({ password })
	if (error) throw error
	auth.recovering = false
	auth.linkError = null
}

/**
 * Ask for a new sign-in email. Returns true when it changed straight away, false
 * when Supabase is waiting for the change to be confirmed from the inbox.
 */
export async function updateEmail(email: string): Promise<boolean> {
	const { data, error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: appBaseUrl() })
	if (error) throw error
	if (data.user) auth.user = data.user
	return (data.user?.email || '').toLowerCase() === email.toLowerCase()
}

/**
 * Check the signed-in user's password before something that can't be undone.
 * A session left open on a shared computer shouldn't be enough to delete an
 * account or lock its owner out of it.
 */
export async function verifyPassword(password: string): Promise<boolean> {
	const email = auth.user?.email
	if (!email) return false
	const { error } = await supabase.auth.signInWithPassword({ email, password })
	return !error
}

/**
 * Delete the account and everything in it.
 *
 * Photos first: storage files can't be removed from SQL, so the app clears the
 * user's folder while it still has a session to do it with. Then the database
 * function removes every row and the auth user itself.
 */
export async function deleteAccount(): Promise<void> {
	await db.deleteAllMyPhotoFiles()
	const { error } = await supabase.rpc('delete_my_account')
	if (error) throw error
	// The user no longer exists, so a server-side sign-out would fail; just drop
	// the local session.
	await supabase.auth.signOut({ scope: 'local' })
}

/** The name chosen at sign-up, if there was one. */
export function signupName(): string | null {
	const n = auth.user?.user_metadata?.display_name
	return typeof n === 'string' && n.trim() ? n.trim() : null
}

export async function signOut(): Promise<void> {
	const { error } = await supabase.auth.signOut()
	if (error) throw error
}
