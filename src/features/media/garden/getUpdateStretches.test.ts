import { describe, it, expect } from 'vitest';
import { getUpdateStretches } from './getUpdateStretches';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { PrintSeries, ProgressUpdate } from './types';

const createLimb = (): GrownShape => ({
  key: 'vol1-limb',
  amount: 1,
  growth: { type: 'branch', level: 0, start: 0, end: 1 },
  edges: Array.from({ length: 11 }, (_, index): EdgeSample => ({
    at: index / 10,
    left: { x: index * 10, y: -98 },
    right: { x: index * 10, y: -102 },
  })),
});

const createUpdate = (day: number, page?: number): ProgressUpdate => ({
  at: `2026-10-0${day}T09:00:00Z`,
  page,
  lookups: 0,
  aiQuestions: 0,
});

const createSeries = (
  updates: Record<string, ProgressUpdate>,
): PrintSeries => ({
  id: 'series',
  type: 'book',
  name: 'Series',
  language: 'french',
  volumes: { vol1: { id: 'vol1', number: 1, pages: 100, updates } },
  upTo: { volume: 1, page: 80 },
});

const findStretchEnds = (series: PrintSeries) =>
  getUpdateStretches(series, [createLimb()]).map(({ key, edges }) => ({
    key,
    from: edges[0].at,
    to: edges[edges.length - 1].at,
  }));

describe('getUpdateStretches', () => {
  describe('for a volume with several updates', () => {
    it('gives each update the stretch of branch since the update before it', () => {
      const series = createSeries({
        later: createUpdate(2, 80),
        earlier: createUpdate(1, 30),
      });

      expect(findStretchEnds(series)).toEqual([
        { key: 'earlier', from: 0, to: expect.closeTo(0.3) },
        { key: 'later', from: expect.closeTo(0.3), to: expect.closeTo(0.8) },
      ]);
    });

    describe('when an update did not move the page on', () => {
      it('still gives it a short stretch to tap', () => {
        const series = createSeries({
          first: createUpdate(1, 30),
          second: createUpdate(2, 30),
        });

        expect(findStretchEnds(series)[1]).toEqual({
          key: 'second',
          from: expect.closeTo(0.3),
          to: expect.closeTo(0.32),
        });
      });
    });
  });

  describe('for a volume whose branch has not grown', () => {
    it('gives its updates no stretch', () => {
      const series = createSeries({ first: createUpdate(1, 30) });

      expect(getUpdateStretches(series, [])).toEqual([]);
    });
  });
});
