import { useSync } from "../lib/sync/SyncContext"

export function SyncIndicator() {
  const { syncing, syncStatusLabel } = useSync()

  if (!syncing) return null

  return (
    <div
      className="sync-indicator"
      role="status"
      aria-live="polite"
      title={syncStatusLabel || "Syncing…"}
    >
      <span className="import-spinner" aria-hidden="true" />
    </div>
  )
}
