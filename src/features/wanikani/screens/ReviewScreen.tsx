import { useEffect, useState } from 'react'
import type { WaniKaniClient } from '../api/client'
import { LoadingKanji } from '../components/LoadingKanji'
import { preloadStudyFont } from '../data/preloadStudyFont'
import { loadReviewData, type ReviewData } from '../review/loadReviewData'
import { ReviewSessionView } from './ReviewSessionView'
import { SessionSummary } from './SessionSummary'

interface Props {
  client: WaniKaniClient
  onExit: () => void
}

export function ReviewScreen({ client, onExit }: Props) {
  const [data, setData] = useState<ReviewData | null>(null)

  useEffect(() => {
    void loadReviewData().then(setData)
  }, [])

  useEffect(() => {
    if (data) preloadStudyFont(data.queue)
  }, [data])

  if (!data) return <LoadingKanji />
  if (data.queue.length === 0) return <SessionSummary count={0} description="No reviews due" onExit={onExit} />
  return <ReviewSessionView data={data} client={client} onExit={onExit} />
}
