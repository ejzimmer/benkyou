import { Assignment, Subject } from './types';

export const subjects: Subject[] = [
  { id: 1, type: 'radical', level: 1 },
  { id: 2, type: 'radical', level: 1 },
  { id: 3, type: 'kanji', level: 1 },
  { id: 4, type: 'kanji', level: 2 },
  { id: 5, type: 'kanji', level: 2 },
  { id: 6, type: 'kanji', level: 2 },
  { id: 7, type: 'vocabulary', level: 2 },
];

export const assignments: Assignment[] = [
  { subjectId: 1, srsStage: 9, passedAt: '2026-01-01T00:00:00Z' },
  { subjectId: 2, srsStage: 8, passedAt: '2026-01-01T00:00:00Z' },
  { subjectId: 3, srsStage: 9, passedAt: '2026-01-01T00:00:00Z' },
  { subjectId: 4, srsStage: 4, passedAt: '2026-01-01T00:00:00Z' },
  { subjectId: 5, srsStage: 2, passedAt: null },
  { subjectId: 7, srsStage: 0, passedAt: null },
];
