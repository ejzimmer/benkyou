export const MAX_LEVEL = 60;

export const SUBJECT_TYPES = ['radical', 'kanji', 'vocabulary'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const SRS_GROUPS = [
  'apprentice',
  'guru',
  'master',
  'enlightened',
  'burned',
] as const;
export type SrsGroup = (typeof SRS_GROUPS)[number];

export type Subject = {
  id: number;
  type: SubjectType;
  level: number;
};

export type Assignment = {
  subjectId: number;
  srsStage: number;
  passedAt: string | null;
};

export type LevelProgression = {
  level: number;
  unlockedAt: string | null;
  passedAt: string | null;
  abandonedAt: string | null;
};

export type WaniKaniData = {
  level: number;
  subjects: Subject[];
  assignments: Assignment[];
  levelProgressions: LevelProgression[];
};
