import { formatDayAndMonth, getLocalDate } from '../shared/dates';
import { drawEdgeBand } from './drawEdgeBand';
import { formatVolumeName } from './format';
import { getUpdateStretches } from './getUpdateStretches';
import { GrownShape } from './treeGrowth';
import { PrintSeries, Volume } from './types';
import { UpdateStretchButton } from './UpdateStretchButton';

type UpdateStretchesProps = {
  series: PrintSeries;
  shapes: GrownShape[];
  onSelect: (volume: Volume, updateKey: string) => void;
};

export function UpdateStretches({
  series,
  shapes,
  onSelect,
}: UpdateStretchesProps) {
  return (
    <g className="update-stretches">
      {getUpdateStretches(series, shapes).map(
        ({ key, volume, date, edges }) => (
          <UpdateStretchButton
            key={key}
            label={`Edit update to ${formatVolumeName(volume)}`}
            path={drawEdgeBand(edges)}
            hoverText={formatDayAndMonth(getLocalDate(date))}
            onClick={() => onSelect(volume, key)}
          />
        ),
      )}
    </g>
  );
}
