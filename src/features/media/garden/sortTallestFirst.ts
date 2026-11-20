import { createCactusLayout } from './cactusLayout';
import { createTreeLayout } from './treeLayout';
import { isPrintSeries, LanguageMedia } from './types';
import { createVineLayout } from './vineLayout';

function measurePlantHeight(item: LanguageMedia) {
  if (isPrintSeries(item)) return createTreeLayout(item).bounds.height;
  if (item.type === 'youtube') return createCactusLayout(item).bounds.height;
  return createVineLayout(item).bounds.height;
}

/** Places the tallest plants first, so the shorter ones can fill the gaps around them. */
export function sortTallestFirst(media: LanguageMedia[]) {
  return media
    .map((item) => ({ item, height: measurePlantHeight(item) }))
    .toSorted((a, b) => b.height - a.height)
    .map(({ item }) => item);
}
