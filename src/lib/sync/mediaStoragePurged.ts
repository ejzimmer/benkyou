/** Persists Storage purge state per user (survives tombstone re-pull from Firestore). */

function storageKey(uid: string): string {
  return `benkyou:mediaStoragePurged:${uid}`
}

export function loadPurgedMediaIds(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === "string"))
  } catch {
    return new Set()
  }
}

export function isMediaStoragePurged(uid: string, mediaId: string): boolean {
  return loadPurgedMediaIds(uid).has(mediaId)
}

export function markMediaStoragePurged(uid: string, mediaId: string): void {
  const set = loadPurgedMediaIds(uid)
  if (set.has(mediaId)) return
  set.add(mediaId)
  localStorage.setItem(storageKey(uid), JSON.stringify([...set]))
}
