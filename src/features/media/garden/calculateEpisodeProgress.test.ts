import { describe, it, expect } from 'vitest';
import { calculateEpisodeProgress } from './calculateEpisodeProgress';
import { Episode, Season, TvSeries } from './types';

const season: Season = { id: 's2', number: 2 };

const createEpisode = (overrides: Partial<Episode> = {}): Episode => ({
  id: 'e3',
  number: 3,
  lengthInSeconds: 2000,
  lookups: 0,
  aiQuestions: 0,
  ...overrides,
});

const createSeries = (upTo?: TvSeries['upTo']): TvSeries => ({
  id: 'lupin',
  type: 'tv',
  name: 'Lupin',
  language: 'french',
  upTo,
});

describe('calculateEpisodeProgress', () => {
  describe('when the episode is marked done', () => {
    it('is fully watched', () => {
      expect(
        calculateEpisodeProgress(
          createSeries(),
          season,
          createEpisode({ status: 'done' }),
        ),
      ).toBe(1);
    });
  });

  describe('when the series is up to a later season', () => {
    it('is fully watched', () => {
      expect(
        calculateEpisodeProgress(
          createSeries({ season: 3, episode: 1, timestampInSeconds: 0 }),
          season,
          createEpisode(),
        ),
      ).toBe(1);
    });
  });

  describe('when the series is up to a later episode in the same season', () => {
    it('is fully watched', () => {
      expect(
        calculateEpisodeProgress(
          createSeries({ season: 2, episode: 4, timestampInSeconds: 0 }),
          season,
          createEpisode(),
        ),
      ).toBe(1);
    });
  });

  describe('when the series is up to this episode', () => {
    it('is watched up to the timestamp', () => {
      expect(
        calculateEpisodeProgress(
          createSeries({ season: 2, episode: 3, timestampInSeconds: 500 }),
          season,
          createEpisode(),
        ),
      ).toBe(0.25);
    });
  });

  describe('when the series is up to an earlier episode', () => {
    it('is not watched', () => {
      expect(
        calculateEpisodeProgress(
          createSeries({ season: 2, episode: 1, timestampInSeconds: 900 }),
          season,
          createEpisode(),
        ),
      ).toBe(0);
    });
  });

  describe('when the episode is marked not started', () => {
    it('is not watched, even when the series is up to a later season', () => {
      expect(
        calculateEpisodeProgress(
          createSeries({ season: 3, episode: 1, timestampInSeconds: 0 }),
          season,
          createEpisode({ status: 'not-started' }),
        ),
      ).toBe(0);
    });
  });
});
