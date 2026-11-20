import { useState } from 'react'
import type { WaniKaniClient } from '../api/client'
import type { SessionItem } from '../quiz/session'
import { getFeedEntry, type FeedEntry } from '../review/getFeedEntry'
import type { ReviewData } from '../review/loadReviewData'
import { queueReview, sendPendingReviews } from '../review/sendReviews'
import { Quiz } from './Quiz'
import { SrsFeed } from './SrsFeed'

interface Props {
  data: ReviewData
  client: WaniKaniClient
  onExit: () => void
}

export function ReviewSessionView({ data, client, onExit }: Props) {
  const [feed, setFeed] = useState<FeedEntry[]>([])

  function submitReview(item: SessionItem) {
    void queueReview({
      assignmentId: item.assignment.id,
      incorrectMeaningAnswers: item.incorrectMeaningAnswers,
      incorrectReadingAnswers: item.incorrectReadingAnswers,
    }).then(() => sendPendingReviews(client))
  }

  function addToFeed(item: SessionItem) {
    const entry = getFeedEntry(item, data.srsSystems)
    if (entry) setFeed((entries) => [entry, ...entries])
  }

  return (
    <Quiz
      queue={data.queue}
      client={client}
      aside={
        <SrsFeed entries={feed} onFaded={(id) => setFeed((entries) => entries.filter((entry) => entry.id !== id))} />
      }
      onItemComplete={(item) => {
        submitReview(item)
        addToFeed(item)
      }}
      completedLabel="reviewed"
      canWrapUp
      canLimitTime
      onExit={onExit}
    />
  )
}
