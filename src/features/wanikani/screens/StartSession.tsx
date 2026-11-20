import './StartSession.css'
import { HexagonGem } from '../components/HexagonGem'
import { useKeyboardShortcut } from '../components/useKeyboardShortcut'

interface Props {
  count: number
  noun: 'reviews' | 'lessons'
  shortcutKey: string
  onStart: () => void
}

const GEM_TYPES = { lessons: 'kanji', reviews: 'radical' } as const

export function StartSession({ count, noun, shortcutKey, onStart }: Props) {
  useKeyboardShortcut(shortcutKey, onStart, count > 0)

  if (count === 0) {
    return (
      <div className="start-session">
        <HexagonGem gemType="empty" label={count} />
        <span className="label">
          <span className="visually-hidden">{count} </span>
          {noun}
        </span>
      </div>
    )
  }

  return (
    <button type="button" className="start-session" onClick={onStart} aria-keyshortcuts={shortcutKey}>
      <HexagonGem gemType={GEM_TYPES[noun]} label={count} />
      <span className="label">
        <span className="visually-hidden">Start {count} </span>
        {noun}
      </span>
    </button>
  )
}
