import { describe, it, expect } from 'vitest';
import { measureShapeGrowth } from './treeGrowth';
import { Episode, Season, TvSeries } from './types';
import { BAY_WIDTH, createVineLayout } from './vineLayout';

const createEpisode = (number: number, lengthInSeconds = 2400): Episode => ({
  id: `e${number}`,
  number,
  lengthInSeconds,
  lookups: 0,
  aiQuestions: 0,
});

const createSeason = (number: number, episodes: Episode[]): Season => ({
  id: `s${number}`,
  number,
  episodes: Object.fromEntries(
    episodes.map((episode) => [`${episode.id}`, episode]),
  ),
});

const createEpisodes = (count: number) =>
  Array.from({ length: count }, (_, index) => createEpisode(index + 1));

const createSeries = (seasons: Season[]): TvSeries => ({
  id: 'lupin',
  type: 'tv',
  name: 'Lupin',
  language: 'french',
  seasons: Object.fromEntries(seasons.map((season) => [season.id, season])),
});

const findShape = (series: TvSeries, key: string) =>
  createVineLayout(series).shapes.find((shape) => shape.key === key)!;

const findCentres = (series: TvSeries, key: string) =>
  findShape(series, key).edges.map(({ left, right }) => ({
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  }));

const measureSpan = (series: TvSeries, key: string) => {
  const points = findShape(series, key).edges.flatMap(({ left, right }) => [
    left,
    right,
  ]);
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

describe('createVineLayout', () => {
  describe('with several seasons', () => {
    const series = createSeries([
      createSeason(2, createEpisodes(3)),
      createSeason(1, createEpisodes(5)),
    ]);

    it('grows the same vine every time', () => {
      expect(createVineLayout(series)).toEqual(createVineLayout(series));
    });

    it('puts up a bay of the pergola for each season', () => {
      expect(createVineLayout(series).pergola.posts).toEqual([
        0,
        BAY_WIDTH,
        BAY_WIDTH * 2,
      ]);
    });

    it('grows each season’s branch in its own bay, in season order', () => {
      const first = measureSpan(series, 's1-branch');
      const second = measureSpan(series, 's2-branch');

      expect(first.left).toBeGreaterThan(0);
      expect(first.right).toBeLessThan(BAY_WIDTH);
      expect(second.left).toBeGreaterThan(BAY_WIDTH);
      expect(second.right).toBeLessThan(BAY_WIDTH * 2);
    });

    it('grows a shoot for each episode, numbered through the seasons in order', () => {
      expect(
        createVineLayout(series).shapes.flatMap(({ key, growth }) =>
          growth.type === 'branch' ? [[key, growth.level]] : [],
        ),
      ).toEqual([
        ['s1-e1-shoot', 0],
        ['s1-e2-shoot', 1],
        ['s1-e3-shoot', 2],
        ['s1-e4-shoot', 3],
        ['s1-e5-shoot', 4],
        ['s2-e1-shoot', 5],
        ['s2-e2-shoot', 6],
        ['s2-e3-shoot', 7],
      ]);
    });
  });

  describe('a season branch', () => {
    const series = createSeries([createSeason(1, createEpisodes(5))]);
    const { growth } = findShape(series, 's1-branch');

    describe('when an episode partway along it has started', () => {
      it('grows as far as that episode’s shoot', () => {
        const toSecond = measureShapeGrowth(growth, [1, 0.2, 0, 0, 0]);
        const toFourth = measureShapeGrowth(growth, [1, 1, 1, 0.5, 0]);

        expect(toSecond).toBeGreaterThan(0);
        expect(toFourth).toBeGreaterThan(toSecond);
        expect(toFourth).toBeLessThan(1);
      });
    });

    it('starts on the trunk', () => {
      const [base] = findCentres(series, 's1-branch');
      const distances = findCentres(series, 'trunk').map(({ x, y }) =>
        Math.hypot(x - base.x, y - base.y),
      );

      expect(Math.min(...distances)).toBeLessThan(0.5);
    });

    describe('when none of its episodes has started', () => {
      it('has not grown', () => {
        expect(measureShapeGrowth(growth, [0, 0, 0, 0, 0])).toBe(0);
      });
    });
  });

  describe('a season with no episodes yet', () => {
    const series = createSeries([
      createSeason(1, createEpisodes(2)),
      createSeason(2, []),
    ]);
    const { growth } = findShape(series, 's2-branch');

    it('has a short branch in its bay', () => {
      const { left, right } = measureSpan(series, 's2-branch');

      expect(left).toBeGreaterThan(BAY_WIDTH);
      expect(right).toBeLessThan(BAY_WIDTH * 2);
    });

    it('has not grown, even once every episode before it is watched', () => {
      expect(measureShapeGrowth(growth, [1, 1])).toBe(0);
    });
  });

  describe('with a long season', () => {
    const short = createSeries([createSeason(1, createEpisodes(5))]);
    const long = createSeries([createSeason(1, createEpisodes(20))]);

    it('zigzags the branch down the bay instead of widening it', () => {
      expect(createVineLayout(long).pergola.posts).toEqual(
        createVineLayout(short).pergola.posts,
      );
      expect(measureSpan(long, 's1-branch').height).toBeGreaterThan(
        measureSpan(short, 's1-branch').height + 40,
      );
    });

    it('builds a taller pergola to hold it', () => {
      expect(createVineLayout(long).pergola.beamTop).toBeLessThan(
        createVineLayout(short).pergola.beamTop,
      );
    });
  });

  describe('an episode shoot', () => {
    const series = createSeries([
      createSeason(1, [createEpisode(1, 1200), createEpisode(2, 3600)]),
    ]);

    it('is longer for a longer episode', () => {
      expect(measureSpan(series, 's1-e2-shoot').height).toBeGreaterThan(
        measureSpan(series, 's1-e1-shoot').height,
      );
    });
  });
});
