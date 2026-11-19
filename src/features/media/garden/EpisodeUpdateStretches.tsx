import { formatDayAndMonth, getLocalDate } from '../shared/dates';
import { drawEdgeBand } from './drawEdgeBand';
import { formatEpisodeName } from './format';
import { getEpisodeUpdateStretches } from './getEpisodeUpdateStretches';
import { GrownShape } from './treeGrowth';
import { Episode, Season, TvSeries } from './types';
import { UpdateStretchButton } from './UpdateStretchButton';

type EpisodeUpdateStretchesProps = {
  series: TvSeries;
  shapes: GrownShape[];
  onSelect: (season: Season, episode: Episode, updateKey: string) => void;
  onHighlight: (updateKey?: string) => void;
};

export function EpisodeUpdateStretches({
  series,
  shapes,
  onSelect,
  onHighlight,
}: EpisodeUpdateStretchesProps) {
  return (
    <g className="update-stretches">
      {getEpisodeUpdateStretches(series, shapes).map(
        ({ key, season, episode, date, edges }) => (
          <UpdateStretchButton
            key={key}
            label={`Edit update to ${formatEpisodeName(episode)}`}
            path={drawEdgeBand(edges)}
            hoverText={formatDayAndMonth(getLocalDate(date))}
            onClick={() => onSelect(season, episode, key)}
            onHighlight={(isHighlighted) =>
              onHighlight(isHighlighted ? key : undefined)
            }
          />
        ),
      )}
    </g>
  );
}
