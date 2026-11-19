import { ProgressUpdate, Volume } from './types';

type KeyedProgressUpdate = ProgressUpdate & { key: string };

export const getProgressUpdates = (volume: Volume): KeyedProgressUpdate[] =>
  Object.entries(volume.updates ?? {})
    .map(([key, update]) => ({ ...update, key }))
    .toSorted((a, b) => Temporal.Instant.compare(a.at, b.at));
