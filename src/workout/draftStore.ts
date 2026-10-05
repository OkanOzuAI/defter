/**
 * The active workout, kept in localStorage and rewritten on every input, so closing
 * the tab, locking the phone or losing signal never loses a set.
 */
import { useSyncExternalStore } from 'react'
import { toSessionRow, toSetRows } from './draft'
import { enqueue, flush, type OutboxChange } from './outbox'
import type { Draft } from './types'

const storageKey = (userId: string) => `defter.draft.${userId}`
const cache = new Map<string, Draft | null>()
const listeners = new Set<() => void>()

function read(userId: string): Draft | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

export function getDraft(userId: string): Draft | null {
  if (!cache.has(userId)) cache.set(userId, read(userId))
  return cache.get(userId) ?? null
}

function store(userId: string, draft: Draft | null) {
  cache.set(userId, draft)
  try {
    if (draft) localStorage.setItem(storageKey(userId), JSON.stringify(draft))
    else localStorage.removeItem(storageKey(userId))
  } catch {
    // Storage unavailable: the draft still lives in memory for this page load.
  }
  listeners.forEach((fn) => fn())
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * What changed between two versions of the draft, as rows to send.
 * Completed sets are stored; un-checking or deleting one removes it again.
 * The session row is only created once there is something to attach to it.
 */
export function diffDrafts(prev: Draft | null, next: Draft, userId: string): OutboxChange {
  const before = new Map((prev ? toSetRows(prev, userId) : []).map((row) => [row.id, row]))
  const after = toSetRows(next, userId)
  const afterIds = new Set(after.map((row) => row.id))

  const change: OutboxChange = {
    sets: after.filter((row) => !same(row, before.get(row.id))),
    deleteSets: [...before.keys()].filter((id) => !afterIds.has(id)),
  }

  const hadRows = before.size > 0
  const session = toSessionRow(next, userId)
  if (after.length > 0 || hadRows) {
    if (!hadRows || !prev || !same(session, toSessionRow(prev, userId))) change.session = session
  }
  return change
}

/** Applies a change to the draft, saves it, and queues the rows that changed. */
export function updateDraft(userId: string, fn: (draft: Draft) => Draft) {
  const prev = getDraft(userId)
  if (!prev) return
  const next = fn(prev)
  if (next === prev) return
  store(userId, next)

  // An edited past session is sent in one go when it is saved, so "cancel" really cancels.
  if (next.editing) return
  enqueue(userId, diffDrafts(prev, next, userId))
  void flush(userId)
}

export function startDraft(userId: string, draft: Draft) {
  store(userId, draft)
}

/** "Antrenmanımı kaydet": stamps the end time, queues everything, clears the draft. */
export function finishDraft(userId: string): Draft | null {
  const draft = getDraft(userId)
  if (!draft) return null

  const finished: Draft = {
    ...draft,
    ended_at: draft.editing ? draft.ended_at : new Date().toISOString(),
    rest: null,
  }
  const sets = toSetRows(finished, userId)
  const kept = new Set(sets.map((row) => row.id))
  enqueue(userId, {
    session: toSessionRow(finished, userId),
    sets,
    deleteSets: draft.originalSetIds.filter((id) => !kept.has(id)),
  })
  store(userId, null)
  void flush(userId)
  return finished
}

/** Throws the draft away. A new session is removed from the server too; an edit is just dropped. */
export function discardDraft(userId: string) {
  const draft = getDraft(userId)
  if (!draft) return
  if (!draft.editing) enqueue(userId, { deleteSession: draft.id })
  store(userId, null)
  void flush(userId)
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  // Another tab changed the draft: drop the cached copy.
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith('defter.draft.')) {
      cache.clear()
      fn()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

export function useDraft(userId: string | undefined): Draft | null {
  return useSyncExternalStore(subscribe, () => (userId ? getDraft(userId) : null))
}
