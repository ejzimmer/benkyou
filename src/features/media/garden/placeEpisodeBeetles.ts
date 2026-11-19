import {
  BASE_GAP,
  createPerch,
  createTrunkPerch,
  interleaveColours,
  measureRoom,
  Perch,
  placeOnPerch,
} from './beetlePerches';
import { calculateEpisodeProgress } from './calculateEpisodeProgress';
import { calculateEpisodeUpdatePosition } from './calculateEpisodeUpdatePosition';
import { getEpisodeUpdates } from './getEpisodeUpdates';
import { LadyBeetleColour } from './LadyBeetle';
import { BeetleSpot } from './placeBeetles';
import { GrownShape } from './treeGrowth';
import { Episode, Season, TvSeries } from './types';
import { getVineEpisodes } from './vineLayout';

const SCATTERED_BEETLE_ROOM = 6;

type Stretch = { key: string; perch: Perch; colours: LadyBeetleColour[] };

function createStretches(
  series: TvSeries,
  season: Season,
  episode: Episode,
  shoot: GrownShape,
): Stretch[] {
  const shootPerch = createPerch(shoot);
  const [shootStart, shootEnd] = shootPerch.range;
  const progress = calculateEpisodeProgress(series, season, episode);
  let start = BASE_GAP;
  return getEpisodeUpdates(episode).map((update) => {
    const end = Math.min(
      shootEnd,
      Math.max(
        start,
        calculateEpisodeUpdatePosition(episode, update, progress),
      ),
    );
    const stretch = {
      key: update.key,
      perch: { ...shootPerch, range: [Math.max(shootStart, start), end] },
      colours: interleaveColours(update.lookups, update.aiQuestions),
    } satisfies Stretch;
    start = end;
    return stretch;
  });
}

function fillStretch({ key, perch, colours }: Stretch) {
  const room = measureRoom(perch, SCATTERED_BEETLE_ROOM);
  return {
    spots: placeOnPerch(
      { ...perch, colours: colours.slice(0, room) },
      `${key}-beetle`,
    ),
    overflow: colours.slice(room),
  };
}

export function placeEpisodeBeetles(
  series: TvSeries,
  shapes: GrownShape[],
): BeetleSpot[] {
  return getVineEpisodes(series).flatMap(({ season, episodes }) => {
    const branch = shapes.find(({ key }) => key === `${season.id}-branch`);
    return episodes.flatMap((episode) => {
      const shootKey = `${season.id}-${episode.id}-shoot`;
      const shoot = shapes.find(({ key }) => key === shootKey);
      if (!shoot) return [];
      const filled = createStretches(series, season, episode, shoot).map(
        fillStretch,
      );
      const overflow = filled.flatMap((stretch) => stretch.overflow);

      return [
        ...filled.flatMap(({ spots }) => spots),
        ...(branch && overflow.length
          ? placeOnPerch(
              createTrunkPerch(branch, shoot, overflow),
              `${shootKey}-branch-beetle`,
            )
          : []),
      ];
    });
  });
}
