import { useEffect, useState } from 'react'
import type { WaniKaniClient } from '../api/client'
import { LoadingKanji } from '../components/LoadingKanji'
import { preloadStudyFont } from '../data/preloadStudyFont'
import { loadLessonData, type LessonData } from '../lessons/loadLessonData'
import { LessonPages } from './LessonPages'
import { LessonQuiz } from './LessonQuiz'
import { SessionSummary } from './SessionSummary'

interface Props {
  client: WaniKaniClient
  onExit: () => void
}

export function LessonScreen({ client, onExit }: Props) {
  const [data, setData] = useState<LessonData | null>(null)
  const [batchIndex, setBatchIndex] = useState(0)
  const [isQuizzing, setIsQuizzing] = useState(false)

  useEffect(() => {
    void loadLessonData().then(setData)
  }, [])

  useEffect(() => {
    if (data) preloadStudyFont(data.batches.flat())
  }, [data])

  if (!data) return <LoadingKanji />

  const batch = data.batches[batchIndex]
  if (!batch) return <SessionSummary count={0} description="No lessons available" onExit={onExit} />

  const hasNextBatch = batchIndex < data.batches.length - 1

  function startNextBatch() {
    setBatchIndex(batchIndex + 1)
    setIsQuizzing(false)
  }

  if (isQuizzing) {
    return <LessonQuiz batch={batch} client={client} onFinish={hasNextBatch ? startNextBatch : undefined} onExit={onExit} />
  }
  return (
    <LessonPages
      key={batchIndex}
      batch={batch}
      subjectsById={data.subjectsById}
      client={client}
      onStartQuiz={() => setIsQuizzing(true)}
      onExit={onExit}
    />
  )
}
