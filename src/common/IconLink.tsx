import { Link } from "react-router-dom"

type Props = {
  label: string
  to: string
  icon: React.ElementType
  className?: string
}

export function IconLink({ label, to, icon: Icon, className = "" }: Props) {
  return (
    <Link aria-label={label} to={to} className={"icon-link " + className}>
      <Icon />
    </Link>
  )
}
