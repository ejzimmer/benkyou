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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="modal-panel panel" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="toolbar">
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn primary pink" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
