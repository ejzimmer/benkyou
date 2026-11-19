import { describe, it, expect } from 'vitest';
import { getRacemes } from './getRacemes';
import { Episode, TvSeries } from './types';

const createEpisode = (overrides: Partial<Episode> = {}): Episode => ({
  id: 'e1',
  number: 1,
  lengthInSeconds: 2000,
  lookups: 0,
  aiQuestions: 0,
  ...overrides,
});

const createSeries = (
  episode: Episode,
  upTo: TvSeries['upTo'] = { season: 2, episode: 1, timestampInSeconds: 0 },
): TvSeries => ({
  id: 'lupin',
  type: 'tv',
  name: 'Lupin',
  language: 'french',
  seasons: { s1: { id: 's1', number: 1, episodes: { e1: episode } } },
  upTo,
});

describe('getRacemes', () => {
  describe('for a watched episode with several updates', () => {
    const episode = createEpisode({
      updates: {
        later: {
          at: '2026-09-02T20:00:00Z',
          timestampInSeconds: 1500,
          lookups: 0,
          aiQuestions: 0,
          understood: 80,
        },
        earlier: {
          at: '2026-09-01T20:00:00Z',
          timestampInSeconds: 500,
          lookups: 0,
          aiQuestions: 0,
          understood: 60,
        },
      },
    });

    it('hangs a raceme on the episode’s shoot for each update, in the order they were made', () => {
      const series = createSeries(episode);
      expect(getRacemes(series)).toEqual([
        {
          key: 'earlier',
          season: series.seasons!.s1,
          episode,
          shootKey: 's1-e1-shoot',
          at: 0.25,
          understood: 60,
          date: '2026-09-01T20:00:00Z',
        },
        {
          key: 'later',
          season: series.seasons!.s1,
          episode,
          shootKey: 's1-e1-shoot',
          at: 0.75,
          understood: 80,
          date: '2026-09-02T20:00:00Z',
        },
      ]);
    });
  });

  describe('for an update without an understood amount', () => {
    const episode = createEpisode({
      updates: {
        quiet: {
          at: '2026-09-01T20:00:00Z',
          timestampInSeconds: 500,
          lookups: 2,
          aiQuestions: 0,
        },
        counted: {
          at: '2026-09-02T20:00:00Z',
          timestampInSeconds: 1000,
          lookups: 0,
          aiQuestions: 0,
          understood: 70,
        },
      },
    });

    it('leaves the understood amount off that update’s raceme', () => {
      const series = createSeries(episode);
      expect(getRacemes(series)).toEqual([
        {
          key: 'quiet',
          season: series.seasons!.s1,
          episode,
          shootKey: 's1-e1-shoot',
          at: 0.25,
          date: '2026-09-01T20:00:00Z',
        },
        {
          key: 'counted',
          season: series.seasons!.s1,
          episode,
          shootKey: 's1-e1-shoot',
          at: 0.5,
          understood: 70,
          date: '2026-09-02T20:00:00Z',
        },
      ]);
    });
  });

  describe('for an update beyond where the series is up to', () => {
    const episode = createEpisode({
      updates: {
        ahead: {
          at: '2026-09-01T20:00:00Z',
          timestampInSeconds: 1800,
          lookups: 0,
          aiQuestions: 0,
          understood: 50,
        },
      },
    });

    it('hangs the raceme at the tip of the grown shoot', () => {
      const [raceme] = getRacemes(
        createSeries(episode, {
          season: 1,
          episode: 1,
          timestampInSeconds: 1000,
        }),
      );

      expect(raceme.at).toBe(0.5);
    });
  });
});
