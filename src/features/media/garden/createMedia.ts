import { NewMedia } from './types';

const createNumbers = (count = 0) =>
  Array.from({ length: count }, (_, index) => index + 1);

export const createMediaDetails = ({ type, name, language }: NewMedia) => ({
  type,
  name,
  language,
});

export function createInitialChildren(newMedia: NewMedia) {
  switch (newMedia.type) {
    case 'tv':
      return {
        collection: 'seasons',
        children: createNumbers(newMedia.seasonCount).map((number) => ({
          number,
        })),
      };
    case 'manga':
      return {
        collection: 'volumes',
        children: createNumbers(newMedia.volumeCount).map((number) => ({
          number,
        })),
      };
    case 'book':
      return {
        collection: 'volumes',
        children: (newMedia.volumeNames ?? []).map((name, index) => ({
          number: index + 1,
          name,
        })),
      };
    case 'youtube':
      return { collection: 'videos', children: [] };
  }
}
