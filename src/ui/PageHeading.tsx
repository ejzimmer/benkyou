import { Link } from "react-router-dom"
import { ChevronLeftIcon } from "./ChevronLeftIcon"

type Props = {
  backTo: string
  backLabel: string
  children: React.ReactNode
}

export function PageHeading({ backTo, backLabel, children }: Props) {
  return (
    <div className="page-heading">
      <Link to={backTo} className="back-link" aria-label={backLabel}>
        <ChevronLeftIcon className="back-chevron" />
      </Link>
      <h1>{children}</h1>
    </div>
  )
}
