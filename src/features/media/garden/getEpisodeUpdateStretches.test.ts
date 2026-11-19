import { describe, it, expect } from 'vitest';
import { getEpisodeUpdateStretches } from './getEpisodeUpdateStretches';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { EpisodeUpdate, TvSeries } from './types';

const createShoot = (): GrownShape => ({
  key: 's1-e1-shoot',
  amount: 1,
  growth: { type: 'branch', level: 0, start: 0, end: 1 },
  edges: Array.from({ length: 11 }, (_, index): EdgeSample => ({
    at: index / 10,
    left: { x: -1, y: index * 2 },
    right: { x: 1, y: index * 2 },
  })),
});

const createUpdate = (
  day: number,
  timestampInSeconds: number,
): EpisodeUpdate => ({
  at: `2026-10-0${day}T09:00:00Z`,
  timestampInSeconds,
  lookups: 0,
  aiQuestions: 0,
});

const createSeries = (updates: Record<string, EpisodeUpdate>): TvSeries => ({
  id: 'lupin',
  type: 'tv',
  name: 'Lupin',
  language: 'french',
  seasons: {
    s1: {
      id: 's1',
      number: 1,
      episodes: {
        e1: {
          id: 'e1',
          number: 1,
          lengthInSeconds: 1000,
          lookups: 0,
          aiQuestions: 0,
          updates,
        },
      },
    },
  },
  upTo: { season: 1, episode: 1, timestampInSeconds: 800 },
});

const findStretchEnds = (series: TvSeries) =>
  getEpisodeUpdateStretches(series, [createShoot()]).map(({ key, edges }) => ({
    key,
    from: edges[0].at,
    to: edges[edges.length - 1].at,
  }));

describe('getEpisodeUpdateStretches', () => {
  describe('for an episode with several updates', () => {
    it('gives each update the stretch of shoot since the update before it', () => {
      const series = createSeries({
        later: createUpdate(2, 800),
        earlier: createUpdate(1, 300),
      });

      expect(findStretchEnds(series)).toEqual([
        { key: 'earlier', from: 0, to: expect.closeTo(0.3) },
        { key: 'later', from: expect.closeTo(0.3), to: expect.closeTo(0.8) },
      ]);
    });
  });

  describe('for an episode whose shoot has not grown', () => {
    it('gives its updates no stretch', () => {
      const series = createSeries({ first: createUpdate(1, 300) });

      expect(getEpisodeUpdateStretches(series, [])).toEqual([]);
    });
  });
});
