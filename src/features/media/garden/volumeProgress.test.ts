import { describe, it, expect } from 'vitest';
import { readVolumeProgress } from './volumeProgress';
import { PrintSeries, Volume } from './types';

const volume: Volume = {
  id: 'vol2',
  number: 2,
  pages: 200,
};

const createSeries = (upTo?: PrintSeries['upTo']): PrintSeries => ({
  id: 'yotsuba',
  type: 'manga',
  name: 'よつばと！',
  language: 'japanese',
  upTo,
});

describe('readVolumeProgress', () => {
  describe('when I am up to an earlier volume', () => {
    it('has not started it', () => {
      expect(
        readVolumeProgress(createSeries({ volume: 1, page: 150 }), volume),
      ).toBe(0);
    });

    describe('but it is marked done', () => {
      it('has finished it', () => {
        expect(
          readVolumeProgress(createSeries({ volume: 1, page: 150 }), {
            ...volume,
            status: 'done',
          }),
        ).toBe(1);
      });
    });
  });

  describe('when I am up to that volume', () => {
    it('is as far through as the page I am on', () => {
      expect(
        readVolumeProgress(createSeries({ volume: 2, page: 50 }), volume),
      ).toBe(0.25);
    });

    describe('and it has no page count', () => {
      it('has not started it', () => {
        expect(
          readVolumeProgress(createSeries({ volume: 2, page: 50 }), {
            ...volume,
            pages: undefined,
          }),
        ).toBe(0);
      });
    });
  });

  describe('when I am up to a later volume', () => {
    it('has finished it', () => {
      expect(
        readVolumeProgress(createSeries({ volume: 3, page: 10 }), volume),
      ).toBe(1);
    });
  });

  describe('when I have not started the series', () => {
    it('has not started it', () => {
      expect(readVolumeProgress(createSeries(), volume)).toBe(0);
    });
  });
});
