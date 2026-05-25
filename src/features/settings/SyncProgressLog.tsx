import { useEffect, useMemo, useRef } from "react"
import {
  formatSyncLogEntryForUi,
  type SyncLogEntry,
} from "../../lib/sync/syncLog"

type Props = {
  entries: readonly SyncLogEntry[]
  active: boolean
}

export function SyncProgressLog({ entries, active }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const lines = useMemo(
    () =>
      entries
        .map(formatSyncLogEntryForUi)
        .filter((line): line is string => line != null),
    [entries],
  )

  useEffect(() => {
    if (!active || lines.length === 0) return
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [lines.length, active, lines[lines.length - 1]])

  if (lines.length === 0) {
    return active ? (
      <p className="muted small sync-progress-empty">Starting sync…</p>
    ) : null
  }

  return (
    <div className="sync-progress-log" aria-live="polite" aria-busy={active}>
      <pre className="sync-log-pre">
        {lines.join("\n")}
        <div ref={endRef} />
      </pre>
    </div>
  )
}
