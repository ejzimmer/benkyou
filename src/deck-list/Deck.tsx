import { useCallback, useEffect, useRef, useState } from "react"
import { CrossIcon } from "../common/CrossIcon"
import { IconButton } from "../common/IconButton"
import { PencilIcon } from "../common/PencilIcon"
import { TickIcon } from "../common/TickIcon"

type Props = {
  name: string
  onStudy: () => void
  onEdit: () => void
  onDelete: () => void
}

export function Deck({ name, onStudy, onEdit, onDelete }: Props) {
  const [isShowingDeleteConfirmation, setShowingDeleteConfirmation] =
    useState(false)

  return (
    <>
      <button type="button" onClick={onStudy} className="ghost study">
        {name}
      </button>
      <IconButton
        icon={CrossIcon}
        onClick={() => setShowingDeleteConfirmation(true)}
        className="ghost"
        label={`delete ${name}`}
      />
      <IconButton
        label={`edit ${name}`}
        icon={PencilIcon}
        onClick={onEdit}
        className="ghost edit"
      />
      {isShowingDeleteConfirmation && (
        <DeleteConfirmation
          deckName={name}
          onConfirm={onDelete}
          onClose={() => setShowingDeleteConfirmation(false)}
        />
      )}
    </>
  )
}

type DeleteConfirmationProps = {
  deckName: string
  onConfirm: () => void
  onClose: () => void
}

function DeleteConfirmation({
  deckName,
  onConfirm,
  onClose,
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
        <div>Are you sure you want to delete {deckName}?</div>
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
