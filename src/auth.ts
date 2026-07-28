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

export async function signUp(email: string, password: string): Promise<void> {
	const { error } = await supabase.auth.signUp({ email, password })
	if (error) throw error
}

export async function signOut(): Promise<void> {
	const { error } = await supabase.auth.signOut()
	if (error) throw error
}
