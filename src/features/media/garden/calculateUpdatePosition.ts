import { ProgressUpdate, Volume } from './types';

const MIN_POSITION = 0.1;

export function calculateUpdatePosition(
  { pages }: Volume,
  { page }: ProgressUpdate,
  progress: number,
) {
  const position =
    page === undefined || !pages ? progress : Math.min(progress, page / pages);
  return Math.max(MIN_POSITION, position);
}
