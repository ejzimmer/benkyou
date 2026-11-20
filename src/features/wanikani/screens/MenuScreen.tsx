import './MenuScreen.css'
import type { User } from '../api/types'
import { useLevelUp } from '../data/useLevelUp'
import { LevelUpScreen } from './LevelUpScreen'
import { ReviewForecast } from './ReviewForecast'
import { StudyMenu } from './StudyMenu'
import { WaniKaniProgress } from '../status/WaniKaniProgress'

interface Props {
  user: User
  token: string
  onUnauthorized: () => void
  onStartLessons: () => void
  onStartReviews: () => void
}

export function MenuScreen({ user, token, onUnauthorized, onStartLessons, onStartReviews }: Props) {
  const { isLevelUp, dismissLevelUp } = useLevelUp(user.level)

  if (isLevelUp) return <LevelUpScreen level={user.level} onDismiss={dismissLevelUp} />
  return (
    <div className="menu">
      <div className="menu-study">
        <StudyMenu onStartLessons={onStartLessons} onStartReviews={onStartReviews} />
        <ReviewForecast />
      </div>
      <div className="menu-progress">
        <WaniKaniProgress apiKey={token} onInvalidApiKey={onUnauthorized} />
      </div>
    </div>
  )
}
