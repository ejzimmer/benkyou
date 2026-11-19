import { drawEdgeBand } from './drawEdgeBand';
import { TreeLayout } from './treeLayout';
import { Season, TvSeries } from './types';
import { UpdateStretchButton } from './UpdateStretchButton';
import { getVineEpisodes } from './vineLayout';

type SeasonBranchesProps = {
  series: TvSeries;
  layout: TreeLayout;
  onSelect: (season: Season) => void;
};

export function SeasonBranches({
  series,
  layout,
  onSelect,
}: SeasonBranchesProps) {
  return (
    <g className="season-branches">
      {getVineEpisodes(series).map(({ season }) => {
        const branch = layout.shapes.find(
          ({ key }) => key === `${season.id}-branch`,
        );
        return (
          branch && (
            <UpdateStretchButton
              key={season.id}
              label={`Add an episode to season ${season.number}`}
              path={drawEdgeBand(branch.edges)}
              onClick={() => onSelect(season)}
            />
          )
        );
      })}
    </g>
  );
}
