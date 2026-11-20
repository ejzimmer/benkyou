import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MediaGarden } from './MediaGarden';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { hugo, lupin, yotsuba } from './testMedia';
import { PrintSeries } from './types';

const lesMiserables: PrintSeries = {
  id: 'lesmis',
  type: 'book',
  name: 'Les Misérables',
  language: 'french',
};

describe('MediaGarden', () => {
  it('grows a tree for each book and manga series, a cactus for each YouTube channel and a vine for each TV series', () => {
    renderWithLanguageMediaStorage(<MediaGarden />, {
      media: [lupin, yotsuba, hugo, lesMiserables],
    });

    expect(
      screen
        .getAllByRole('img')
        .map((plant) => plant.getAttribute('aria-label'))
        .toSorted(),
    ).toEqual(
      ['Lupin', 'よつばと！', 'HugoDécrypte', 'Les Misérables'].toSorted(),
    );
  });
});
