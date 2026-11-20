import './StudyMenu.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { countAvailableLessons } from '../lessons/loadLessonData'
import { countDueReviews } from '../review/loadReviewData'
import { StartSession } from './StartSession'

interface Props {
  onStartLessons: () => void
  onStartReviews: () => void
}

export function StudyMenu({ onStartLessons, onStartReviews }: Props) {
  const lessons = useLiveQuery(countAvailableLessons)
  const reviews = useLiveQuery(countDueReviews)

  return (
    <div className="study-menu">
      <StartSession count={lessons ?? 0} noun="lessons" shortcutKey="l" onStart={onStartLessons} />
      <StartSession count={reviews ?? 0} noun="reviews" shortcutKey="r" onStart={onStartReviews} />
    </div>
  )
}
