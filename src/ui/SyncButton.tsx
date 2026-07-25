import { useState } from "react"
import { useAuth } from "../lib/auth/AuthContext"
import { useSync } from "../lib/sync/SyncContext"
import { RefreshIcon } from "./RefreshIcon"

/**
 * Full two-way sync button, rendered inline in every page's header next to
 * the user menu — the only manual sync trigger in the app now that Settings
 * is gone. Pulls remote changes, resolves conflicts, and pushes local ones.
 */
export function SyncButton() {
  const { user, offlineOnly } = useAuth()
  const { syncNow, syncing, conflictActive, lastSyncedAt } = useSync()
  const [error, setError] = useState<string | null>(null)

  if (offlineOnly || !user) return null

  async function onClick() {
    setError(null)
    try {
      await syncNow()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sync")
    }
  }

  const label = conflictActive ? "Resolve conflict…" : syncing ? "Syncing…" : "Sync"

  return (
    <span className="sync-inline">
      <button
        type="button"
        className="btn secondary white sync-btn"
        onClick={() => void onClick()}
        disabled={syncing || conflictActive}
        aria-label={label}
        title={lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}` : undefined}
      >
        {syncing ? (
          <span className="import-spinner" aria-hidden="true" />
        ) : (
          <RefreshIcon className="sync-icon" />
        )}
      </button>
      {error && <span className="error small">{error}</span>}
    </span>
  )
}
