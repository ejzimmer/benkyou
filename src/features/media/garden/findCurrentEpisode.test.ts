import { describe, it, expect } from 'vitest';
import { findCurrentEpisode } from './findCurrentEpisode';
import { Episode, TvSeries } from './types';

const createEpisode = (
  number: number,
  status?: Episode['status'],
): Episode => ({
  id: `e${number}`,
  number,
  status,
  lengthInSeconds: 1500,
  lookups: 0,
  aiQuestions: 0,
});

const createSeries = (
  episodes: Episode[],
  upTo?: TvSeries['upTo'],
): TvSeries => ({
  id: 'series',
  type: 'tv',
  name: 'Series',
  language: 'french',
  seasons: {
    s1: {
      id: 's1',
      number: 1,
      episodes: Object.fromEntries(
        episodes.map((episode) => [episode.id, episode]),
      ),
    },
  },
  upTo,
});

const findEpisodeId = (series: TvSeries) =>
  findCurrentEpisode(series)?.episode.id;

describe('findCurrentEpisode', () => {
  describe('when I am up to an episode', () => {
    describe('part way through', () => {
      it('finds that episode', () => {
        const series = createSeries(
          [createEpisode(1, 'done'), createEpisode(2), createEpisode(3)],
          { season: 1, episode: 2, timestampInSeconds: 600 },
        );

        expect(findEpisodeId(series)).toBe('e2');
      });
    });

    describe('at the end', () => {
      it('finds the next episode', () => {
        const series = createSeries(
          [createEpisode(1), createEpisode(2), createEpisode(3)],
          { season: 1, episode: 2, timestampInSeconds: 1500 },
        );

        expect(findEpisodeId(series)).toBe('e3');
      });

      describe('of the last episode', () => {
        it('stays on that episode', () => {
          const series = createSeries([createEpisode(1), createEpisode(2)], {
            season: 1,
            episode: 2,
            timestampInSeconds: 1500,
          });

          expect(findEpisodeId(series)).toBe('e2');
        });
      });
    });
  });

  describe('when I am not up to any episode', () => {
    it('finds the first one not done', () => {
      const series = createSeries([createEpisode(2), createEpisode(1, 'done')]);

      expect(findEpisodeId(series)).toBe('e2');
    });

    describe('and every episode is done', () => {
      it('finds the last one', () => {
        const series = createSeries([
          createEpisode(1, 'done'),
          createEpisode(2, 'done'),
        ]);

        expect(findEpisodeId(series)).toBe('e2');
      });
    });
  });
});
