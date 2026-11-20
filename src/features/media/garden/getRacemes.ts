import { calculateEpisodeUpdatePosition } from './calculateEpisodeUpdatePosition';
import { calculateEpisodeProgress } from './calculateEpisodeProgress';
import { getEpisodeUpdates } from './getEpisodeUpdates';
import { Episode, Season, TvSeries } from './types';
import { getVineEpisodes } from './vineLayout';

export type Raceme = {
  key: string;
  season: Season;
  episode: Episode;
  shootKey: string;
  at: number;
  understood?: number;
  date: string;
};

export function getRacemes(series: TvSeries): Raceme[] {
  return getVineEpisodes(series).flatMap(({ season, episodes }) =>
    episodes.flatMap((episode) => {
      const progress = calculateEpisodeProgress(series, season, episode);
      if (!progress) return [];
      return getEpisodeUpdates(episode).map((update) => ({
        key: update.key,
        season,
        episode,
        shootKey: `${season.id}-${episode.id}-shoot`,
        at: calculateEpisodeUpdatePosition(episode, update, progress),
        understood: update.understood,
        date: update.at,
      }));
    }),
  );
}
