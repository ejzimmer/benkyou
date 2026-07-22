import { useState } from "react"
import { useAuth } from "../lib/auth/AuthContext"
import { useSync } from "../lib/sync/SyncContext"
import { useSessionEditedCardIds } from "../lib/sync/sessionEdits"
import { RefreshIcon } from "./RefreshIcon"

type Props = {
  /** Renders as a plain in-flow item instead of the fixed top-right banner —
   *  used inside the review header, which places its own copy directly in
   *  its button row rather than relying on the fixed global one. */
  inline?: boolean
}

/**
 * "Push this device's edited/created cards to the backend" button. Fixed to
 * the top of the viewport, to the right, on every screen except the review
 * flow (which renders an inline copy in its own header) — cards are no
 * longer synced automatically, so this is the only way edits made this
 * session reach another device.
 *
 * Goes through SyncContext's `syncEditsNow` (rather than calling
 * `pushSessionEditsNow` directly) so it shares the same in-flight guard as
 * "Sync now"/"Upload changes" — the three can't race each other's Firestore
 * writes.
 */
export function SyncEditsButton({ inline = false }: Props) {
  const { user, offlineOnly } = useAuth()
  const { syncEditsNow, syncing } = useSync()
  const editedCardIds = useSessionEditedCardIds()
  const [error, setError] = useState<string | null>(null)

  if (offlineOnly || !user) return null

  const hasEdits = editedCardIds.length > 0

  async function onClick() {
    setError(null)
    try {
      await syncEditsNow()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sync edits")
    }
  }

  const button = (
    <button
      type="button"
      className={
        hasEdits ? "btn secondary green sync-edits-btn" : "btn secondary white sync-edits-btn"
      }
      onClick={() => void onClick()}
      disabled={syncing}
      aria-label={syncing ? "Syncing…" : hasEdits ? `Sync (${editedCardIds.length})` : "Sync"}
    >
      {syncing ? (
        <span className="import-spinner" aria-hidden="true" />
      ) : hasEdits ? (
        <>
          <RefreshIcon className="sync-edits-icon" />
          {` (${editedCardIds.length})`}
        </>
      ) : (
        <RefreshIcon className="sync-edits-icon" />
      )}
    </button>
  )

  if (inline) {
    return (
      <span className="sync-edits-inline">
        {button}
        {error && <span className="error small">{error}</span>}
      </span>
    )
  }

  return (
    <div className="sync-edits-banner">
      {button}
      {error && <span className="error small">{error}</span>}
    </div>
  )
}
