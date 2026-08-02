import type { SyncConflict, SyncConflictChoice } from "./syncTypes"
import { useModalPanelRef } from "../../ui/useModalPanelRef"
import { SrsStageDiagram } from "../../ui/SrsStageDiagram"
import { REVIEW_MODE_LABELS } from "../../features/review/reviewFlowHelpers"
import { formatDateTimeJa } from "../formatDate"

type Props = {
  conflict: SyncConflict
  onChoose: (choice: SyncConflictChoice, applyToAllRemaining: boolean) => void
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
      label: "最終更新日時",
      kind: "date",
      local: conflict.localUpdatedAt,
      remote: conflict.remoteUpdatedAt,
    },
  ]

  if (conflict.entityType === "deck") {
    rows.push({
      label: "名前",
      kind: "text",
      local: conflict.local.name,
      remote: conflict.remote.name,
    })
  } else if (conflict.entityType === "media") {
    rows.push(
      {
        label: "ファイル形式",
        kind: "text",
        local: conflict.local.mimeType,
        remote: conflict.remote.mimeType,
      },
      {
        label: "プレビュー",
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
      return <>{formatDateTimeJa(value as number | undefined)}</>
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
      ? "デッキの競合"
      : conflict.entityType === "card"
        ? "カードの競合"
        : conflict.entityType === "scheduling"
          ? "復習スケジュールの競合"
          : "画像の競合"

  const rows = buildRows(conflict)
  const panelRef = useModalPanelRef<HTMLDivElement>()
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
        <div className="sync-conflict-table-scroll">
          <table className="sync-conflict-table">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">この端末</th>
                <th scope="col">クラウド</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const nowrap = row.kind !== "text" && row.kind !== "image"
                return (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className={nowrap ? "sync-conflict-nowrap" : undefined}>
                      <RowValue kind={row.kind} value={row.local} />
                    </td>
                    <td className={nowrap ? "sync-conflict-nowrap" : undefined}>
                      <RowValue kind={row.kind} value={row.remote} />
                    </td>
                  </tr>
                )
              })}
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
              デバイス優先
            </button>
            <button
              type="button"
              className="btn secondary white"
              onClick={() => onChoose("local", true)}
            >
              すべてデバイス優先
            </button>
          </div>
          <div className="stack">
            <button
              type="button"
              className={localIsNewer ? "btn secondary" : "btn primary blue"}
              onClick={() => onChoose("remote", false)}
            >
              クラウド優先
            </button>
            <button
              type="button"
              className="btn secondary white"
              onClick={() => onChoose("remote", true)}
            >
              すべてクラウド優先
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
