import { FormEvent, useState } from 'react';
import { DeleteWithConfirmation } from '../shared/controls/DeleteWithConfirmation';
import { useModal } from '../shared/controls/ModalContext';
import { Switch } from '../shared/controls/Switch';
import { TickIcon } from '../shared/icons/Tick';
import { BookVolumeRow } from './BookVolumeRow';
import { parseNumber, readText } from './fields';
import { LanguageOption } from './LanguageOption';
import { useLanguageMediaStorage } from './LanguageMediaStorageContext';
import { getItemsByNumber } from './lists';
import { MangaVolumePages } from './MangaVolumePages';
import { Language, LANGUAGES, PrintSeries } from './types';

import './ProgressUpdateForm.css';
import './AddMediaForm.css';
import './GardenEditForms.css';

type EditSeriesFormProps = { series: PrintSeries };

export function EditSeriesForm({ series }: EditSeriesFormProps) {
  const { updateItem, deleteItem } = useLanguageMediaStorage();
  const { closeModal } = useModal();
  const [language, setLanguage] = useState<Language>(series.language);
  const volumes = getItemsByNumber(series.volumes);

  const saveSeries = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateItem([series.id], {
      name: readText(data, 'name') ?? series.name,
      language,
    });
    volumes.forEach((volume) =>
      updateItem([series.id, 'volumes', volume.id], {
        ...(series.type === 'book' && {
          name: readText(data, `name-${volume.id}`),
        }),
        pages: parseNumber(data, `pages-${volume.id}`),
      }),
    );
    closeModal();
  };

  const deleteSeries = () => {
    deleteItem([series.id]);
    closeModal();
  };

  return (
    <form
      className="edit-media-form"
      aria-label={`Edit ${series.name}`}
      onSubmit={saveSeries}
    >
      <input
        className="add-media-name"
        name="name"
        aria-label="Name"
        autoComplete="off"
        defaultValue={series.name}
        required
      />
      <div className="add-media-switches">
        <Switch
          options={[...LANGUAGES]}
          value={language}
          onChange={setLanguage}
          name="language"
          Option={LanguageOption}
        />
      </div>
      {series.type === 'book' ? (
        <div className="book-volume-rows">
          {volumes.map((volume) => (
            <BookVolumeRow key={volume.id} volume={volume} />
          ))}
        </div>
      ) : (
        <div className="manga-volume-grid">
          {volumes.map((volume) => (
            <MangaVolumePages key={volume.id} volume={volume} />
          ))}
        </div>
      )}
      <div className="edit-media-actions">
        <DeleteWithConfirmation
          className="progress-update-delete"
          label={`Delete ${series.name}`}
          onDelete={deleteSeries}
        />
        <button
          type="submit"
          className="progress-update-save"
          aria-label="Save"
        >
          <TickIcon width="20px" strokeWidth="2.6" />
        </button>
      </div>
    </form>
  );
}
