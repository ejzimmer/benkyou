import './LevelUpScreen.css'
import { IconButton } from '../components/IconButton'
import { useKeyboardShortcut } from '../components/useKeyboardShortcut'
import { ArrowIcon } from '../icons'
import { HanabiScene } from '../levelUp/HanabiScene'

interface Props {
  level: number
  onDismiss: () => void
}

export function LevelUpScreen({ level, onDismiss }: Props) {
  useKeyboardShortcut('Enter', onDismiss)

  return (
    <div className="level-up">
      <HanabiScene level={level} />
      <p className="congratulations" lang="ja">
        おめでとう
      </p>
      <p className="visually-hidden">Level {level}</p>
      <div className="actions">
        <IconButton className="submit" onClick={onDismiss} label="Done" aria-keyshortcuts="Enter">
          <ArrowIcon />
        </IconButton>
      </div>
    </div>
  )
}
