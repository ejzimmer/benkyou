import { useRef, useState } from "react"
import { CrossIcon } from "../common/CrossIcon"
import { IconButton } from "../common/IconButton"
import { PencilIcon } from "../common/PencilIcon"
import { Link } from "react-router-dom"
import { DeleteConfirmation } from "../common/DeleteConfirmation"
import { IconLink } from "../common/IconLink"

type Props = {
  name: string
  id: string
  onStudy: () => void
  onDelete: () => void
}

export function Deck({ name, id, onStudy, onDelete }: Props) {
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
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
          onConfirm={onDelete}
          onClose={() => setShowingDeleteConfirmation(false)}
        />
      )}
    </>
  )
}
