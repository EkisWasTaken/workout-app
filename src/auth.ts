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
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
	/** null until the first getSession() resolves — used to avoid a login flash. */
	ready: boolean
	session: Session | null
	user: User | null
}

export const auth = reactive<AuthState>({ ready: false, session: null, user: null })

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

export async function initAuth(): Promise<void> {
	const { data } = await supabase.auth.getSession()
	auth.session = data.session
	auth.user = data.session?.user ?? null
	auth.ready = true
	previousUserId = auth.user?.id ?? null

	supabase.auth.onAuthStateChange((_event, session) => {
		auth.session = session
		auth.user = session?.user ?? null
		emitIfUserChanged(auth.user)
	})
}

export async function signIn(email: string, password: string): Promise<void> {
	const { error } = await supabase.auth.signInWithPassword({ email, password })
	if (error) throw error
}

/**
 * Create an account. The display name rides along as user metadata so the app
 * can greet someone by name on their very first load — the profile row doesn't
 * exist yet at this point, and an unnamed "Good evening," is a poor welcome.
 */
export async function signUp(email: string, password: string, name?: string): Promise<void> {
	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: name?.trim() ? { data: { display_name: name.trim() } } : undefined,
	})
	if (error) throw error
}

/** Email a password-reset link back to this app. */
export async function resetPassword(email: string): Promise<void> {
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: window.location.origin,
	})
	if (error) throw error
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
