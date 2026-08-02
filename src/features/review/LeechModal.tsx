import { useModalPanelRef } from "../../ui/useModalPanelRef"

type Props = {
  onEdit: () => void
  onDelete: () => void
  onDismiss: () => void
}

export function LeechModal({ onEdit, onDelete, onDismiss }: Props) {
  const panelRef = useModalPanelRef<HTMLDivElement>()
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        className="modal-panel panel leech-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>リーチと判定されました</h2>
        <div className="toolbar leech-modal-footer">
          <button type="button" className="btn secondary" onClick={onDismiss}>
            除外
          </button>
          <button
            type="button"
            className="btn secondary pink"
            onClick={onDelete}
          >
            削除
          </button>
          <button
            type="button"
            className="btn primary blue"
            onClick={onEdit}
          >
            編集
          </button>
        </div>
      </div>
    </div>
  )
}
