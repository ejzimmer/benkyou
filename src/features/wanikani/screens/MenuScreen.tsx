import type { User } from '../api/types'
import { useLevelUp } from '../data/useLevelUp'
import { LevelUpScreen } from './LevelUpScreen'
import { ReviewForecast } from './ReviewForecast'
import { StudyMenu } from './StudyMenu'

interface Props {
  user: User
  onStartLessons: () => void
  onStartReviews: () => void
}

export function MenuScreen({ user, onStartLessons, onStartReviews }: Props) {
  const { isLevelUp, dismissLevelUp } = useLevelUp(user.level)

  if (isLevelUp) return <LevelUpScreen level={user.level} onDismiss={dismissLevelUp} />
  return (
    <>
      <StudyMenu onStartLessons={onStartLessons} onStartReviews={onStartReviews} />
      <ReviewForecast />
    </>
  )
}
