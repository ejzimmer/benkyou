import { Conflict } from '../localFirst/editTimes';
import { findPositionItemId } from '../localFirst/listOrder';
import { findName } from './describeConflict';
import { diffOrders, OrderChange } from './diffOrders';

type ListChange = OrderChange & { name: string };

type Positions = Map<string, number>;

export function describeOrderConflict(conflicts: Conflict[]): ListChange[] {
  const listItems = findListItems(conflicts);
  const myOrder = sortIdsByPosition(
    readPositions(listItems, conflicts, 'mine'),
  );
  const theirOrder = sortIdsByPosition(
    readPositions(listItems, conflicts, 'theirs'),
  );

  return diffOrders(myOrder, theirOrder).map((change) => ({
    ...change,
    name: findName(listItems[change.id]) ?? '',
  }));
}

function findListItems(conflicts: Conflict[]): Record<string, unknown> {
  const savedList = conflicts.find(({ list }) => isRecord(list))?.list;
  const conflictItems = Object.fromEntries(
    conflicts.map((conflict) => [
      findPositionItemId(conflict.path),
      conflict.item,
    ]),
  );
  return { ...conflictItems, ...(savedList as Record<string, unknown>) };
}

function readPositions(
  listItems: Record<string, unknown>,
  conflicts: Conflict[],
  side: 'mine' | 'theirs',
): Positions {
  const positions: Positions = new Map();
  Object.entries(listItems).forEach(([id, item]) => {
    if (isRecord(item) && typeof item.position === 'number') {
      positions.set(id, item.position);
    }
  });
  conflicts.forEach((conflict) => {
    const id = findPositionItemId(conflict.path);
    const position = conflict[side];
    if (typeof position === 'number') positions.set(id, position);
    else positions.delete(id);
  });
  return positions;
}

function sortIdsByPosition(positions: Positions): string[] {
  return [...positions.entries()]
    .sort(([, a], [, b]) => a - b)
    .map(([id]) => id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
