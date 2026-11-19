import { indexAssignmentsBySubject } from './indexAssignmentsBySubject';
import { Assignment, Subject, SubjectType } from './types';

const KANJI_PASS_RATIO = 0.9;

export function calculateLevelProgress(
  subjects: Subject[],
  assignments: Assignment[],
  level: number,
) {
  const assignmentsBySubject = indexAssignmentsBySubject(assignments);

  const countPassed = (type: SubjectType) => {
    const subjectsAtLevel = subjects.filter(
      (subject) => subject.level === level && subject.type === type,
    );
    const passed = subjectsAtLevel.filter(
      (subject) => assignmentsBySubject.get(subject.id)?.passedAt,
    ).length;
    return { passed, total: subjectsAtLevel.length };
  };

  const kanji = countPassed('kanji');
  return {
    radical: countPassed('radical'),
    kanji: {
      ...kanji,
      needed: Math.ceil(kanji.total * KANJI_PASS_RATIO),
    },
  };
}
