import { type Ref, useState } from "react"
import type { LogOutChoices } from "./useLogOut"

type LogoutDialogProps = {
  ref: Ref<HTMLDialogElement>
  onLogOut: (choices: LogOutChoices) => void
  onCancel: () => void
}

export function LogoutDialog({ ref, onLogOut, onCancel }: LogoutDialogProps) {
  const [shouldDeleteApiKey, setShouldDeleteApiKey] = useState(true)
  const [shouldLogOutOfGoogle, setShouldLogOutOfGoogle] = useState(true)

  return (
    <dialog ref={ref} className="logout-dialog" aria-labelledby="logout-question" closedby="any">
      <form
        method="dialog"
        onSubmit={() => onLogOut({ shouldDeleteApiKey, shouldLogOutOfGoogle })}
      >
        <p id="logout-question">What would you like to log out of?</p>
        <label className="logout-choice">
          <span>Delete WaniKani API key</span>
          <input
            type="checkbox"
            role="switch"
            checked={shouldDeleteApiKey}
            onChange={(event) => setShouldDeleteApiKey(event.target.checked)}
          />
        </label>
        <label className="logout-choice">
          <span>Log out of Google</span>
          <input
            type="checkbox"
            role="switch"
            checked={shouldLogOutOfGoogle}
            onChange={(event) => setShouldLogOutOfGoogle(event.target.checked)}
          />
        </label>
        <div className="logout-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="confirm"
            disabled={!shouldDeleteApiKey && !shouldLogOutOfGoogle}
          >
            Log out
          </button>
        </div>
      </form>
    </dialog>
  )
}
