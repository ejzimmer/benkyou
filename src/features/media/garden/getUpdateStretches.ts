import { calculateUpdatePosition } from './calculateUpdatePosition';
import { getProgressUpdates } from './getProgressUpdates';
import { getItemsByNumber } from './lists';
import { sliceIntoStretches } from './sliceIntoStretches';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { PrintSeries, Volume } from './types';
import { readVolumeProgress } from './volumeProgress';

type UpdateStretch = {
  key: string;
  volume: Volume;
  date: string;
  edges: EdgeSample[];
};

export function getUpdateStretches(
  series: PrintSeries,
  shapes: GrownShape[],
): UpdateStretch[] {
  return getItemsByNumber(series.volumes).flatMap((volume) => {
    const limb = shapes.find(({ key }) => key === `${volume.id}-limb`);
    if (!limb) return [];
    const progress = readVolumeProgress(series, volume);
    const updates = getProgressUpdates(volume);
    const ends = updates.map((update) => ({
      key: update.key,
      at: calculateUpdatePosition(volume, update, progress),
    }));
    return sliceIntoStretches(limb.edges, ends).map((stretch, index) => ({
      ...stretch,
      volume,
      date: updates[index].at,
    }));
  });
}
