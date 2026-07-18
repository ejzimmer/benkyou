import { useSync } from "../lib/sync/SyncContext"

export function SyncIndicator({ className }: { className?: string } = {}) {
  const { syncing, syncStatusLabel } = useSync()

  if (!syncing) return null

  return (
    <div
      className={className ? `sync-indicator ${className}` : "sync-indicator"}
      role="status"
      aria-live="polite"
      title={syncStatusLabel || "Syncing…"}
    >
      <span className="import-spinner" aria-hidden="true" />
    </div>
  )
}
