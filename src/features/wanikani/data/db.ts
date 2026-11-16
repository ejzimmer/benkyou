import { Dexie, type EntityTable } from 'dexie'
import type {
  Assignment,
  Resource,
  ReviewStatistic,
  SpacedRepetitionSystem,
  StudyMaterial,
  Subject,
  User,
} from '../api/types'

export interface SyncState {
  collection: CollectionName
  // The newest data_updated_at we've stored, used as updated_after next time.
  lastUpdatedAt: string
  lastSyncedAt: string
}

export interface StoredUser {
  id: 'me'
  user: User
  syncedAt: string
}

export interface PendingReview {
  id?: number
  assignmentId: number
  incorrectMeaningAnswers: number
  incorrectReadingAnswers: number
  createdAt: string
}

export interface PendingLessonStart {
  assignmentId: number
  createdAt: string
}

export type CollectionName = 'subjects' | 'assignments' | 'reviewStatistics' | 'studyMaterials' | 'spacedRepetitionSystems'

// A local copy of everything we read from WaniKani. Rows are stored exactly as
// the API returns them, so `id` is the WaniKani id and fields live under `data`.
export const db = new Dexie('yomu') as Dexie & {
  subjects: EntityTable<Resource<Subject>, 'id'>
  assignments: EntityTable<Resource<Assignment>, 'id'>
  reviewStatistics: EntityTable<Resource<ReviewStatistic>, 'id'>
  studyMaterials: EntityTable<Resource<StudyMaterial>, 'id'>
  spacedRepetitionSystems: EntityTable<Resource<SpacedRepetitionSystem>, 'id'>
  syncState: EntityTable<SyncState, 'collection'>
  user: EntityTable<StoredUser, 'id'>
  pendingReviews: EntityTable<PendingReview, 'id'>
  pendingLessonStarts: EntityTable<PendingLessonStart, 'assignmentId'>
}

db.version(1).stores({
  subjects: 'id, data.level',
  assignments: 'id, data.subject_id, data.available_at',
  reviewStatistics: 'id, data.subject_id',
  studyMaterials: 'id, data.subject_id',
  spacedRepetitionSystems: 'id',
  syncState: 'collection',
  user: 'id',
})

db.version(2).stores({
  pendingReviews: '++id',
})

db.version(3).stores({
  pendingLessonStarts: 'assignmentId, createdAt',
})

export function clearDatabase() {
  return Promise.all(db.tables.map((table) => table.clear()))
}
