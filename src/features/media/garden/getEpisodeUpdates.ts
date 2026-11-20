import { Episode, EpisodeUpdate } from './types';

type KeyedEpisodeUpdate = EpisodeUpdate & { key: string };

export const getEpisodeUpdates = (episode: Episode): KeyedEpisodeUpdate[] =>
  Object.entries(episode.updates ?? {})
    .map(([key, update]) => ({ ...update, key }))
    .toSorted((a, b) => Temporal.Instant.compare(a.at, b.at));
