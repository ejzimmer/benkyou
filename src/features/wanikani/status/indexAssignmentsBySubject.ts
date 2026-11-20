import { Assignment } from './types';

export function indexAssignmentsBySubject(assignments: Assignment[]) {
  return new Map(
    assignments.map((assignment) => [assignment.subjectId, assignment]),
  );
}
