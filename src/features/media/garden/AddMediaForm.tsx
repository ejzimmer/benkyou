import { FormEvent, useState } from 'react';
import { useModal } from '../../../journal/controls/ModalContext';
import { Switch } from '../../../journal/controls/Switch';
import { TickIcon } from '../../../journal/icons/Tick';
import { BookVolumeNames } from './BookVolumeNames';
import { CountField } from './CountField';
import { LanguageOption } from './LanguageOption';
import { useLanguageMediaStorage } from './LanguageMediaStorageContext';
import { MediaTypeOption } from './MediaTypeOption';
import { Language, LANGUAGES, MEDIA_TYPES, MediaType, NewMedia } from './types';

import './AddMediaForm.css';

const readCount = (data: FormData, name: string) =>
  Number(data.get(name)) || undefined;

const readAllText = (data: FormData, name: string) =>
  data
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);

function readNewMedia(
  data: FormData,
  type: MediaType,
  language: Language,
): NewMedia {
  const name = String(data.get('name')).trim();

  switch (type) {
    case 'tv':
      return { type, name, language, seasonCount: readCount(data, 'seasons') };
    case 'youtube':
      return { type, name, language };
    case 'manga':
      return { type, name, language, volumeCount: readCount(data, 'volumes') };
    case 'book':
      return {
        type,
        name,
        language,
        volumeNames: readAllText(data, 'volumeName'),
      };
  }
}

export function AddMediaForm() {
  const { addMedia } = useLanguageMediaStorage();
  const { closeModal } = useModal();
  const [type, setType] = useState<MediaType>('book');
  const [language, setLanguage] = useState<Language>('french');

  const submitMedia = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addMedia(readNewMedia(new FormData(event.currentTarget), type, language));
    closeModal();
  };

  return (
    <form
      className="add-media-form"
      aria-label="Add media"
      onSubmit={submitMedia}
    >
      <input
        className="add-media-name"
        name="name"
        aria-label="Name"
        autoComplete="off"
        required
      />
      <div className="add-media-switches">
        <Switch
          options={[...MEDIA_TYPES]}
          value={type}
          onChange={setType}
          name="type"
          Option={MediaTypeOption}
        />
        <Switch
          options={[...LANGUAGES]}
          value={language}
          onChange={setLanguage}
          name="language"
          Option={LanguageOption}
        />
      </div>
      <div className="add-media-body">
        {type === 'book' && <BookVolumeNames />}
        {type === 'manga' && (
          <CountField name="volumes" label="Volumes" icon="📚" />
        )}
        {type === 'tv' && (
          <CountField name="seasons" label="Seasons" icon="📺" />
        )}
        <button type="submit" className="progress-update-save" aria-label="Add">
          <TickIcon width="20px" strokeWidth="2.6" />
        </button>
      </div>
    </form>
  );
}
