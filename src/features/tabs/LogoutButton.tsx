import { useRef } from "react"
import { LogoutIcon } from "../../ui/LogoutIcon"
import { LogoutDialog } from "./LogoutDialog"
import { useLogOut } from "./useLogOut"

export function LogoutButton() {
  const dialog = useRef<HTMLDialogElement>(null)
  const logOut = useLogOut()

  return (
    <>
      <button
        type="button"
        className="tab-bar-action"
        aria-label="Log out"
        title="Log out"
        onClick={() => dialog.current?.showModal()}
      >
        <LogoutIcon className="tab-bar-icon" />
      </button>
      <LogoutDialog
        ref={dialog}
        onLogOut={(choices) => void logOut(choices)}
        onCancel={() => dialog.current?.close()}
      />
    </>
  )
}
