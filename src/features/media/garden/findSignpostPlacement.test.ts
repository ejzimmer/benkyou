import { describe, it, expect } from 'vitest';
import { findSignpostPlacement } from './findSignpostPlacement';
import { TreeLayout, TreeShape } from './treeLayout';

const createShape = (
  key: string,
  points: [x: number, y: number][],
  width = 4,
): TreeShape => ({
  key,
  growth: { type: 'branch', level: 0, start: 0, end: 1 },
  edges: points.map(([x, y], index) => ({
    at: index / (points.length - 1),
    left: { x, y: y + width / 2 },
    right: { x, y: y - width / 2 },
  })),
});

const TRUNK = createShape(
  'trunk',
  [
    [-5, 0],
    [-5, -100],
    [5, -100],
    [5, 0],
  ],
  0,
);

const createLayout = (shapes: TreeShape[]): TreeLayout => ({
  shapes,
  bounds: { x: -100, y: -200, width: 200, height: 200 },
});

describe('findSignpostPlacement', () => {
  describe('when nothing hangs low beside the trunk', () => {
    it('puts the sign just right of the trunk', () => {
      expect(findSignpostPlacement(createLayout([TRUNK]))).toEqual({
        side: 'right',
        offset: 16,
      });
    });
  });

  describe('when a branch hangs low on the right', () => {
    const droopingRight = createShape('right-limb', [
      [5, -80],
      [40, -60],
      [70, -30],
    ]);

    describe('and the left is clear', () => {
      it('puts the sign on the left', () => {
        expect(
          findSignpostPlacement(createLayout([TRUNK, droopingRight])),
        ).toEqual({ side: 'left', offset: 16 });
      });
    });

    describe('and a branch hangs even lower on the left', () => {
      it('puts the sign right of the branch that reaches less far', () => {
        const droopingLeft = createShape('left-limb', [
          [-5, -80],
          [-60, -40],
          [-90, -10],
        ]);

        expect(
          findSignpostPlacement(
            createLayout([TRUNK, droopingRight, droopingLeft]),
          ),
        ).toEqual({ side: 'right', offset: 79 });
      });
    });
  });

  describe('when the trunk leans right near the ground', () => {
    it('keeps the sign clear of the trunk', () => {
      const leaningTrunk = createShape(
        'trunk',
        [
          [0, 0],
          [14, -45],
        ],
        20,
      );

      expect(findSignpostPlacement(createLayout([leaningTrunk]))).toEqual({
        side: 'left',
        offset: 16,
      });
    });
  });
});
