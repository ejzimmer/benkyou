import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { WaniKaniClient } from '../api/client'
import { LoadingYomu } from '../components/LoadingYomu'
import { db } from '../data/db'
import { useSync } from '../data/useSync'
import { DebugScreen } from './DebugScreen'
import { LessonScreen } from './LessonScreen'
import { ReviewScreen } from './ReviewScreen'
import { MenuScreen } from './MenuScreen'

interface Props {
  token: string
  onUnauthorized: () => void
}

export function HomeScreen({ token, onUnauthorized }: Props) {
  // One client per token, so every request shares the same rate limiter.
  const client = useMemo(() => new WaniKaniClient(token), [token])
  const { isSyncing, hasFinishedFirstSync, syncError, syncNow } = useSync(client, onUnauthorized)
  const [activity, setActivity] = useState<'menu' | 'lessons' | 'reviews'>('menu')
  const user = useLiveQuery(() => db.user.get('me'))?.user

  function returnToMenu() {
    setActivity('menu')
    syncNow()
  }

  if (!user || !hasFinishedFirstSync) return <LoadingYomu />

  switch (activity) {
    case 'lessons':
      return <LessonScreen client={client} onExit={returnToMenu} />
    case 'reviews':
      return <ReviewScreen client={client} onExit={returnToMenu} />
    case 'menu':
      if (location.pathname === '/debug') {
        return <DebugScreen user={user} isSyncing={isSyncing} syncError={syncError} onSync={syncNow} />
      }
      return <MenuScreen user={user} onStartLessons={() => setActivity('lessons')} onStartReviews={() => setActivity('reviews')} />
  }
}
