import { ConflictStatus } from '../localFirst/createLocalFirstContext';
import { Conflict } from '../localFirst/editTimes';
import { ChangeChoices } from './ChangeChoices';
import {
  describeConflict,
  describeDeletion,
  describeValue,
} from './describeConflict';
import { getDiffParts } from './getDiffParts';

type FieldConflictChoiceProps = {
  conflict: Conflict;
  conflictStatus: ConflictStatus;
};

export function FieldConflictChoice({
  conflict,
  conflictStatus,
}: FieldConflictChoiceProps) {
  const caption = describeConflict(conflict);
  const note = describeDeletion(conflict);

  return (
    <li className="conflict" aria-label={caption}>
      <div className="conflict-caption">{caption}</div>
      <div className="conflict-diff">
        {getDiffParts(
          describeValue(conflict.theirs),
          describeValue(conflict.mine),
        ).map(({ text, kind }, index) =>
          kind === 'removed' ? (
            <del key={index}>{text}</del>
          ) : kind === 'added' ? (
            <ins key={index}>{text}</ins>
          ) : (
            text
          ),
        )}
      </div>
      {note && <div className="conflict-note">{note}</div>}
      <ChangeChoices
        discardLabel="Discard"
        keepLabel="Keep"
        onDiscard={() => conflictStatus.keepTheirs(conflict.path)}
        onKeep={() => conflictStatus.keepMine(conflict.path)}
      />
    </li>
  );
}
