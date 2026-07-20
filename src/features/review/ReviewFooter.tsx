import type { ReactNode } from "react"

/** Button row pinned to the bottom of a review card (Show answer, or
 * Correct/Incorrect/Undo) — see `.review-footer` in index.css for the
 * bottom-pinning + guaranteed-minimum-gap behaviour shared by both. */
export function ReviewFooter({
  children,
  className,
  "aria-hidden": ariaHidden,
}: {
  children: ReactNode
  className?: string
  "aria-hidden"?: boolean
}) {
  return (
    <div
      className={className ? `toolbar review-footer ${className}` : "toolbar review-footer"}
      aria-hidden={ariaHidden}
    >
      {children}
    </div>
  )
}
