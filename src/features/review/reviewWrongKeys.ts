/**
 * Persists which queue items (`dueItemKey` — `${cardId}:${modeId}`) have been
 * judged incorrect this session and are awaiting a correcting redo, keyed by
 * `scopeKey` (deckId, or "all"). Backed by `sessionStorage` rather than
 * component state so it survives the remount that happens when the user
 * navigates away mid-session to edit a card and back (`resumeCardId` flow in
 * `ReviewSessionPage`) — without this, that round trip silently forgot which
 * items were in the "needs redo" pile, so redoing one afterwards counted as
 * finishing a fresh item (残り) instead of clearing a redo (やり直し).
 */

const STORAGE_PREFIX = "benkyou:reviewWrongKeys:"

function storageKey(scopeKey: string): string {
  return `${STORAGE_PREFIX}${scopeKey}`
}

export function readWrongKeys(scopeKey: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(storageKey(scopeKey))
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function writeWrongKeys(scopeKey: string, keys: Set<string>) {
  try {
    sessionStorage.setItem(storageKey(scopeKey), JSON.stringify([...keys]))
  } catch {
    // Storage unavailable (private browsing, quota) — the redo split just
    // won't survive a remount, same as the rest of the page's in-memory state.
  }
}
