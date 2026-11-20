import { Episode, EpisodeUpdate } from './types';

const MIN_POSITION = 0.1;

export function calculateEpisodeUpdatePosition(
  { lengthInSeconds }: Episode,
  { timestampInSeconds }: EpisodeUpdate,
  progress: number,
) {
  const position =
    timestampInSeconds === undefined || !lengthInSeconds
      ? progress
      : Math.min(progress, timestampInSeconds / lengthInSeconds);
  return Math.max(MIN_POSITION, position);
}
