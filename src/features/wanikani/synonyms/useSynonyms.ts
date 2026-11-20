import { useLiveQuery } from 'dexie-react-hooks'
import { getSynonyms } from './getSynonyms'

const NO_SYNONYMS: readonly string[] = []

export function useSynonyms(subjectId: number): readonly string[] {
  return useLiveQuery(() => getSynonyms(subjectId), [subjectId]) ?? NO_SYNONYMS
}
