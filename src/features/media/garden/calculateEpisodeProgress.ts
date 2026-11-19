import { Episode, Season, TvSeries } from './types';

export function calculateEpisodeProgress(
  { upTo }: TvSeries,
  season: Season,
  { number, lengthInSeconds, status }: Episode,
) {
  if (status === 'done') return 1;
  if (status === 'not-started' || !upTo) return 0;
  if (upTo.season !== season.number) return upTo.season > season.number ? 1 : 0;
  if (upTo.episode !== number) return upTo.episode > number ? 1 : 0;
  if (!lengthInSeconds) return 0;
  return Math.min(1, upTo.timestampInSeconds / lengthInSeconds);
}
