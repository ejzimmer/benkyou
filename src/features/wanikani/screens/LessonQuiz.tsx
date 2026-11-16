import type { WaniKaniClient } from '../api/client'
import type { StudyItem } from '../data/studyItem'
import { queueLessonStart, sendPendingLessonStarts } from '../lessons/sendLessonStarts'
import { Quiz } from './Quiz'

interface Props {
  batch: readonly StudyItem[]
  client: WaniKaniClient
  onFinish?: () => void
  onExit: () => void
}

export function LessonQuiz({ batch, client, onFinish, onExit }: Props) {
  return (
    <Quiz
      queue={batch}
      client={client}
      onItemComplete={(item) => void queueLessonStart(item.assignment.id).then(() => sendPendingLessonStarts(client))}
      completedLabel="learned"
      onFinish={onFinish}
      onExit={onExit}
    />
  )
}
