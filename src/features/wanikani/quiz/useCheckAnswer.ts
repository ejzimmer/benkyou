import type { Resource, Subject } from '../api/types'
import { useSynonyms } from '../synonyms/useSynonyms'
import { checkAnswer } from './checkAnswer'
import type { QuestionType } from './session'
import { useLookalikeSubjects } from './useLookalikeSubjects'

export function useCheckAnswer(subject: Resource<Subject>) {
  const synonyms = useSynonyms(subject.id)
  const lookalikes = useLookalikeSubjects(subject)
  return (answer: string, type: QuestionType) => checkAnswer(answer, type, subject, synonyms, lookalikes)
}
