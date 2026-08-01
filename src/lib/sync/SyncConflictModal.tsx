import type { SyncConflict, SyncConflictChoice } from "./syncTypes"
import { summariesLookIdentical } from "./syncCompare"
import { useScrollShadow } from "../../ui/useScrollShadow"
import { SrsStageDiagram } from "../../ui/SrsStageDiagram"
import { REVIEW_MODE_LABELS } from "../../features/review/reviewFlowHelpers"

type Props = {
  conflict: SyncConflict
  onChoose: (choice: SyncConflictChoice, applyToAllRemaining: boolean) => void
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/** HH:mm, dd Mmm yyyy — unambiguous regardless of the reader's locale,
 *  unlike `toLocaleString()` (which renders MM/DD/YYYY for US-locale users). */
function formatConflictDate(epochMs: number | undefined): string {
  if (epochMs == null) return "—"
  const d = new Date(epochMs)
  const day = String(d.getDate()).padStart(2, "0")
  const month = MONTH_ABBR[d.getMonth()]
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}, ${day} ${month} ${d.getFullYear()}`
}

type RowKind = "text" | "date" | "stage" | "integer" | "decimal" | "image"

type Row = {
  label: string
  kind: RowKind
  local: string | number | undefined
  remote: string | number | undefined
}

function buildRows(conflict: SyncConflict): Row[] {
  const rows: Row[] = [
    {
      label: "Updated",
      kind: "date",
      local: conflict.localUpdatedAt,
      remote: conflict.remoteUpdatedAt,
    },
  ]

  if (conflict.entityType === "deck") {
    rows.push({
      label: "Name",
      kind: "text",
      local: conflict.local.name,
      remote: conflict.remote.name,
    })
  } else if (conflict.entityType === "card") {
    rows.push({
      label: "Content",
      kind: "text",
      local: conflict.localSummary,
      remote: conflict.remoteSummary,
    })
  } else if (conflict.entityType === "media") {
    rows.push(
      {
        label: "Type",
        kind: "text",
        local: conflict.local.mimeType,
        remote: conflict.remote.mimeType,
      },
      {
        label: "Preview",
        kind: "image",
        local: conflict.localPreviewUrl,
        remote: conflict.remotePreviewUrl,
      },
    )
  } else {
    rows.push(...conflict.diffRows)
  }

  return rows
}

function RowValue({ kind, value }: { kind: RowKind; value: string | number | undefined }) {
  switch (kind) {
    case "date":
      return <>{formatConflictDate(value as number | undefined)}</>
    case "stage":
      return <SrsStageDiagram state={value as number} />
    case "decimal":
      return <>{(value as number).toFixed(2)}</>
    case "image":
      return <img src={value as string} alt="" className="sync-conflict-image" />
    default:
      return <>{value}</>
  }
}

export function SyncConflictModal({ conflict, onChoose }: Props) {
  const title =
    conflict.entityType === "deck"
      ? "Deck conflict"
      : conflict.entityType === "card"
        ? "Card conflict"
        : conflict.entityType === "scheduling"
          ? "Review schedule conflict"
          : "Image conflict"

  const looksSame =
    conflict.entityType === "scheduling"
      ? conflict.diffRows.length === 0
      : summariesLookIdentical(conflict.localSummary, conflict.remoteSummary)

  const rows = buildRows(conflict)
  const panelRef = useScrollShadow<HTMLDivElement>()
  const localIsNewer = conflict.localUpdatedAt >= conflict.remoteUpdatedAt

  return (
    <div className="sync-conflict-backdrop" role="dialog" aria-modal="true">
      <div ref={panelRef} className="sync-conflict-panel panel">
        <h2>{title}</h2>
        {conflict.contextLabel && (
          <p className="small">
            <strong>{conflict.contextLabel}</strong>
            {conflict.entityType === "scheduling" &&
              ` · ${REVIEW_MODE_LABELS[conflict.local.modeId]}`}
          </p>
        )}
        {looksSame && (
          <p className="muted small">
            The text below looks the same; you can keep either copy or apply
            one choice to all remaining conflicts.
          </p>
        )}

        <div className="sync-conflict-table-scroll">
          <table className="sync-conflict-table">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">This device</th>
                <th scope="col">Cloud / other device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>
                    <RowValue kind={row.kind} value={row.local} />
                  </td>
                  <td>
                    <RowValue kind={row.kind} value={row.remote} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sync-conflict-actions">
          <div className="stack">
            <button
              type="button"
              className={localIsNewer ? "btn primary blue" : "btn secondary"}
              onClick={() => onChoose("local", false)}
            >
              Keep this device
            </button>
            <button
              type="button"
              className="btn secondary white"
              onClick={() => onChoose("local", true)}
            >
              Keep this device for all remaining
            </button>
          </div>
          <div className="stack">
            <button
              type="button"
              className={localIsNewer ? "btn secondary" : "btn primary blue"}
              onClick={() => onChoose("remote", false)}
            >
              Keep cloud
            </button>
            <button
              type="button"
              className="btn secondary white"
              onClick={() => onChoose("remote", true)}
            >
              Keep cloud for all remaining
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
