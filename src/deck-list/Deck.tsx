import { useCallback, useRef, useState } from "react"
import { CrossIcon } from "../common/CrossIcon"
import { IconButton } from "../common/IconButton"
import { PencilIcon } from "../common/PencilIcon"
import { DeleteConfirmation } from "../common/DeleteConfirmation"
import { IconLink } from "../common/IconLink"
import { Link } from "react-router-dom"

type Props = {
  name: string
  id: string
  onDelete: () => void
}

export function Deck({ name, id, onDelete }: Props) {
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const [isShowingDeleteConfirmation, setShowingDeleteConfirmation] =
    useState(false)

  const openConfirmation = useCallback(
    () => setShowingDeleteConfirmation(true),
    []
  )
  const closeConfirmation = useCallback(
    () => setShowingDeleteConfirmation(false),
    []
  )
  const deleteDeck = useCallback(async () => {
    await onDelete()
    closeConfirmation()
  }, [onDelete, closeConfirmation])

  return (
    <>
      <Link className="study" to={`${id}/review`}>
        {name}
      </Link>
      <IconButton
        icon={CrossIcon}
        onClick={openConfirmation}
        className="ghost"
        label={`delete ${name}`}
        ref={deleteButtonRef}
      />
      <IconLink
        label={`edit ${name}`}
        to={`/edit/${id}`}
        className="edit"
        icon={PencilIcon}
      />
      {isShowingDeleteConfirmation && (
        <DeleteConfirmation
          returnFocusRef={deleteButtonRef}
          name={name}
          onConfirm={deleteDeck}
          onClose={closeConfirmation}
        />
      )}
    </>
  )
}
