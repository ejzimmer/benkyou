import { getEpisodeUpdates } from './getEpisodeUpdates';
import { getItemsByNumber } from './lists';
import { TvSeries } from './types';

export const getTimedEpisodeUpdates = (series: TvSeries) =>
  getItemsByNumber(series.seasons)
    .flatMap((season) =>
      getItemsByNumber(season.episodes).flatMap((episode) =>
        getEpisodeUpdates(episode).flatMap(({ key, at, timestampInSeconds }) =>
          timestampInSeconds === undefined
            ? []
            : [{ key, at, timestampInSeconds, season, episode }],
        ),
      ),
    )
    .toSorted((a, b) => Temporal.Instant.compare(a.at, b.at));
