import type { StudyItem } from '../data/studyItem'

const ACTIVE_ITEMS = 10
const LIMITED_TIME_ITEMS = 3
const MAX_RECENT_ITEMS = 5

export type QuestionType = 'meaning' | 'reading'

export interface SessionItem extends StudyItem {
  isMeaningDone: boolean
  isReadingDone: boolean
  incorrectMeaningAnswers: number
  incorrectReadingAnswers: number
}

export interface Question {
  item: SessionItem
  type: QuestionType
}

export interface QuizSession {
  active: SessionItem[]
  waiting: SessionItem[]
  completed: SessionItem[]
  question: Question | null
  recentItemIds: number[]
  isShowingAnswer: boolean
  questionNumber: number
  isWrappingUp: boolean
  isLimitedTime: boolean
  correctAnswers: number
  totalAnswers: number
}

export function createSession(queue: readonly StudyItem[]): QuizSession {
  const items = queue.map((item) => ({
    ...item,
    isMeaningDone: false,
    isReadingDone: !hasReading(item),
    incorrectMeaningAnswers: 0,
    incorrectReadingAnswers: 0,
  }))
  const session = {
    active: items.slice(0, ACTIVE_ITEMS),
    waiting: items.slice(ACTIVE_ITEMS),
    completed: [],
    question: null,
    recentItemIds: [],
    isShowingAnswer: false,
    questionNumber: 1,
    isWrappingUp: false,
    isLimitedTime: false,
    correctAnswers: 0,
    totalAnswers: 0,
  }
  return { ...session, question: pickQuestion(session.active, [], null) }
}

export function answerCorrectly(session: QuizSession): QuizSession {
  const { question } = session
  if (!question || session.isShowingAnswer) return session

  const item = markQuestionDone(question)
  const isComplete = item.isMeaningDone && item.isReadingDone
  const next = isComplete ? completeItem(session, question.item, item) : replaceItem(session, question.item, item)

  return {
    ...next,
    question: { item, type: question.type },
    correctAnswers: session.correctAnswers + 1,
    totalAnswers: session.totalAnswers + 1,
  }
}

export function answerWrongly(session: QuizSession): QuizSession {
  const { question } = session
  if (!question || session.isShowingAnswer) return session

  const item = changeWrongAnswerCount(question, 1)

  return {
    ...replaceItem(session, question.item, item),
    question: { item, type: question.type },
    isShowingAnswer: true,
    totalAnswers: session.totalAnswers + 1,
  }
}

export function undoWrongAnswer(session: QuizSession): QuizSession {
  const { question } = session
  if (!question || !session.isShowingAnswer) return session

  const item = changeWrongAnswerCount(question, -1)

  return {
    ...replaceItem(session, question.item, item),
    question: { item, type: question.type },
    isShowingAnswer: false,
    totalAnswers: session.totalAnswers - 1,
  }
}

export function askNextQuestion(session: QuizSession): QuizSession {
  const recentItemIds = rememberAskedItem(session.recentItemIds, session.question)
  return {
    ...session,
    recentItemIds,
    isShowingAnswer: false,
    question: pickQuestion(session.active, recentItemIds, session.question),
    questionNumber: session.questionNumber + 1,
  }
}

export function startWrapUp(session: QuizSession): QuizSession {
  return { ...session, ...keepOnlyStartedItems(session), isWrappingUp: true }
}

export function stopWrapUp(session: QuizSession): QuizSession {
  return refillActiveItems({ ...session, isWrappingUp: false })
}

export function startLimitedTime(session: QuizSession): QuizSession {
  const items = keepOnlyStartedItems(session)
  const batch = session.isWrappingUp ? items : fillActiveItems(items.active, items.waiting, LIMITED_TIME_ITEMS)
  return { ...session, ...batch, isLimitedTime: true }
}

export function stopLimitedTime(session: QuizSession): QuizSession {
  return refillActiveItems({ ...session, isLimitedTime: false })
}

export function countRemainingItems(session: QuizSession): number {
  return session.active.length + (session.isWrappingUp ? 0 : session.waiting.length)
}

export function isSafeToStop(session: QuizSession): boolean {
  return !session.active.some(isStarted)
}

function keepOnlyStartedItems(session: QuizSession) {
  const currentItem = session.question?.item
  const isKept = (item: SessionItem) => item === currentItem || isStarted(item)
  return {
    active: session.active.filter(isKept),
    waiting: [...session.active.filter((item) => !isKept(item)), ...session.waiting],
  }
}

function isStarted(item: SessionItem) {
  const isAnyQuestionDone = item.isMeaningDone || (hasReading(item) && item.isReadingDone)
  return isAnyQuestionDone || item.incorrectMeaningAnswers + item.incorrectReadingAnswers > 0
}

function markQuestionDone({ item, type }: Question): SessionItem {
  return type === 'meaning' ? { ...item, isMeaningDone: true } : { ...item, isReadingDone: true }
}

function changeWrongAnswerCount({ item, type }: Question, change: number): SessionItem {
  return type === 'meaning'
    ? { ...item, incorrectMeaningAnswers: item.incorrectMeaningAnswers + change }
    : { ...item, incorrectReadingAnswers: item.incorrectReadingAnswers + change }
}

function replaceItem(session: QuizSession, oldItem: SessionItem, newItem: SessionItem): QuizSession {
  return { ...session, active: session.active.map((item) => (item === oldItem ? newItem : item)) }
}

function completeItem(session: QuizSession, oldItem: SessionItem, completedItem: SessionItem): QuizSession {
  const active = session.active.filter((item) => item !== oldItem)
  return refillActiveItems({ ...session, active, completed: [...session.completed, completedItem] })
}

function refillActiveItems(session: QuizSession): QuizSession {
  if (session.isWrappingUp) return session
  if (session.isLimitedTime && session.active.length > 0) return session

  const size = session.isLimitedTime ? LIMITED_TIME_ITEMS : ACTIVE_ITEMS
  return { ...session, ...fillActiveItems(session.active, session.waiting, size) }
}

function fillActiveItems(active: readonly SessionItem[], waiting: readonly SessionItem[], size: number) {
  const freeSlots = Math.max(size - active.length, 0)
  return { active: [...active, ...waiting.slice(0, freeSlots)], waiting: waiting.slice(freeSlots) }
}

function hasReading({ subject }: StudyItem) {
  return (subject.data.readings?.length ?? 0) > 0
}

function rememberAskedItem(recentItemIds: readonly number[], question: Question | null) {
  if (!question) return [...recentItemIds]
  const askedId = question.item.assignment.id
  return [askedId, ...recentItemIds.filter((id) => id !== askedId)].slice(0, MAX_RECENT_ITEMS)
}

function pickQuestion(active: readonly SessionItem[], recentItemIds: readonly number[], previous: Question | null): Question | null {
  const questions = active.flatMap((item) => [
    ...(item.isMeaningDone ? [] : [{ item, type: 'meaning' as const }]),
    ...(item.isReadingDone ? [] : [{ item, type: 'reading' as const }]),
  ])

  const choices = avoidRecentItems(avoidPreviousQuestion(questions, previous), recentItemIds)
  return choices[Math.floor(Math.random() * choices.length)] ?? null
}

function avoidPreviousQuestion(questions: readonly Question[], previous: Question | null) {
  if (!previous || questions.length <= 1) return questions
  return questions.filter((q) => q.item.assignment.id !== previous.item.assignment.id || q.type !== previous.type)
}

function avoidRecentItems(questions: readonly Question[], recentItemIds: readonly number[]) {
  const itemIds = new Set(questions.map((q) => q.item.assignment.id))
  const recentInPlay = recentItemIds.filter((id) => itemIds.has(id))
  const avoided = new Set(recentInPlay.slice(0, Math.floor(itemIds.size / 2)))
  return questions.filter((q) => !avoided.has(q.item.assignment.id))
}
