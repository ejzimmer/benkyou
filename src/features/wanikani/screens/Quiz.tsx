import './Quiz.css'
import { useId, useState, type ReactNode } from 'react'
import type { WaniKaniClient } from '../api/client'
import type { StudyItem } from '../data/studyItem'
import {
  answerCorrectly,
  answerWrongly,
  askNextQuestion,
  countRemainingItems,
  createSession,
  isSafeToStop,
  startLimitedTime,
  startWrapUp,
  stopLimitedTime,
  stopWrapUp,
  undoWrongAnswer,
  type SessionItem,
} from '../quiz/session'
import { AnswerForm } from './AnswerForm'
import { QuestionCard } from './QuestionCard'
import { SessionStatus } from './SessionStatus'
import { SessionSummary } from './SessionSummary'

interface Props {
  queue: readonly StudyItem[]
  client: WaniKaniClient
  aside?: ReactNode
  onItemComplete: (item: SessionItem) => void
  completedLabel: string
  canWrapUp?: boolean
  canLimitTime?: boolean
  onFinish?: () => void
  onExit: () => void
}

export function Quiz({ queue, client, aside, onItemComplete, completedLabel, canWrapUp = false, canLimitTime = false, onFinish, onExit }: Props) {
  const [session, setSession] = useState(() => createSession(queue))
  const answerInputId = useId()
  const accuracy = session.totalAnswers ? Math.round((session.correctAnswers / session.totalAnswers) * 100) : 100
  const { question } = session
  const remaining = countRemainingItems(session)

  if (!question) {
    return (
      <SessionSummary count={session.completed.length} description={`${completedLabel} · ${accuracy}% correct`} onExit={onExit} />
    )
  }

  const { subject, assignment } = question.item

  function answer(isCorrect: boolean) {
    if (!isCorrect) {
      setSession(answerWrongly(session))
      return
    }

    const answered = answerCorrectly(session)
    if (answered.completed.length > session.completed.length) onItemComplete(answered.completed.at(-1)!)
    const next = askNextQuestion(answered)
    setSession(next)
    if (!next.question) onFinish?.()
  }

  function toggleWrapUp() {
    setSession(session.isWrappingUp ? stopWrapUp(session) : startWrapUp(session))
  }

  function toggleLimitedTime() {
    setSession(session.isLimitedTime ? stopLimitedTime(session) : startLimitedTime(session))
  }

  const limitedTime = {
    isLimitedTime: session.isLimitedTime,
    itemsInPlay: session.active.length,
    isSafeToStop: isSafeToStop(session),
    onToggle: toggleLimitedTime,
  }

  return (
    <div className="quiz" data-type={assignment.data.subject_type}>
      <SessionStatus
        remaining={remaining}
        accuracy={accuracy}
        progress={session.completed.length / (session.completed.length + remaining)}
        wrapUp={canWrapUp ? { isWrappingUp: session.isWrappingUp, onToggle: toggleWrapUp } : undefined}
        limitedTime={canLimitTime ? limitedTime : undefined}
        onExit={onExit}
      />

      <div className="layout">
        <QuestionCard subject={subject.data} questionType={question.type} inputId={answerInputId} />
        <AnswerForm
          key={session.questionNumber}
          inputId={answerInputId}
          question={question}
          client={client}
          isShowingAnswer={session.isShowingAnswer}
          onAnswer={answer}
          onRedo={() => setSession(undoWrongAnswer(session))}
          onNext={() => setSession(askNextQuestion(session))}
        />
        {aside}
      </div>
    </div>
  )
}

