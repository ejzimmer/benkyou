import { getProgressUpdates } from './getProgressUpdates';
import { PrintSeries } from './types';

export const getPagedUpdates = (series: PrintSeries) =>
  Object.values(series.volumes ?? {})
    .flatMap((volume) =>
      getProgressUpdates(volume).flatMap(({ key, at, page }) =>
        page === undefined ? [] : [{ key, at, page, volume }],
      ),
    )
    .toSorted((a, b) => Temporal.Instant.compare(a.at, b.at));
