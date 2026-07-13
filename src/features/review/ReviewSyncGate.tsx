import type { SyncProgress } from "../../lib/sync/runSync"
import { PageHeading } from "../../ui/PageHeading"

export type ReviewSyncGateProps = {
  progress: SyncProgress | null
  statusLabel: string
  backTo: string
}

/**
 * Shown when the user opens a review before the first sync of the session has
 * finished. Holds the review until the latest cards are in, with an informative
 * indicator (phase, and image counts while media downloads).
 */
export function ReviewSyncGate({
  progress,
  statusLabel,
  backTo,
}: ReviewSyncGateProps) {
  const phase = progress?.phase || statusLabel || "Syncing…"
  const hasCount =
    progress?.current != null &&
    progress?.total != null &&
    progress.total > 0
  const remaining = hasCount ? progress!.total! - progress!.current! : 0

  return (
    <div className="page review">
      <header className="header">
        <PageHeading backTo={backTo} backLabel="Back">
          Syncing…
        </PageHeading>
      </header>
      <div className="stack" aria-live="polite">
        <p>Getting your latest cards before you review…</p>
        <p className="muted">{phase}</p>
        {hasCount && (
          <>
            <p className="muted small">
              {remaining > 0
                ? `${remaining} image${remaining === 1 ? "" : "s"} left`
                : "Almost done…"}{" "}
              ({progress!.current}/{progress!.total})
            </p>
            <progress
              value={progress!.current}
              max={progress!.total}
              style={{ width: "100%" }}
            />
          </>
        )}
        <p className="muted small">
          This only happens once, so your reviews are scheduled correctly.
        </p>
      </div>
    </div>
  )
}
