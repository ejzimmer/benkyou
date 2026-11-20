import { describe, it, expect } from 'vitest';
import { placeAreoles, placeEdgeSpines, traceRibs } from './cactusRibs';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';

const createColumn = (
  growth: GrownShape['growth'],
  amount: number,
): GrownShape => ({
  key: 'column',
  amount,
  growth,
  edges: Array.from({ length: 11 }, (_, index): EdgeSample => ({
    at: index / 10,
    left: { x: -10, y: -index * 10 },
    right: { x: 10, y: -index * 10 },
  })),
});

const trunk = (amount: number) =>
  createColumn({ type: 'trunk', levelEnds: [1] }, amount);
const arm = (amount: number) =>
  createColumn({ type: 'branch', level: 0, start: 0, end: 1 }, amount);

describe('traceRibs', () => {
  describe('on the trunk', () => {
    it('runs three ribs up the middle and either side', () => {
      expect(
        traceRibs(trunk(0.5)).map((rib) => [rib[0].x, rib.at(-1)!.y]),
      ).toEqual([
        [5.4, -50],
        [0, -50],
        [-5.4, -50],
      ]);
    });
  });

  describe('on an arm', () => {
    describe('that is still growing', () => {
      const ribs = traceRibs(arm(0.5));

      it('runs two ribs, one either side of the middle', () => {
        expect(ribs.map((rib) => rib[0].x)).toEqual([4.4, -4.4]);
      });

      it('starts them clear of where the arm joins the trunk', () => {
        expect(ribs[0][0].y).toBe(-10);
      });

      it('runs them up to how far the arm has grown', () => {
        expect(ribs[0].at(-1)!.y).toBe(-50);
      });
    });

    describe('that has finished growing', () => {
      it('stops the ribs short of the rounded tip', () => {
        expect(traceRibs(arm(1))[0].at(-1)!.y).toBe(-90);
      });
    });
  });
});

describe('placeAreoles', () => {
  it('spaces them evenly along the rib', () => {
    expect(
      placeAreoles([
        { x: 0, y: 0 },
        { x: 0, y: -20 },
      ]),
    ).toEqual([
      { x: 0, y: -4 },
      { x: 0, y: -12 },
      { x: 0, y: -20 },
    ]);
  });
});

describe('placeEdgeSpines', () => {
  const spines = placeEdgeSpines(trunk(0.3), 3);

  it('puts spines in pairs up both edges of the grown part', () => {
    expect(spines.map(({ base }) => base)).toEqual([
      { x: -13, y: -4 },
      { x: 13, y: -4 },
      { x: -13, y: -11 },
      { x: 13, y: -11 },
      { x: -13, y: -18 },
      { x: 13, y: -18 },
      { x: -13, y: -25 },
      { x: 13, y: -25 },
    ]);
  });

  it('points each spine away from the middle', () => {
    expect(spines.slice(0, 2).map(({ direction }) => direction)).toEqual([
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]);
  });
});
