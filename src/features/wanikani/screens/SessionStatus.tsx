import { IconButton } from '../components/IconButton'
import { ArrowIcon, CloseIcon, HourglassIcon, TickIcon } from '../icons'

interface Props {
  remaining: number
  accuracy: number
  progress: number
  wrapUp?: { isWrappingUp: boolean; onToggle: () => void }
  limitedTime?: { isLimitedTime: boolean; itemsInPlay: number; isSafeToStop: boolean; onToggle: () => void }
  onExit: () => void
}

export function SessionStatus({ remaining, accuracy, progress, wrapUp, limitedTime, onExit }: Props) {
  const isWrappingUp = wrapUp?.isWrappingUp ?? false
  const isLimitedTime = limitedTime?.isLimitedTime ?? false
  const isSafeToStop = isLimitedTime && (limitedTime?.isSafeToStop ?? false)

  return (
    <>
      <div className="status">
        <span className={isWrappingUp ? 'visually-hidden' : undefined}>
          <span className="visually-hidden">Remaining </span>
          {remaining}
        </span>
        <span>
          <span className="visually-hidden">Correct </span>
          {accuracy}%
        </span>
        {limitedTime && (
          <IconButton className="icon-btn limited-time" onClick={limitedTime.onToggle} label="Limited time" aria-pressed={isLimitedTime}>
            <HourglassIcon />
            {isLimitedTime && !isWrappingUp && <BatchCountdown itemsInPlay={limitedTime.itemsInPlay} isSafeToStop={isSafeToStop} />}
          </IconButton>
        )}
        {wrapUp && (
          <IconButton className="icon-btn wrap-up" onClick={wrapUp.onToggle} label="Wrap up" aria-pressed={isWrappingUp}>
            <ArrowIcon />
            {isWrappingUp ? <span>{remaining}</span> : <span lang="ja">終わり</span>}
          </IconButton>
        )}
        <IconButton className="icon-btn" onClick={onExit} label="End session" tooltipAlign="end">
          <CloseIcon />
        </IconButton>
      </div>
      <div className="progress">
        {progress > 0 && <div className="progress-fill" style={{ width: `${progress * 100}%` }} />}
      </div>
    </>
  )
}

function BatchCountdown({ itemsInPlay, isSafeToStop }: { itemsInPlay: number; isSafeToStop: boolean }) {
  if (isSafeToStop) {
    return (
      <span className="countdown">
        <TickIcon />
        <span className="visually-hidden">Safe to stop</span>
      </span>
    )
  }

  return (
    <span className="countdown">
      <span className="visually-hidden">Left before you can stop </span>
      {itemsInPlay}
    </span>
  )
}
