import { CrossIcon } from "../common/CrossIcon"
import { IconButton } from "../common/IconButton"
import { PencilIcon } from "../common/PencilIcon"
import { useRef, useState } from "react"
import { DeleteConfirmation } from "../common/DeleteConfirmation"
import { IconLink } from "../common/IconLink"

type Props = {
  deckId: string
  id: string
  word: string
  translation: string
  onDelete: () => void
}

export function CardSummary({
  deckId,
  id,
  word,
  translation,
  onDelete,
}: Props) {
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const [isShowingDeleteConfirmation, setShowingDeleteConfirmation] =
    useState(false)

  return (
    <tr>
      <td style={{ paddingRight: "20px" }}>{word}</td>
      <td style={{ width: "100%" }}>{translation}</td>
      <td style={{ width: "80px", paddingRight: 0 }}>
        <IconButton
          icon={CrossIcon}
          onClick={() => setShowingDeleteConfirmation(true)}
          className="ghost"
          label={`delete ${word}`}
          ref={deleteButtonRef}
        />
        {isShowingDeleteConfirmation && (
          <DeleteConfirmation
            returnFocusRef={deleteButtonRef}
            name={word}
            onConfirm={onDelete}
            onClose={() => setShowingDeleteConfirmation(false)}
          />
        )}
        <IconLink
          label={`edit ${word}`}
          to={`/${deckId}/edit/${id}`}
          icon={PencilIcon}
          className="edit"
        />
      </td>
    </tr>
  )
}
