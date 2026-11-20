import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import type { WaniKaniClient } from '../api/client'
import { ShakeInput, type ShakeInputHandle } from '../components/ShakeInput'
import { convertTypedKana } from '../quiz/checkAnswer'
import type { Question } from '../quiz/session'
import { useCheckAnswer } from '../quiz/useCheckAnswer'
import { AnswerButtons } from './AnswerButtons'
import { CorrectAnswer } from './CorrectAnswer'
import { getTryAgainError } from './getTryAgainError'

interface Props {
  inputId: string
  question: Question
  client: WaniKaniClient
  isShowingAnswer: boolean
  onAnswer: (isCorrect: boolean) => void
  onRedo: () => void
  onNext: () => void
}

export function AnswerForm({ inputId, question, client, isShowingAnswer, onAnswer, onRedo, onNext }: Props) {
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<ShakeInputHandle>(null)
  const { type, item } = question
  const checkAnswer = useCheckAnswer(item.subject)

  function focusInput() {
    inputRef.current?.focus()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (inputRef.current?.isConfirmingText(event.timeStamp)) return

    if (isShowingAnswer) {
      onNext()
      return
    }

    const result = checkAnswer(answer, type)

    if (result !== 'correct' && result !== 'incorrect') {
      inputRef.current?.setError(getTryAgainError(result, answer, item.subject.data.characters))
      return
    }

    inputRef.current?.setError(null)
    flushSync(() => onAnswer(result === 'correct'))
    focusInput()
  }

  function redo() {
    flushSync(onRedo)
    focusInput()
  }

  function redoOnBackspace(event: KeyboardEvent<HTMLInputElement>) {
    if (isShowingAnswer && event.key === 'Backspace') {
      event.preventDefault()
      redo()
    }
  }

  return (
    <div className="answer">
      <form data-question={type} onSubmit={submit}>
        <div className="answer-row">
          <ShakeInput
            ref={inputRef}
            id={inputId}
            // The user is answering a question they just asked for, so jumping straight to the box is expected here.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            lang={type === 'reading' ? 'ja' : 'en'}
            aria-invalid={isShowingAnswer || undefined}
            readOnly={isShowingAnswer}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={answer}
            onChange={(e) => setAnswer(type === 'reading' ? convertTypedKana(e.target.value) : e.target.value)}
            onKeyDown={redoOnBackspace}
          />
          <AnswerButtons isShowingAnswer={isShowingAnswer} onRedo={redo} />
        </div>
      </form>
      {isShowingAnswer && <CorrectAnswer subject={item.subject} type={type} client={client} />}
    </div>
  )
}
