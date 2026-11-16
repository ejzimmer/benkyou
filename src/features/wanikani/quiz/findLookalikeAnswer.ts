import type { Resource, Subject } from '../api/types'
import { checkMeaning } from './checkMeaning'
import { checkReading } from './checkReading'
import type { QuestionType } from './session'

export type LookalikeAnswer =
  | 'radical-meaning-wanted'
  | 'kanji-meaning-wanted'
  | 'kanji-reading-wanted'
  | 'vocabulary-meaning-wanted'
  | 'vocabulary-reading-wanted'

export function findLookalikeAnswer(
  answer: string,
  type: QuestionType,
  subject: Resource<Subject>,
  lookalikes: readonly Resource<Subject>[],
): LookalikeAnswer | null {
  const isLookalikeAnswer = lookalikes.some(({ data }) =>
    type === 'meaning' ? checkMeaning(answer, data) === 'correct' : checkReading(answer, data) === 'correct',
  )
  return isLookalikeAnswer ? getWantedAnswer(subject.object, type) : null
}

function getWantedAnswer(object: string, type: QuestionType): LookalikeAnswer | null {
  if (object === 'radical' && type === 'meaning') return 'radical-meaning-wanted'
  if (object === 'kanji') return `kanji-${type}-wanted`
  if (object === 'vocabulary') return `vocabulary-${type}-wanted`
  return null
}
