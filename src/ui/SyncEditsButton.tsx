import { useState } from "react"
import { useAuth } from "../lib/auth/AuthContext"
import { useSessionEditedCardIds } from "../lib/sync/sessionEdits"
import { pushSessionEditsNow } from "../services/decks"

/**
 * Global "push this device's edited/created cards to the backend" button.
 * Fixed to the top of the viewport so it's visible regardless of which
 * screen is showing — cards are no longer synced automatically, so this is
 * the only way edits made this session reach another device.
 */
export function SyncEditsButton() {
  const { user, offlineOnly } = useAuth()
  const editedCardIds = useSessionEditedCardIds()
  const [pushing, setPushing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (offlineOnly || !user || editedCardIds.length === 0) return null

  async function onClick() {
    setPushing(true)
    setError(null)
    try {
      await pushSessionEditsNow(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sync edits")
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="sync-edits-banner">
      <button
        type="button"
        className="btn primary sync-edits-btn"
        onClick={() => void onClick()}
        disabled={pushing}
      >
        {pushing
          ? "Syncing edits…"
          : `Sync edits (${editedCardIds.length})`}
      </button>
      {error && <span className="error small">{error}</span>}
    </div>
  )
}
