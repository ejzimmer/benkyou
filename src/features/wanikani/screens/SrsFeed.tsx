import { StageUpIcon } from '../icons'
import type { FeedEntry } from '../review/getFeedEntry'

interface Props {
  entries: FeedEntry[]
  onFaded: (id: number) => void
}

export function SrsFeed({ entries, onFaded }: Props) {
  return (
    <ul className="feed" aria-label="Recent SRS changes" aria-live="polite">
      {entries.map((entry) => (
        <li key={entry.id} onAnimationEnd={() => onFaded(entry.id)}>
          <span className="characters" lang="ja">
            {entry.characters}
          </span>
          <span className={entry.isUp ? 'up' : 'down'}>
            <StageUpIcon />
            <span className="visually-hidden">{entry.isUp ? 'up to' : 'down to'}</span>
          </span>
          {entry.stageName}
        </li>
      ))}
    </ul>
  )
}
