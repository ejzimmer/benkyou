import type { SyncConflict, SyncConflictChoice } from "./syncTypes"
import { summariesLookIdentical } from "./syncCompare"

type Props = {
  conflict: SyncConflict
  conflictNumber: number
  onChoose: (choice: SyncConflictChoice, applyToAllRemaining: boolean) => void
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

  const looksSame = summariesLookIdentical(
    conflict.localSummary,
    conflict.remoteSummary,
  )

  return (
    <div className="sync-conflict-backdrop" role="dialog" aria-modal="true">
      <div className="sync-conflict-panel panel">
        <h2>{title}</h2>
        <p className="muted small">
          Conflict #{conflictNumber} — both sides were edited since the last sync.
          {looksSame
            ? " The text below looks the same; you can keep either copy or apply one choice to all remaining conflicts."
            : " Which version should we keep?"}
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
            <div className="stack">
              <button
                type="button"
                className="btn primary"
                onClick={() => onChoose("local", false)}
              >
                Keep this device
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => onChoose("local", true)}
              >
                Keep this device for all remaining
              </button>
            </div>
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
            <div className="stack">
              <button
                type="button"
                className="btn primary"
                onClick={() => onChoose("remote", false)}
              >
                Keep cloud copy
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => onChoose("remote", true)}
              >
                Keep cloud for all remaining
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
