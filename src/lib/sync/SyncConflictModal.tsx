import type { SyncConflict, SyncConflictChoice } from "./syncTypes"

type Props = {
  conflict: SyncConflict
  conflictNumber: number
  onChoose: (choice: SyncConflictChoice) => void
}

export function SyncConflictModal({
  conflict,
  conflictNumber,
  onChoose,
}: Props) {
  const title =
    conflict.entityType === "deck"
      ? "Deck conflict"
      : conflict.entityType === "card"
        ? "Card conflict"
        : conflict.entityType === "scheduling"
          ? "Review schedule conflict"
          : "Image conflict"

  return (
    <div className="sync-conflict-backdrop" role="dialog" aria-modal="true">
      <div className="sync-conflict-panel panel">
        <h2>{title}</h2>
        <p className="muted small">
          Conflict #{conflictNumber} — both devices changed this item since the last
          sync. Which version should we keep?
        </p>

        <div className="sync-conflict-columns">
          <section className="sync-conflict-side">
            <h3>This device</h3>
            <p className="small muted">
              Updated {new Date(conflict.localUpdatedAt).toLocaleString()}
            </p>
            {conflict.entityType === "media" ? (
              <img
                src={conflict.localPreviewUrl}
                alt="This device"
                className="sync-conflict-image"
              />
            ) : (
              <p>{conflict.localSummary}</p>
            )}
            <button
              type="button"
              className="btn primary"
              onClick={() => onChoose("local")}
            >
              Keep this device
            </button>
          </section>

          <section className="sync-conflict-side">
            <h3>Cloud / other device</h3>
            <p className="small muted">
              Updated {new Date(conflict.remoteUpdatedAt).toLocaleString()}
            </p>
            {conflict.entityType === "media" ? (
              <img
                src={conflict.remotePreviewUrl}
                alt="Cloud copy"
                className="sync-conflict-image"
              />
            ) : (
              <p>{conflict.remoteSummary}</p>
            )}
            <button
              type="button"
              className="btn primary"
              onClick={() => onChoose("remote")}
            >
              Keep cloud copy
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
