type Props = {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel panel">
        <p>{message}</p>
        <div className="toolbar">
          <button type="button" className="btn danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
