import { describe, it, expect } from 'vitest';
import { placeVineLeaves } from './placeVineLeaves';
import { getGrownShapes } from './treeGrowth';
import { Episode, TvSeries } from './types';
import { BAY_WIDTH, createVineLayout } from './vineLayout';

const createEpisode = (number: number): Episode => ({
  id: `e${number}`,
  number,
  lengthInSeconds: 2400,
  lookups: 0,
  aiQuestions: 0,
});

const series: TvSeries = {
  id: 'lupin',
  type: 'tv',
  name: 'Lupin',
  language: 'french',
  seasons: {
    s1: {
      id: 's1',
      number: 1,
      episodes: Object.fromEntries(
        [1, 2, 3, 4].map((number) => [`e${number}`, createEpisode(number)]),
      ),
    },
    s2: {
      id: 's2',
      number: 2,
      episodes: { e1: { ...createEpisode(1), id: 's2e1' } },
    },
  },
};

const layout = createVineLayout(series);
const placeLeaves = (progress: number[]) =>
  placeVineLeaves(getGrownShapes(layout, progress), layout.pergola.beamBottom);

describe('placeVineLeaves', () => {
  describe('when nothing has been watched', () => {
    it('grows no leaves', () => {
      expect(placeLeaves([0, 0, 0, 0, 0])).toEqual([]);
    });
  });

  describe('when the first episodes of the first season are watched', () => {
    const leaves = placeLeaves([1, 1, 0, 0, 0]);

    it('grows leaves on the watched shoots', () => {
      expect(leaves.some(({ key }) => key.startsWith('s1-e1-shoot'))).toBe(
        true,
      );
      expect(leaves.some(({ key }) => key.startsWith('s1-e2-shoot'))).toBe(
        true,
      );
    });

    it('grows leaves along the first season’s branch', () => {
      expect(leaves.some(({ key }) => key.startsWith('s1-branch'))).toBe(true);
    });

    it('keeps the leaves on the beam within the first bay', () => {
      const beamLeaves = leaves.filter(({ key }) => key.startsWith('trunk'));

      expect(beamLeaves.length).toBeGreaterThan(0);
      beamLeaves.forEach(({ x, y }) => {
        expect(x).toBeLessThan(BAY_WIDTH);
        expect(y).toBeLessThan(layout.pergola.beamBottom);
      });
    });
  });

  it('places the same leaves every time', () => {
    expect(placeLeaves([1, 0.5, 0, 0, 1])).toEqual(
      placeLeaves([1, 0.5, 0, 0, 1]),
    );
  });
});
