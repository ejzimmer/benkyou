import { indexAssignmentsBySubject } from './indexAssignmentsBySubject';
import {
  Assignment,
  SRS_GROUPS,
  SrsGroup,
  Subject,
  SUBJECT_TYPES,
  SubjectType,
} from './types';

export function getSrsGroup(srsStage: number): SrsGroup | undefined {
  if (srsStage >= 9) return 'burned';
  if (srsStage === 8) return 'enlightened';
  if (srsStage === 7) return 'master';
  if (srsStage >= 5) return 'guru';
  if (srsStage >= 1) return 'apprentice';
  return undefined;
}

export function countSubjectsBySrsGroup(
  subjects: Subject[],
  assignments: Assignment[],
): Record<SubjectType, { total: number; counts: Record<SrsGroup, number> }> {
  const assignmentsBySubject = indexAssignmentsBySubject(assignments);

  return Object.fromEntries(
    SUBJECT_TYPES.map((type) => {
      const counts = Object.fromEntries(
        SRS_GROUPS.map((group) => [group, 0]),
      ) as Record<SrsGroup, number>;
      const subjectsOfType = subjects.filter(
        (subject) => subject.type === type,
      );
      subjectsOfType.forEach((subject) => {
        const srsStage = assignmentsBySubject.get(subject.id)?.srsStage ?? 0;
        const group = getSrsGroup(srsStage);
        if (group) counts[group]++;
      });
      return [type, { total: subjectsOfType.length, counts }];
    }),
  ) as Record<SubjectType, { total: number; counts: Record<SrsGroup, number> }>;
}
