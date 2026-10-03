type Props = {
  className?: string
}

export function SearchIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
