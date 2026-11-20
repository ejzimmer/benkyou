import { toKana } from 'wanakana'
import type { Resource, Subject } from '../api/types'
import { checkMeaning, type MeaningResult } from './checkMeaning'
import { checkReading, type ReadingResult } from './checkReading'
import { findLookalikeAnswer, type LookalikeAnswer } from './findLookalikeAnswer'
import type { QuestionType } from './session'

export type AnswerResult = 'blank' | MeaningResult | ReadingResult | LookalikeAnswer

export type UnmarkableAnswer = Exclude<AnswerResult, 'correct' | 'incorrect'>

const WRONG_FOR_THIS_SUBJECT: ReadonlySet<AnswerResult> = new Set(['incorrect', 'onyomi-wanted', 'kunyomi-wanted'])

export function checkAnswer(
  answer: string,
  type: QuestionType,
  subject: Resource<Subject>,
  synonyms: readonly string[],
  lookalikes: readonly Resource<Subject>[] = [],
): AnswerResult {
  if (!answer.trim()) return 'blank'

  const result = type === 'meaning' ? checkMeaning(answer, subject.data, synonyms) : checkReading(answer, subject.data)
  if (!WRONG_FOR_THIS_SUBJECT.has(result)) return result
  return findLookalikeAnswer(answer, type, subject, lookalikes) ?? result
}

// Converts romaji to kana as it's typed, leaving a trailing "n" until the next letter decides it.
export function convertTypedKana(value: string) {
  return toKana(value, { IMEMode: true })
}
