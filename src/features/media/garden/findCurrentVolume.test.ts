import { describe, it, expect } from 'vitest';
import { findCurrentVolume } from './findCurrentVolume';
import { PrintSeries, Volume } from './types';

const createVolume = (number: number, status?: Volume['status']): Volume => ({
  id: `vol${number}`,
  number,
  status,
});

const createSeries = (
  volumes: Volume[],
  upTo?: PrintSeries['upTo'],
): PrintSeries => ({
  id: 'series',
  type: 'book',
  name: 'Series',
  language: 'french',
  volumes: Object.fromEntries(volumes.map((volume) => [volume.id, volume])),
  upTo,
});

describe('findCurrentVolume', () => {
  describe('when I am up to a volume', () => {
    it('finds that volume', () => {
      const series = createSeries(
        [createVolume(1, 'done'), createVolume(2), createVolume(3)],
        { volume: 3, page: 10 },
      );

      expect(findCurrentVolume(series)?.id).toBe('vol3');
    });
  });

  describe('when I am not up to any volume', () => {
    it('finds the first one not done', () => {
      const series = createSeries([createVolume(2), createVolume(1, 'done')]);

      expect(findCurrentVolume(series)?.id).toBe('vol2');
    });

    describe('and every volume is done', () => {
      it('finds the last one', () => {
        const series = createSeries([
          createVolume(1, 'done'),
          createVolume(2, 'done'),
        ]);

        expect(findCurrentVolume(series)?.id).toBe('vol2');
      });
    });
  });

  describe('when there are no volumes', () => {
    it('finds nothing', () => {
      expect(findCurrentVolume(createSeries([]))).toBeUndefined();
    });
  });
});
