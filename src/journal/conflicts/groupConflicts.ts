import { Conflict } from '../localFirst/editTimes';
import { findOrderedListPath } from '../localFirst/listOrder';

type ConflictGroup =
  | { kind: 'field'; key: string; conflict: Conflict }
  | { kind: 'order'; key: string; listPath: string; conflicts: Conflict[] };

export function groupConflicts(conflicts: Conflict[]): ConflictGroup[] {
  const groups: ConflictGroup[] = [];
  const orderGroups = new Map<string, Conflict[]>();

  conflicts.forEach((conflict) => {
    const listPath = findOrderedListPath(conflict.path);
    if (!listPath) {
      groups.push({ kind: 'field', key: conflict.path, conflict });
      return;
    }
    const orderGroup = orderGroups.get(listPath);
    if (orderGroup) {
      orderGroup.push(conflict);
      return;
    }
    const newGroup = [conflict];
    orderGroups.set(listPath, newGroup);
    groups.push({
      kind: 'order',
      key: listPath,
      listPath,
      conflicts: newGroup,
    });
  });

  return groups;
}
