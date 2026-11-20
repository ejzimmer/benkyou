import { indexAssignmentsBySubject } from './indexAssignmentsBySubject';
import { Assignment, Subject, SUBJECT_TYPES, SubjectType } from './types';

export function isUnlocked(srsStage: number) {
  return srsStage >= 1;
}

function isBurned(srsStage: number) {
  return srsStage >= 9;
}

type LevelCount = { counted: number; total: number };

export function calculatePercentsByLevel(
  subjects: Subject[],
  assignments: Assignment[],
  maxLevel: number,
  isCounted: (srsStage: number) => boolean,
): {
  level: number;
  counts: Record<SubjectType, LevelCount>;
  percents: Record<SubjectType, number>;
}[] {
  const assignmentsBySubject = indexAssignmentsBySubject(assignments);

  return Array.from({ length: maxLevel }, (_, index) => {
    const level = index + 1;
    const counts = Object.fromEntries(
      SUBJECT_TYPES.map((type) => {
        const subjectsAtLevel = subjects.filter(
          (subject) => subject.level === level && subject.type === type,
        );
        const counted = subjectsAtLevel.filter((subject) =>
          isCounted(assignmentsBySubject.get(subject.id)?.srsStage ?? 0),
        ).length;
        return [type, { counted, total: subjectsAtLevel.length }];
      }),
    ) as Record<SubjectType, LevelCount>;
    const percents = Object.fromEntries(
      SUBJECT_TYPES.map((type) => {
        const { counted, total } = counts[type];
        return [type, total === 0 ? 0 : Math.floor((counted / total) * 100)];
      }),
    ) as Record<SubjectType, number>;
    return { level, counts, percents };
  });
}

export function findFullyBurnedTypesByLevel(
  subjects: Subject[],
  assignments: Assignment[],
  maxLevel: number,
): Record<SubjectType, boolean>[] {
  return calculatePercentsByLevel(
    subjects,
    assignments,
    maxLevel,
    isBurned,
  ).map(
    ({ percents }) =>
      Object.fromEntries(
        SUBJECT_TYPES.map((type) => [type, percents[type] === 100]),
      ) as Record<SubjectType, boolean>,
  );
}
