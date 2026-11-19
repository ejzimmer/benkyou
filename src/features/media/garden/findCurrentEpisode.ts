import { getItemsByNumber } from './lists';
import { TvSeries } from './types';

export function findCurrentEpisode({ seasons, upTo }: TvSeries) {
  const episodes = getItemsByNumber(seasons).flatMap((season) =>
    getItemsByNumber(season.episodes).map((episode) => ({ season, episode })),
  );
  const upToIndex = upTo
    ? episodes.findIndex(
        ({ season, episode }) =>
          season.number === upTo.season && episode.number === upTo.episode,
      )
    : -1;
  if (!upTo || upToIndex === -1) {
    return (
      episodes.find(({ episode }) => episode.status !== 'done') ??
      episodes.at(-1)
    );
  }
  const { episode } = episodes[upToIndex];
  const isFinished =
    episode.lengthInSeconds !== undefined &&
    upTo.timestampInSeconds >= episode.lengthInSeconds;
  return (isFinished && episodes[upToIndex + 1]) || episodes[upToIndex];
}
