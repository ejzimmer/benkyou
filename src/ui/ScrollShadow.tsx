import type { ReactNode } from "react"
import { useScrollShadow } from "./useScrollShadow"

type Props = {
  children: ReactNode
  className?: string
}

/**
 * Wraps children that render their own scrollable root (so a ref can't be
 * attached to it directly) in a div carrying the scroll-shadow behaviour
 * instead.
 */
export function ScrollShadow({ children, className }: Props) {
  const ref = useScrollShadow<HTMLDivElement>()
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
