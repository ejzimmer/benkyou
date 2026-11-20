import './SignOutButton.css'
import { useRef } from 'react'
import { SignOutIcon } from '../icons'
import { IconButton } from './IconButton'

interface Props {
  onSignOut: () => void
}

export function SignOutButton({ onSignOut }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <IconButton className="icon-btn" onClick={() => dialog.current?.showModal()} label="Sign out" tooltipAlign="end">
        <SignOutIcon />
      </IconButton>
      <dialog ref={dialog} className="sign-out-dialog" aria-labelledby="sign-out-question" closedby="any">
        <p id="sign-out-question">Are you sure you want to sign out?</p>
        <div className="actions">
          <button type="button" onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="button" className="confirm" onClick={onSignOut}>Sign out</button>
        </div>
      </dialog>
    </>
  )
}
