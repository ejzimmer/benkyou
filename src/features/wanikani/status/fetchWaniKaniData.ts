import { fetchCollection, fetchUserLevel } from './api';
import { fetchCachedCollection } from './collectionCache';
import {
  Assignment,
  LevelProgression,
  Subject,
  SubjectType,
  WaniKaniData,
} from './types';

type RawSubject = { level: number; hidden_at: string | null };

type RawAssignment = {
  subject_id: number;
  srs_stage: number;
  passed_at: string | null;
  hidden: boolean;
};

type RawLevelProgression = {
  level: number;
  unlocked_at: string | null;
  passed_at: string | null;
  abandoned_at: string | null;
};

const SUBJECT_TYPES_BY_OBJECT: Record<string, SubjectType> = {
  radical: 'radical',
  kanji: 'kanji',
  vocabulary: 'vocabulary',
  kana_vocabulary: 'vocabulary',
};

export async function fetchWaniKaniData(apiKey: string): Promise<WaniKaniData> {
  const [level, subjects, assignments, levelProgressions] = await Promise.all([
    fetchUserLevel(apiKey),
    fetchCachedCollection<RawSubject, Subject>(
      'subjects',
      apiKey,
      (resource) => {
        const type = SUBJECT_TYPES_BY_OBJECT[resource.object];
        return type && !resource.data.hidden_at
          ? { id: resource.id, type, level: resource.data.level }
          : undefined;
      },
    ),
    fetchCachedCollection<RawAssignment, Assignment>(
      'assignments',
      apiKey,
      ({ data }) =>
        data.hidden
          ? undefined
          : {
              subjectId: data.subject_id,
              srsStage: data.srs_stage,
              passedAt: data.passed_at,
            },
    ),
    fetchLevelProgressions(apiKey),
  ]);

  return { level, subjects, assignments, levelProgressions };
}

async function fetchLevelProgressions(
  apiKey: string,
): Promise<LevelProgression[]> {
  const { resources } = await fetchCollection<RawLevelProgression>(
    'level_progressions',
    apiKey,
  );
  return resources.map(({ data }) => ({
    level: data.level,
    unlockedAt: data.unlocked_at,
    passedAt: data.passed_at,
    abandonedAt: data.abandoned_at,
  }));
}
