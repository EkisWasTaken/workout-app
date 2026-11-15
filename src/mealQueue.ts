/**
 * Diary adds made without a connection wait here and are sent when it's back,
 * so logging at the table doesn't depend on the signal.
 *
 * shortcut: if a request reached the server but its reply was lost, the retry
 * logs the entry twice. Upgrade to a client-generated id with upsert if that
 * shows up in practice.
 */
import { db } from './db'
import type { AddMealEntryPayload, MealEntry } from './types'

const KEY = 'trainlog.pendingMeals'

function read(): AddMealEntryPayload[] {
	try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
function write(list: AddMealEntryPayload[]) {
	try { list.length ? localStorage.setItem(KEY, JSON.stringify(list)) : localStorage.removeItem(KEY) } catch { /* private mode */ }
}

/** Supabase reports a dropped connection as an error whose message mentions fetch, not as a thrown TypeError. */
export function isNetworkError(err: unknown): boolean {
	if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
	const msg = err instanceof Error ? err.message : (err as { message?: string } | null)?.message ?? ''
	return /failed to fetch|networkerror|load failed|network request failed/i.test(msg)
}

export const pendingMeals = read

export function queueMeal(entry: AddMealEntryPayload) { write([...read(), entry]) }

/** Drop one waiting entry, matched by position in the queue. */
export function unqueueMeal(index: number) { const l = read(); l.splice(index, 1); write(l) }

/** Send everything waiting. Returns the saved rows; the queue keeps whatever failed. */
export async function flushMeals(): Promise<MealEntry[]> {
	const list = read()
	if (!list.length) return []
	const saved = await db.addMealEntries(list)
	write(read().slice(list.length)) // keep anything queued while the request was in flight
	return saved
}
