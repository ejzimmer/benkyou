import { Video } from './types';

export function readVideoProgress({
  status,
  lengthInSeconds,
  upToInSeconds,
}: Video) {
  if (status === 'done') return 1;
  if (status === 'not-started') return 0;
  if (lengthInSeconds && upToInSeconds !== undefined) {
    return Math.min(1, upToInSeconds / lengthInSeconds);
  }
  return 1;
}
