import { useRef, useState } from "react"
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

  return (
    <>
      <Link className="study" to={`${id}/review`}>
        {name}
      </Link>
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
