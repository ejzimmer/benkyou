import { createCactusLayout } from './cactusLayout';
import { createTreeLayout } from './treeLayout';
import { isPrintSeries, LanguageMedia } from './types';
import { createVineLayout } from './vineLayout';

function measurePlantHeight(item: LanguageMedia) {
  if (isPrintSeries(item)) return createTreeLayout(item).bounds.height;
  if (item.type === 'youtube') return createCactusLayout(item).bounds.height;
  return createVineLayout(item).bounds.height;
}

/** Puts plants of a similar height in the same row, so a tall plant doesn't leave empty space above its short neighbours. */
export function sortTallestFirst(media: LanguageMedia[]) {
  return media
    .map((item) => ({ item, height: measurePlantHeight(item) }))
    .toSorted((a, b) => b.height - a.height)
    .map(({ item }) => item);
}
