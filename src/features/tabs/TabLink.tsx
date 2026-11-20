import { Link } from "react-router-dom"

type TabLinkProps = {
  path: string
  label: string
  isActive: boolean
  reviewCount?: number
}

export function TabLink({ path, label, isActive, reviewCount }: TabLinkProps) {
  return (
    <Link to={path} className={isActive ? "active" : undefined} aria-current={isActive ? "page" : undefined}>
      {label}
      {reviewCount !== undefined && reviewCount > 0 && (
        <span className="review-count" aria-label={`${reviewCount} reviews ready`}>
          {reviewCount}
        </span>
      )}
    </Link>
  )
}
