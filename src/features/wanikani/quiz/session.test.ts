import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Assignment, Resource, Subject } from '../api/types'
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
  type QuizSession,
} from './session'

const makeItem = (id: number, hasReading = true): StudyItem => ({
  assignment: { id, data: { subject_id: id } } as Resource<Assignment>,
  subject: { id, data: { readings: hasReading ? [{ reading: 'a' }] : [] } } as unknown as Resource<Subject>,
})

const makeItems = (count: number) => Array.from({ length: count }, (_, i) => makeItem(i + 1))
const getIds = (items: readonly StudyItem[]) => items.map((item) => item.assignment.id).toSorted()

function isSameBatchOrNewBatch({ before, after }: { before: number[]; after: number[] }) {
  const isSameBatch = after.every((id) => before.includes(id))
  const isNewBatch = after.every((id) => !before.includes(id))
  return isSameBatch || isNewBatch
}

function answerEverything(session: QuizSession) {
  let current = session
  while (current.question) current = askNextQuestion(answerCorrectly(current))
  return current
}

describe('review session', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('asks meaning and reading for items with readings, and only meaning otherwise', () => {
    const session = createSession([makeItem(1), makeItem(2, false)])
    const asked: string[] = []
    let current = session
    while (current.question) {
      asked.push(`${current.question.item.assignment.id}:${current.question.type}`)
      current = askNextQuestion(answerCorrectly(current))
    }
    expect(asked.toSorted()).toEqual(['1:meaning', '1:reading', '2:meaning'])
    expect(current.completed.map((item) => item.assignment.id).toSorted()).toEqual([1, 2])
  })

  it('completes an item only once both questions are right', () => {
    let session = createSession([makeItem(1)])
    session = askNextQuestion(answerCorrectly(session))
    expect(session.completed).toEqual([])
    session = askNextQuestion(answerCorrectly(session))
    expect(session.completed).toHaveLength(1)
    expect(session.question).toBeNull()
  })

  it('records a correct answer without moving to the next question', () => {
    const session = createSession([makeItem(1), makeItem(2)])
    const answered = answerCorrectly(session)
    expect(answered.question?.item.assignment.id).toBe(session.question?.item.assignment.id)
    expect(answered.question?.type).toBe(session.question?.type)
    expect(answered.questionNumber).toBe(session.questionNumber)
    expect(answered.correctAnswers).toBe(1)
  })

  it('counts wrong answers and asks the question again later', () => {
    let session = createSession([makeItem(1)])
    session = answerWrongly(session)
    expect(session.isShowingAnswer).toBe(true)
    session = askNextQuestion(session)
    session = answerEverything(session)

    const [item] = session.completed
    expect(item.incorrectMeaningAnswers + item.incorrectReadingAnswers).toBe(1)
    expect(session.correctAnswers).toBe(2)
    expect(session.totalAnswers).toBe(3)
  })

  it('forgets a wrong answer marked as a typo and asks the same question again', () => {
    let session = createSession([makeItem(1)])
    const question = session.question!
    session = undoWrongAnswer(answerWrongly(session))

    expect(session.isShowingAnswer).toBe(false)
    expect(session.question?.type).toBe(question.type)
    expect(session.question?.item.assignment.id).toBe(1)
    session = answerEverything(session)
    expect(session.completed[0].incorrectMeaningAnswers + session.completed[0].incorrectReadingAnswers).toBe(0)
    expect(session.totalAnswers).toBe(2)
  })

  it('keeps ten items in play and tops up as items complete', () => {
    const session = createSession(Array.from({ length: 12 }, (_, i) => makeItem(i + 1, false)))
    expect(session.active).toHaveLength(10)
    expect(session.waiting).toHaveLength(2)
    const next = askNextQuestion(answerCorrectly(session))
    expect(next.active).toHaveLength(10)
    expect(next.waiting).toHaveLength(1)
    expect(answerEverything(next).completed).toHaveLength(12)
  })

  it('doesn’t ask the same question twice in a row when there’s a choice', () => {
    let session = createSession([makeItem(1, false), makeItem(2, false)])
    const askedFirst = session.question!.item.assignment.id
    session = askNextQuestion(answerWrongly(session))
    expect(session.question!.item.assignment.id).not.toBe(askedFirst)
  })

  it('asks about several other items before coming back to the same item', () => {
    let session = createSession(Array.from({ length: 10 }, (_, i) => makeItem(i + 1)))
    const askedIds: number[] = []
    for (let i = 0; i < 6; i++) {
      askedIds.push(session.question!.item.assignment.id)
      session = askNextQuestion(answerCorrectly(session))
    }
    expect(new Set(askedIds).size).toBe(6)
  })

  it('still finishes when only one item is left', () => {
    const session = createSession([makeItem(1)])
    expect(answerEverything(session).completed).toHaveLength(1)
  })

  describe('wrapping up', () => {
    it('finishes only the started items and the current one', () => {
      let session = createSession(makeItems(12))
      const started = session.question!.item.assignment.id
      session = askNextQuestion(answerCorrectly(session))
      const current = session.question!.item.assignment.id

      session = answerEverything(startWrapUp(session))
      expect(getIds(session.completed)).toEqual([started, current].toSorted())
    })

    it('keeps items with only wrong answers', () => {
      let session = createSession(makeItems(3))
      const answeredWrongly = session.question!.item.assignment.id
      session = askNextQuestion(answerWrongly(session))
      session = answerEverything(startWrapUp(session))
      expect(getIds(session.completed)).toContain(answeredWrongly)
      expect(session.completed).toHaveLength(2)
    })

    it('doesn’t count unstarted items as remaining', () => {
      const session = startWrapUp(createSession(makeItems(12)))
      expect(countRemainingItems(session)).toBe(1)
    })

    it('goes back to the whole queue when stopped', () => {
      const session = stopWrapUp(startWrapUp(createSession(makeItems(12))))
      expect(session.active).toHaveLength(10)
      expect(countRemainingItems(session)).toBe(12)
      expect(answerEverything(session).completed).toHaveLength(12)
    })
  })

  describe('limited time', () => {
    it('keeps the current item in play with two new ones', () => {
      const session = createSession(makeItems(12))
      const current = session.question!.item.assignment.id
      const limited = startLimitedTime(session)
      expect(limited.active).toHaveLength(3)
      expect(getIds(limited.active)).toContain(current)
      expect(countRemainingItems(limited)).toBe(12)
    })

    it('keeps every started item in play, even more than three', () => {
      let session = createSession(makeItems(12))
      for (let i = 0; i < 4; i++) session = askNextQuestion(answerWrongly(session))
      const started = session.active.filter((item) => item.incorrectMeaningAnswers + item.incorrectReadingAnswers > 0)
      expect(startLimitedTime(session).active).toHaveLength(Math.max(started.length + 1, 3))
    })

    it('finishes all three items before taking the next three', () => {
      let session = startLimitedTime(createSession(makeItems(7)))
      const changes: { before: number[]; after: number[] }[] = []
      while (session.question) {
        const before = getIds(session.active)
        session = askNextQuestion(answerCorrectly(session))
        changes.push({ before, after: getIds(session.active) })
      }

      expect(changes.every((change) => isSameBatchOrNewBatch(change))).toBe(true)
      expect(Math.max(...changes.map(({ after }) => after.length))).toBe(3)
      expect(session.completed).toHaveLength(7)
    })

    it('is safe to stop only when no item in play is started', () => {
      let session = startLimitedTime(createSession(makeItems(6)))
      expect(isSafeToStop(session)).toBe(true)
      const safeQuestions: boolean[] = []
      while (session.question) {
        session = askNextQuestion(answerCorrectly(session))
        safeQuestions.push(isSafeToStop(session))
      }
      expect(safeQuestions.filter(Boolean)).toHaveLength(2)
      expect(safeQuestions.at(5)).toBe(true)
    })

    it('isn’t safe to stop after a wrong answer', () => {
      const session = answerWrongly(startLimitedTime(createSession(makeItems(6))))
      expect(isSafeToStop(session)).toBe(false)
    })

    it('doesn’t take new items while wrapping up', () => {
      const session = startLimitedTime(startWrapUp(createSession(makeItems(12))))
      expect(session.active).toHaveLength(1)
      expect(answerEverything(session).completed).toHaveLength(1)
    })

    it('goes back to ten items in play when stopped', () => {
      const session = stopLimitedTime(startLimitedTime(createSession(makeItems(12))))
      expect(session.active).toHaveLength(10)
      expect(answerEverything(session).completed).toHaveLength(12)
    })
  })
})
