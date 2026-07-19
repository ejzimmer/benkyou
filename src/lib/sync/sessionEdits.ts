/**
 * Tracks which cards have been created/edited this session, in memory only
 * (not persisted — a fresh page load starts with an empty set). Drives the
 * global "Sync edits" button: it only appears once there's something to push,
 * and disappears once those specific cards have been pushed.
 */

import { useSyncExternalStore } from "react"

const editedCardIds = new Set<string>()
const listeners = new Set<() => void>()
// Cached array snapshot so useSyncExternalStore's getSnapshot returns a
// stable reference between notifications (a fresh array every call would
// make React think the store changed on every render).
let cachedIds: string[] = []

function notify(): void {
  cachedIds = [...editedCardIds]
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
