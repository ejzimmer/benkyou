import { useSyncExternalStore } from 'react';
import { ConflictStatus } from './localFirst/createLocalFirstContext';
import { Modal } from './controls/Modal';
import { ChangeChoices } from './conflicts/ChangeChoices';
import { FieldConflictChoice } from './conflicts/FieldConflictChoice';
import { groupConflicts } from './conflicts/groupConflicts';
import { OrderConflictChoice } from './conflicts/OrderConflictChoice';
import './AppUpdateBanner.css';
import './ConflictBanner.css';

type ConflictBannerProps = {
  conflictStatus: ConflictStatus;
};

export function ConflictBanner({ conflictStatus }: ConflictBannerProps) {
  const conflicts = useSyncExternalStore(
    conflictStatus.subscribe,
    conflictStatus.listConflicts,
  );
  const groups = groupConflicts(conflicts);

  if (groups.length === 0) return null;

  return (
    <div className="app-update-banner conflict-banner" role="alert">
      <span>
        {groups.length === 1
          ? '1 conflict while uploading'
          : `${groups.length} conflicts while uploading`}
      </span>
      <Modal
        trigger={(props) => (
          <button className="primary" {...props}>
            Resolve
          </button>
        )}
      >
        <Modal.Body>
          <h2 className="conflict-heading">Local changes</h2>
          <ul className="conflict-list">
            {groups.map((group) =>
              group.kind === 'order' ? (
                <OrderConflictChoice
                  key={group.key}
                  listPath={group.listPath}
                  conflicts={group.conflicts}
                  conflictStatus={conflictStatus}
                />
              ) : (
                <FieldConflictChoice
                  key={group.key}
                  conflict={group.conflict}
                  conflictStatus={conflictStatus}
                />
              ),
            )}
          </ul>
          {groups.length > 1 && (
            <ChangeChoices
              className="keep-all"
              discardLabel="Discard all"
              keepLabel="Keep all"
              onDiscard={() =>
                conflicts.forEach(({ path }) => conflictStatus.keepTheirs(path))
              }
              onKeep={() =>
                conflicts.forEach(({ path }) => conflictStatus.keepMine(path))
              }
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
