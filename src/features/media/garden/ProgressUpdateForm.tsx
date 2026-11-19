import { KeyboardEvent, FormEvent, useState } from 'react';
import { DeleteWithConfirmation } from '../../../journal/controls/DeleteWithConfirmation';
import { useModal } from '../../../journal/controls/ModalContext';
import { TickIcon } from '../../../journal/icons/Tick';
import { CountTile } from './CountTile';
import { LadyBeetleIcon } from './LadyBeetleIcon';
import { PageTile } from './PageTile';
import { UnderstoodTile } from './UnderstoodTile';
import { UpdateDate } from './UpdateDate';
import { useLanguageMediaStorage } from './LanguageMediaStorageContext';
import { parseNumber } from './fields';
import { formatVolumeName, formatVolumeTitle } from './format';
import { getPagedUpdates } from './getPagedUpdates';
import { PrintSeries, ProgressUpdate, Volume } from './types';

import './ProgressUpdateForm.css';

type ProgressUpdateFormProps = {
  series: PrintSeries;
  volume: Volume;
  updateKey?: string;
};

export function ProgressUpdateForm({
  series,
  volume,
  updateKey: existingUpdateKey,
}: ProgressUpdateFormProps) {
  const { updateItem, deleteItem } = useLanguageMediaStorage();
  const { closeModal } = useModal();
  const [newUpdateKey] = useState(() => crypto.randomUUID());
  const updateKey = existingUpdateKey ?? newUpdateKey;
  const updatePath = [series.id, 'volumes', volume.id, 'updates', updateKey];
  const update = volume.updates?.[updateKey];
  const name = formatVolumeName(volume);
  const pagedUpdates = getPagedUpdates(series);
  const latestPagedUpdate = pagedUpdates.at(-1);
  const isLatestPagedUpdate =
    latestPagedUpdate?.volume.id === volume.id &&
    latestPagedUpdate.key === updateKey;

  const submitOnEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  const startingPage = existingUpdateKey
    ? update?.page
    : series.upTo?.volume === volume.number
      ? series.upTo.page
      : undefined;

  const saveUpdate = (changes: Partial<ProgressUpdate>) =>
    updateItem(
      updatePath,
      update
        ? changes
        : {
            at: Temporal.Now.instant().toString(),
            lookups: 0,
            aiQuestions: 0,
            page: startingPage,
            ...changes,
          },
    );

  const saveProgress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const page = parseNumber(data, 'page');
    if (page !== undefined && (!existingUpdateKey || isLatestPagedUpdate)) {
      updateItem([series.id], { upTo: { volume: volume.number, page } });
    }
    const changes = {
      lookups: parseNumber(data, 'lookups') ?? 0,
      aiQuestions: parseNumber(data, 'aiQuestions') ?? 0,
      understood: parseNumber(data, 'understood'),
    };
    const hasProgress =
      changes.lookups > 0 ||
      changes.aiQuestions > 0 ||
      changes.understood !== undefined ||
      (page !== undefined && page !== startingPage);
    if (update || hasProgress) {
      saveUpdate({ ...changes, page: page ?? startingPage });
    }
    closeModal();
  };

  const deleteUpdate = () => {
    deleteItem(updatePath);
    if (isLatestPagedUpdate) {
      const previous = pagedUpdates.at(-2);
      updateItem([series.id], {
        upTo: previous && {
          volume: previous.volume.number,
          page: previous.page,
        },
      });
    }
    closeModal();
  };

  return (
    <form
      className="progress-update-form"
      aria-label={`Track ${name}`}
      onKeyDown={submitOnEnter}
      onSubmit={saveProgress}
    >
      <h2 className="progress-update-title">
        {formatVolumeTitle(series, volume)}
      </h2>
      {update && <UpdateDate instant={update.at} />}
      <div className="progress-update-body">
        <div className="progress-tiles">
          <CountTile
            name="lookups"
            label="Looked up"
            addLabel={`Add a lookup to ${name}`}
            icon={<LadyBeetleIcon colour="red" width="45px" />}
            count={update?.lookups ?? 0}
            onAdd={() => saveUpdate({ lookups: (update?.lookups ?? 0) + 1 })}
          />
          <CountTile
            name="aiQuestions"
            label="Asked AI"
            addLabel={`Add an AI question to ${name}`}
            icon={<LadyBeetleIcon colour="yellow" width="45px" />}
            count={update?.aiQuestions ?? 0}
            onAdd={() =>
              saveUpdate({ aiQuestions: (update?.aiQuestions ?? 0) + 1 })
            }
          />
          <PageTile page={startingPage} pages={volume.pages} />
          <UnderstoodTile
            mediaType={series.type}
            defaultValue={update?.understood}
          />
        </div>
        <div className="progress-update-actions">
          {existingUpdateKey && (
            <DeleteWithConfirmation
              className="progress-update-delete"
              onDelete={deleteUpdate}
            />
          )}
          <button
            type="submit"
            className="progress-update-save"
            aria-label="Save"
          >
            <TickIcon width="20px" strokeWidth="2.6" />
          </button>
        </div>
      </div>
    </form>
  );
}
