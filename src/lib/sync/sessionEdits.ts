/**
 * Tracks which cards have been created/edited this session and haven't been
 * pushed to Firestore yet. Mirrored to localStorage so a refresh (or the tab
 * being closed) before hitting "Sync" doesn't forget which cards are still
 * pending — the edits themselves are already safe in Dexie, but without this
 * the "Sync" button would forget to flag them as unsynced. Drives that global
 * button: it shows a count and turns green once there's something to push,
 * and reverts to its plain blue state once those specific cards have been
 * pushed.
 */

import { useSyncExternalStore } from "react"

const STORAGE_KEY = "benkyou:sessionEditedCardIds"

function loadPersisted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === "string"))
  } catch {
    return new Set()
  }
}

function persist(ids: Set<string>): void {
  try {
    if (ids.size === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
    }
  } catch {
    // Private-browsing/quota errors: tracking just falls back to in-memory
    // only for this load, same as before this persistence existed.
  }
}

const editedCardIds = loadPersisted()
const listeners = new Set<() => void>()
// Cached array snapshot so useSyncExternalStore's getSnapshot returns a
// stable reference between notifications (a fresh array every call would
// make React think the store changed on every render).
let cachedIds: string[] = [...editedCardIds]

function notify(): void {
  cachedIds = [...editedCardIds]
  persist(editedCardIds)
  for (const listener of listeners) listener()
}

export function markCardEdited(cardId: string): void {
  if (editedCardIds.has(cardId)) return
  editedCardIds.add(cardId)
  notify()
}

export function removeSessionEditedCardIds(ids: Iterable<string>): void {
  let changed = false
  for (const id of ids) {
    if (editedCardIds.delete(id)) changed = true
  }
  if (changed) notify()
}

export function clearSessionEdits(): void {
  if (editedCardIds.size === 0) return
  editedCardIds.clear()
  notify()
}

export function getSessionEditedCardIds(): string[] {
  return cachedIds
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSessionEditedCardIds(): string[] {
  return useSyncExternalStore(subscribe, getSessionEditedCardIds)
}
