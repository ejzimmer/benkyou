// Shapes from the WaniKani API v2 (https://docs.api.wanikani.com), trimmed to what we use.

export interface Resource<T> {
  id: number
  object: string
  url: string
  data_updated_at: string | null
  data: T
}

export interface Collection<T> {
  object: 'collection'
  url: string
  pages: { next_url: string | null; previous_url: string | null; per_page: number }
  total_count: number
  data_updated_at: string | null
  data: Resource<T>[]
}

export interface Preferences {
  default_voice_actor_id: number
  extra_study_autoplay_audio: boolean
  lessons_autoplay_audio: boolean
  lessons_batch_size: number
  lessons_presentation_order: 'ascending_level_then_subject' | 'shuffled' | 'ascending_level_then_shuffled'
  reviews_autoplay_audio: boolean
  reviews_display_srs_indicator: boolean
  reviews_presentation_order: 'shuffled' | 'lower_levels_first'
}

export interface User {
  username: string
  level: number
  profile_url: string
  started_at: string
  current_vacation_started_at: string | null
  subscription: {
    active: boolean
    type: 'free' | 'recurring' | 'lifetime' | 'unknown'
    max_level_granted: number
    period_ends_at: string | null
  }
  preferences: Preferences
}

export type SubjectType = 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'

export interface Meaning {
  meaning: string
  primary: boolean
  accepted_answer: boolean
}

export interface Reading {
  reading: string
  primary: boolean
  accepted_answer: boolean
  type?: 'onyomi' | 'kunyomi' | 'nanori'
}

export interface AuxiliaryMeaning {
  meaning: string
  type: 'whitelist' | 'blacklist'
}

export interface ContextSentence {
  en: string
  ja: string
}

export interface CharacterImage {
  url: string
  content_type: 'image/svg+xml' | 'image/png'
  metadata: { inline_styles?: boolean; dimensions?: string }
}

export interface Subject {
  level: number
  slug: string
  characters: string | null
  character_images?: CharacterImage[]
  meanings: Meaning[]
  auxiliary_meanings: AuxiliaryMeaning[]
  readings?: Reading[]
  component_subject_ids?: number[]
  amalgamation_subject_ids?: number[]
  meaning_mnemonic: string
  reading_mnemonic?: string
  context_sentences?: ContextSentence[]
  lesson_position: number
  spaced_repetition_system_id: number
  hidden_at: string | null
  document_url: string
}

export interface Assignment {
  subject_id: number
  subject_type: SubjectType
  srs_stage: number
  unlocked_at: string | null
  started_at: string | null
  passed_at: string | null
  burned_at: string | null
  available_at: string | null
  resurrected_at: string | null
  hidden: boolean
}

export interface ReviewStatistic {
  subject_id: number
  subject_type: SubjectType
  meaning_correct: number
  meaning_incorrect: number
  meaning_max_streak: number
  meaning_current_streak: number
  reading_correct: number
  reading_incorrect: number
  reading_max_streak: number
  reading_current_streak: number
  percentage_correct: number
  hidden: boolean
}

export interface StudyMaterial {
  subject_id: number
  subject_type: SubjectType
  meaning_note: string | null
  reading_note: string | null
  meaning_synonyms: string[]
  hidden: boolean
}

export interface SrsStage {
  position: number
  interval: number | null
  interval_unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | null
}

export interface SpacedRepetitionSystem {
  name: string
  description: string
  unlocking_stage_position: number
  starting_stage_position: number
  passing_stage_position: number
  burning_stage_position: number
  stages: SrsStage[]
}

export interface CreatedReview {
  resources_updated: {
    assignment: Resource<Assignment>
    review_statistic: Resource<ReviewStatistic>
  }
}
