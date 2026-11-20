import { FormEvent } from 'react';
import { useModal } from '../../../journal/controls/ModalContext';
import { TickIcon } from '../../../journal/icons/Tick';
import { CountField } from './CountField';
import { readNumber, readText } from './fields';
import { useLanguageMediaStorage } from './LanguageMediaStorageContext';
import { findNextNumber } from './newItems';
import { createBranchSeed } from './treeLayout';
import { PrintSeries } from './types';
import { VolumeNameField } from './VolumeNameField';

import './AddMediaForm.css';

type AddVolumeFormProps = { series: PrintSeries };

export function AddVolumeForm({ series }: AddVolumeFormProps) {
  const { addItem } = useLanguageMediaStorage();
  const { closeModal } = useModal();
  const number = findNextNumber(series.volumes);

  const addVolume = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addItem([series.id, 'volumes'], {
      number,
      branchSeed: createBranchSeed(number),
      name: readText(data, 'name'),
      pages: readNumber(data, 'pages'),
    });
    closeModal();
  };

  return (
    <form
      className="add-volume-form"
      aria-label="Add volume"
      onSubmit={addVolume}
    >
      <h2 className="progress-update-title">
        <span>
          {series.name} <span className="new-volume-number">{number}</span>
        </span>
      </h2>
      <div className="add-media-body">
        {series.type === 'book' && (
          <VolumeNameField name="name" label="Name" isRequired />
        )}
        <CountField name="pages" label="Pages" icon="📖" isRequired />
        <button
          type="submit"
          className="progress-update-save"
          aria-label="Add volume"
        >
          <TickIcon width="20px" strokeWidth="2.6" />
        </button>
      </div>
    </form>
  );
}
