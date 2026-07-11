import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth/AuthContext"

export function UserMenu() {
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
        className="btn secondary user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="user-menu-trigger-label">{label}</span>
        <span className="user-menu-caret" aria-hidden="true">
          ▾
        </span>
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
            Settings
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
              Logout
            </button>
          )}
        </div>
      )}
    </div>
  )
}
