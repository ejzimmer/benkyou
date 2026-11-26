import { Link } from "react-router-dom"

type TabLinkProps = {
  path: string
  label: string
  isActive: boolean
  reviewCount?: number
}

export function TabLink({ path, label, isActive, reviewCount }: TabLinkProps) {
  const showsReviewCount = !isActive && reviewCount !== undefined && reviewCount > 0

  return (
    <Link to={path} className={isActive ? "active" : undefined} aria-current={isActive ? "page" : undefined}>
      {label}
      {showsReviewCount && (
        <span className="review-count" aria-label={`${reviewCount} reviews ready`}>
          {reviewCount}
        </span>
      )}
    </Link>
  )
}
