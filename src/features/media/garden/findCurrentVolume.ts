import { getItemsByNumber } from './lists';
import { PrintSeries } from './types';

export function findCurrentVolume({ volumes, upTo }: PrintSeries) {
  const ordered = getItemsByNumber(volumes);
  return (
    ordered.find(({ number }) => number === upTo?.volume) ??
    ordered.find(({ status }) => status !== 'done') ??
    ordered.at(-1)
  );
}
