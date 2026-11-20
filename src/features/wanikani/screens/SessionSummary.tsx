import { IconButton } from '../components/IconButton'
import { useKeyboardShortcut } from '../components/useKeyboardShortcut'
import { ArrowIcon } from '../icons'

interface Props {
  count: number
  description: string
  onExit: () => void
}

export function SessionSummary({ count, description, onExit }: Props) {
  useKeyboardShortcut('Enter', onExit)

  return (
    <div className="quiz summary">
      <div className="count">{count}</div>
      <div className="meta">{description}</div>
      <IconButton className="submit" onClick={onExit} label="Done" aria-keyshortcuts="Enter">
        <ArrowIcon />
      </IconButton>
    </div>
  )
}
