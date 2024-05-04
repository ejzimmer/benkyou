import { RefObject, useCallback, useEffect, useRef } from "react"
import { CrossIcon } from "./CrossIcon"
import { IconButton } from "./IconButton"
import { TickIcon } from "./TickIcon"

type DeleteConfirmationProps = {
  name: string
  onConfirm: () => void
  onClose: () => void
  returnFocusRef: RefObject<HTMLButtonElement>
}

export function DeleteConfirmation({
  name,
  onConfirm,
  onClose,
  returnFocusRef,
}: DeleteConfirmationProps) {
  const autoFocusRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handler)
    autoFocusRef.current?.focus()

    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  useEffect(() => () => returnFocusRef.current?.focus(), [returnFocusRef])

  const trapTab = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault()
      autoFocusRef.current?.focus()
    }
  }, [])

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="delete-confirmation">
        <div>Are you sure you want to delete {name}?</div>
        <div className="footer">
          <IconButton
            icon={CrossIcon}
            onClick={onClose}
            className="ghost"
            ref={autoFocusRef}
            label="Don't delete"
          />
          <IconButton
            icon={TickIcon}
            onClick={onConfirm}
            className="ghost edit"
            onKeyDown={trapTab}
            label="delete"
          />
        </div>
      </div>
    </>
  )
}
