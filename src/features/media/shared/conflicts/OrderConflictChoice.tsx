import { ConflictStatus } from '../localFirst/createLocalFirstContext';
import { Conflict } from '../localFirst/editTimes';
import { ChangeChoices } from './ChangeChoices';
import { describeSection } from './describeConflict';
import { describeOrderConflict } from './describeOrderConflict';

type OrderConflictChoiceProps = {
  listPath: string;
  conflicts: Conflict[];
  conflictStatus: ConflictStatus;
};

export function OrderConflictChoice({
  listPath,
  conflicts,
  conflictStatus,
}: OrderConflictChoiceProps) {
  const caption = `Order · ${describeSection(listPath)}`;

  return (
    <li className="conflict" aria-label={caption}>
      <div className="conflict-caption">{caption}</div>
      <ol className="conflict-order">
        {describeOrderConflict(conflicts).map(
          ({ id, kind, position, name }) => (
            <li key={`${kind}-${id}`} value={position + 1}>
              {kind === 'added' ? (
                <ins>{name}</ins>
              ) : kind === 'removed' ? (
                <del>{name}</del>
              ) : (
                name
              )}
            </li>
          ),
        )}
      </ol>
      <ChangeChoices
        discardLabel="Discard"
        keepLabel="Keep"
        onDiscard={() =>
          conflicts.forEach(({ path }) => conflictStatus.keepTheirs(path))
        }
        onKeep={() =>
          conflicts.forEach(({ path }) => conflictStatus.keepMine(path))
        }
      />
    </li>
  );
}
