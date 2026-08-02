import { useEffect, useRef, useState } from "react"

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Attach the returned ref to a modal panel to keep keyboard focus inside it:
 * moves focus in on mount, cycles Tab/Shift+Tab between the panel's own
 * focusable descendants (so Tab can't escape to the page underneath the
 * backdrop), and restores focus to whatever had it before the modal opened
 * once the panel unmounts.
 */
export function useFocusTrap<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!el) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    if (!el.hasAttribute("tabindex")) el.tabIndex = -1
    const first = focusableElements(el)[0]
    ;(first ?? el).focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !el) return

      const focusables = focusableElements(el)
      if (focusables.length === 0) {
        e.preventDefault()
        el.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !el.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last || !el.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [el])

  return setEl
}
