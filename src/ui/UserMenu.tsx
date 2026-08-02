import { useAuth } from "../lib/auth/AuthContext"
import { LogoutIcon } from "./LogoutIcon"

export function UserMenu() {
  const { user, signOut } = useAuth()

  if (!user) return null

  const label = user.email ?? user.uid

  return (
    <button
      type="button"
      className="btn secondary user-menu-trigger"
      aria-label={`ログアウト (${label})`}
      onClick={() => void signOut()}
    >
      <LogoutIcon className="user-menu-icon" />
    </button>
  )
}
