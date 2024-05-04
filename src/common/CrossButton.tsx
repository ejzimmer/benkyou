type Props = {
  onClick?: () => void
}

export function CrossButton({ onClick }: Props) {
  return (
    <button
      type="reset"
      style={{ opacity: ".8", width: "40px", height: "40px" }}
      onClick={onClick}
    >
      <svg viewBox="0 0 10 10" strokeWidth="1" stroke="currentColor">
        <line x1="2" y1="2" x2="8" y2="8" />
        <line x1="8" y1="2" x2="2" y2="8" />
      </svg>
    </button>
  )
}
