import { PrintSeries, Volume } from './types';

export function readVolumeProgress(
  { upTo }: PrintSeries,
  { number, pages, status }: Volume,
) {
  if (status === 'done' || (upTo && upTo.volume > number)) return 1;
  if (!upTo || upTo.volume < number || !pages) return 0;
  return Math.min(1, upTo.page / pages);
}
