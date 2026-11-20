import type { SpacedRepetitionSystem } from '../api/types'
import { getCharacters } from '../data/getCharacters'
import type { SessionItem } from '../quiz/session'
import { getStageName } from './getStageName'
import { predictNextStage } from './predictNextStage'

export interface FeedEntry {
  id: number
  characters: string
  isUp: boolean
  stageName: string
}

export function getFeedEntry(item: SessionItem, srsSystems: ReadonlyMap<number, SpacedRepetitionSystem>): FeedEntry | null {
  const system = srsSystems.get(item.subject.data.spaced_repetition_system_id)
  if (!system) return null

  const currentStage = item.assignment.data.srs_stage
  const nextStage = predictNextStage(currentStage, item.incorrectMeaningAnswers + item.incorrectReadingAnswers, system)

  return {
    id: item.assignment.id,
    characters: getCharacters(item.subject.data),
    isUp: nextStage > currentStage,
    stageName: getStageName(nextStage),
  }
}
