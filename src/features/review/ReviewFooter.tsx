import type { ReactNode } from "react"

/** Button row pinned to the bottom of a review card (Show answer, or
 * Correct/Incorrect/Undo) — see `.review-footer` in index.css for the
 * bottom-pinning + guaranteed-minimum-gap behaviour shared by both. */
export function ReviewFooter({ children }: { children: ReactNode }) {
  return <div className="toolbar review-footer">{children}</div>
}
