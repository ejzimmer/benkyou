import { calculateUpdatePosition } from './calculateUpdatePosition';
import { getItemsByNumber } from './lists';
import { getProgressUpdates } from './getProgressUpdates';
import { PrintSeries, Volume } from './types';
import { readVolumeProgress } from './volumeProgress';

export type Bloom = {
  key: string;
  volume: Volume;
  limbKey: string;
  at: number;
  understood: number;
  date: string;
};

export function getBlooms(series: PrintSeries): Bloom[] {
  return getItemsByNumber(series.volumes).flatMap((volume) => {
    const progress = readVolumeProgress(series, volume);
    return getProgressUpdates(volume).flatMap((update) =>
      update.understood === undefined
        ? []
        : [
            {
              key: update.key,
              volume,
              limbKey: `${volume.id}-limb`,
              at: calculateUpdatePosition(volume, update, progress),
              understood: update.understood,
              date: update.at,
            },
          ],
    );
  });
}
