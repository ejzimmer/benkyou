import { calculateEpisodeProgress } from './calculateEpisodeProgress';
import { calculateEpisodeUpdatePosition } from './calculateEpisodeUpdatePosition';
import { getEpisodeUpdates } from './getEpisodeUpdates';
import { sliceIntoStretches } from './sliceIntoStretches';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { Episode, Season, TvSeries } from './types';
import { getVineEpisodes } from './vineLayout';

type EpisodeUpdateStretch = {
  key: string;
  season: Season;
  episode: Episode;
  date: string;
  edges: EdgeSample[];
};

export function getEpisodeUpdateStretches(
  series: TvSeries,
  shapes: GrownShape[],
): EpisodeUpdateStretch[] {
  return getVineEpisodes(series).flatMap(({ season, episodes }) =>
    episodes.flatMap((episode) => {
      const shoot = shapes.find(
        ({ key }) => key === `${season.id}-${episode.id}-shoot`,
      );
      if (!shoot) return [];
      const progress = calculateEpisodeProgress(series, season, episode);
      const updates = getEpisodeUpdates(episode);
      const ends = updates.map((update) => ({
        key: update.key,
        at: calculateEpisodeUpdatePosition(episode, update, progress),
      }));
      return sliceIntoStretches(shoot.edges, ends).map((stretch, index) => ({
        ...stretch,
        season,
        episode,
        date: updates[index].at,
      }));
    }),
  );
}
