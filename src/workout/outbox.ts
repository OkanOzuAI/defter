/**
 * Writes that still have to reach Supabase. Everything is keyed by row id, so the
 * queue holds the latest version of each row and flushing twice is harmless.
 * Lives in localStorage: it survives closing the tab, a locked phone and no signal.
 */
import { useSyncExternalStore } from 'react'
import { isNetworkError } from '../api/errors'
import { deleteSessions, deleteSetLogs, upsertSessions, upsertSetLogs } from '../api/workouts'
import type { SessionRow, SetRow } from './types'

type Outbox = {
  sessions: Record<string, SessionRow>
  sets: Record<string, SetRow>
  deletedSets: string[]
  deletedSessions: string[]
}

const EMPTY: Outbox = { sessions: {}, sets: {}, deletedSets: [], deletedSessions: [] }
const storageKey = (userId: string) => `defter.outbox.${userId}`

const listeners = new Set<() => void>()
let pendingCount = 0
let lastError = false

function read(userId: string): Outbox {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Outbox) } : EMPTY
  } catch {
    return EMPTY
  }
}

function write(userId: string, outbox: Outbox) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(outbox))
  } catch {
    // Storage full: the draft still holds the data and the next change retries.
  }
  pendingCount = count(outbox)
  listeners.forEach((fn) => fn())
}

function count(outbox: Outbox): number {
  return (
    Object.keys(outbox.sessions).length +
    Object.keys(outbox.sets).length +
    outbox.deletedSets.length +
    outbox.deletedSessions.length
  )
}

const without = <T>(record: Record<string, T>, ids: string[]): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([id]) => !ids.includes(id)))

export type OutboxChange = {
  session?: SessionRow
  sets?: SetRow[]
  deleteSets?: string[]
  deleteSession?: string
}

export function enqueue(userId: string, change: OutboxChange) {
  let { sessions, sets, deletedSets, deletedSessions } = read(userId)

  if (change.session) sessions = { ...sessions, [change.session.id]: change.session }

  if (change.sets?.length) {
    const ids = change.sets.map((row) => row.id)
    sets = { ...sets, ...Object.fromEntries(change.sets.map((row) => [row.id, row])) }
    deletedSets = deletedSets.filter((id) => !ids.includes(id))
  }

  if (change.deleteSets?.length) {
    sets = without(sets, change.deleteSets)
    deletedSets = [...new Set([...deletedSets, ...change.deleteSets])]
  }

  if (change.deleteSession) {
    const id = change.deleteSession
    sessions = without(sessions, [id])
    sets = Object.fromEntries(Object.entries(sets).filter(([, row]) => row.session_id !== id))
    deletedSessions = [...new Set([...deletedSessions, id])]
  }

  write(userId, { sessions, sets, deletedSets, deletedSessions })
}

let flushing = false
const flushListeners = new Set<() => void>()

/** Runs after rows reached the server, e.g. to refresh history lists. */
export function onFlushed(fn: () => void) {
  flushListeners.add(fn)
  return () => {
    flushListeners.delete(fn)
  }
}

/** Sends everything queued. Returns true when rows were written. Safe to call any time. */
export async function flush(userId: string): Promise<boolean> {
  if (flushing || !navigator.onLine) return false
  const sent = read(userId)
  if (count(sent) === 0) return false

  flushing = true
  let again = false
  try {
    // Sessions first: sets reference them.
    await upsertSessions(Object.values(sent.sessions))
    await upsertSetLogs(Object.values(sent.sets))
    await deleteSetLogs(sent.deletedSets)
    await deleteSessions(sent.deletedSessions)
    lastError = false

    // Keep whatever changed while the request was in flight.
    const now = read(userId)
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
    const left: Outbox = {
      sessions: Object.fromEntries(
        Object.entries(now.sessions).filter(([id, row]) => !same(row, sent.sessions[id])),
      ),
      sets: Object.fromEntries(
        Object.entries(now.sets).filter(([id, row]) => !same(row, sent.sets[id])),
      ),
      deletedSets: now.deletedSets.filter((id) => !sent.deletedSets.includes(id)),
      deletedSessions: now.deletedSessions.filter((id) => !sent.deletedSessions.includes(id)),
    }
    write(userId, left)
    again = count(left) > 0
    // Lists are refreshed only once the server has everything, never from a half-sent state.
    if (!again) flushListeners.forEach((fn) => fn())
    return true
  } catch (error) {
    // Offline or server trouble: everything stays queued for the next attempt.
    lastError = !isNetworkError(error)
    if (lastError) console.error('Sync failed', error)
    listeners.forEach((fn) => fn())
    return false
  } finally {
    flushing = false
    // Something was queued while this request was in flight: send it right away.
    if (again) void flush(userId)
  }
}

/** Reads the stored queue size after login or a reload. */
export function loadOutbox(userId: string) {
  pendingCount = count(read(userId))
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function usePendingCount(): number {
  return useSyncExternalStore(subscribe, () => pendingCount)
}

export function useSyncError(): boolean {
  return useSyncExternalStore(subscribe, () => lastError)
}
