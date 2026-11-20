import { NavLink } from "react-router-dom"

type TabLinkProps = {
  path: string
  label: string
  reviewCount?: number
}

export function TabLink({ path, label, reviewCount }: TabLinkProps) {
  return (
    <NavLink to={path} end>
      {label}
      {reviewCount !== undefined && reviewCount > 0 && (
        <span className="review-count" aria-label={`${reviewCount} reviews ready`}>
          {reviewCount}
        </span>
      )}
    </NavLink>
  )
}
