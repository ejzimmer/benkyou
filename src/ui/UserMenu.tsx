import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth/AuthContext"
import { ChevronDownIcon } from "./ChevronDownIcon"

type Props = {
  /** Trigger renders as a bare chevron instead of the email label — used in
   *  the review header where space is tight and the row already has enough
   *  buttons competing for attention. */
  iconOnly?: boolean
}

export function UserMenu({ iconOnly = false }: Props) {
  const { user, offlineOnly, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function close({ refocus }: { refocus: boolean }) {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close({ refocus: true })
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const label = user?.email ?? user?.uid ?? (offlineOnly ? "Offline" : "Guest")

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={
          iconOnly
            ? "btn secondary user-menu-trigger user-menu-trigger-icon-only"
            : "btn secondary user-menu-trigger"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={iconOnly ? label : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {iconOnly ? (
          <ChevronDownIcon className="user-menu-chevron" />
        ) : (
          <>
            <span className="user-menu-trigger-label">{label}</span>
            <span className="user-menu-caret" aria-hidden="true">
              ▾
            </span>
          </>
        )}
      </button>
      {open && (
        <div className="user-menu-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => {
              close({ refocus: false })
              navigate("/settings")
            }}
          >
            設定
          </button>
          {user && (
            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={() => {
                close({ refocus: true })
                void signOut()
              }}
            >
              ログアウト
            </button>
          )}
        </div>
      )}
    </div>
  )
}
