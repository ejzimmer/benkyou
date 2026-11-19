import { FormEvent, KeyboardEvent, useState } from 'react';
import { useModal } from '../../../journal/controls/ModalContext';
import { TickIcon } from '../../../journal/icons/Tick';
import { CountTile } from './CountTile';
import { EpisodeNameTile } from './EpisodeNameTile';
import { LadyBeetleIcon } from './LadyBeetleIcon';
import { UnderstoodTile } from './UnderstoodTile';
import { useLanguageMediaStorage } from './LanguageMediaStorageContext';
import { VideoLengthTile } from './VideoLengthTile';
import { parseNumber, readDuration, readText } from './fields';
import { findNextNumber } from './newItems';
import { Comprehension, Season, TvSeries } from './types';

import './ProgressUpdateForm.css';

type AddEpisodeFormProps = { series: TvSeries; season: Season };

const isPastUpTo = (upTo: TvSeries['upTo'], season: number, episode: number) =>
  !upTo ||
  season > upTo.season ||
  (season === upTo.season && episode > upTo.episode);

export function AddEpisodeForm({ series, season }: AddEpisodeFormProps) {
  const { addItem, updateItem } = useLanguageMediaStorage();
  const { closeModal } = useModal();
  const [lookups, setLookups] = useState(0);
  const [aiQuestions, setAiQuestions] = useState(0);
  const number = findNextNumber(season.episodes);
  const episodesPath = [series.id, 'seasons', season.id, 'episodes'];

  const submitOnEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  const recordWatchedEpisode = (
    episodeId: string,
    lengthInSeconds: number | undefined,
    comprehension: Comprehension,
  ) => {
    updateItem([...episodesPath, episodeId, 'updates', crypto.randomUUID()], {
      at: Temporal.Now.instant().toString(),
      timestampInSeconds: lengthInSeconds,
      ...comprehension,
    });
    if (isPastUpTo(series.upTo, season.number, number)) {
      updateItem([series.id], {
        upTo: {
          season: season.number,
          episode: number,
          timestampInSeconds: lengthInSeconds ?? 0,
        },
      });
    }
  };

  const addEpisode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lengthInSeconds = readDuration(data, 'length');
    const comprehension = {
      lookups: parseNumber(data, 'lookups') ?? 0,
      aiQuestions: parseNumber(data, 'aiQuestions') ?? 0,
      understood: parseNumber(data, 'understood'),
    };
    const isWatched =
      comprehension.lookups > 0 ||
      comprehension.aiQuestions > 0 ||
      comprehension.understood !== undefined;
    const episodeId = addItem(episodesPath, {
      number,
      name: readText(data, 'name'),
      lengthInSeconds,
      lookups: 0,
      aiQuestions: 0,
      ...(isWatched && { status: 'done' }),
    });
    if (episodeId && isWatched) {
      recordWatchedEpisode(episodeId, lengthInSeconds, comprehension);
    }
    closeModal();
  };

  return (
    <form
      className="progress-update-form"
      aria-label={`Add an episode to ${series.name} season ${season.number}`}
      onKeyDown={submitOnEnter}
      onSubmit={addEpisode}
    >
      <h2 className="progress-update-title">
        <span>
          {series.name}{' '}
          <span className="new-volume-number">
            {season.number}-{number}
          </span>
        </span>
      </h2>
      <div className="progress-update-body">
        <div className="progress-tiles">
          <EpisodeNameTile />
          <CountTile
            name="lookups"
            label="Looked up"
            addLabel="Add a lookup"
            icon={<LadyBeetleIcon colour="red" width="45px" />}
            count={lookups}
            onAdd={() => setLookups((count) => count + 1)}
          />
          <CountTile
            name="aiQuestions"
            label="Asked AI"
            addLabel="Add an AI question"
            icon={<LadyBeetleIcon colour="yellow" width="45px" />}
            count={aiQuestions}
            onAdd={() => setAiQuestions((count) => count + 1)}
          />
          <VideoLengthTile durationFormat="mm:ss" />
          <UnderstoodTile mediaType="tv" />
        </div>
        <div className="progress-update-actions">
          <button
            type="submit"
            className="progress-update-save"
            aria-label="Add episode"
          >
            <TickIcon width="20px" strokeWidth="2.6" />
          </button>
        </div>
      </div>
    </form>
  );
}
