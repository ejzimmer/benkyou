type Props = {
  /** When provided, the badge becomes clickable and clears the leech flag. */
  onClear?: () => void
}

export function LeechBadge({ onClear }: Props = {}) {
  if (!onClear) return <span className="leech-badge">リーチ</span>
  return (
    <button
      type="button"
      className="leech-badge leech-badge-clear"
      title="クリックしてリーチを解除"
      aria-label="リーチを解除"
      onClick={onClear}
    >
      リーチ
    </button>
  )
}
