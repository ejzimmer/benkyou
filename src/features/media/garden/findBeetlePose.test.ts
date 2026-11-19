import { describe, it, expect } from 'vitest';
import { findBeetlePose } from './findBeetlePose';
import { EdgeSample } from './treeGeometry';

const createBranch = (direction: 1 | -1): EdgeSample[] =>
  Array.from({ length: 11 }, (_, index) => ({
    at: index / 10,
    left: { x: index * 10 * direction, y: 2 },
    right: { x: index * 10 * direction, y: -2 },
  }));

describe('findBeetlePose', () => {
  describe('on a branch growing to the right', () => {
    const branch = createBranch(1);

    describe('when the beetle walks out along the branch', () => {
      const pose = findBeetlePose(branch, 0.5, true);

      it('stands it on top of the branch', () => {
        expect(pose.x).toBeCloseTo(50);
        expect(pose.y).toBeCloseTo(-1.6);
      });

      it('faces it along the branch the right way up', () => {
        expect(pose.heading).toBe(0);
        expect(pose.isUpsideDown).toBe(false);
      });
    });

    describe('when the beetle walks back towards the trunk', () => {
      const pose = findBeetlePose(branch, 0.5, false);

      it('turns it around and flips it so it stays the right way up', () => {
        expect(pose.heading).toBe(180);
        expect(pose.isUpsideDown).toBe(true);
      });
    });
  });

  describe('on a branch growing to the left', () => {
    it('still stands the beetle on top of the branch', () => {
      expect(findBeetlePose(createBranch(-1), 0.5, true).y).toBeCloseTo(-1.6);
    });
  });

  describe('on a branch that bends from growing left to growing up', () => {
    const branch: EdgeSample[] = [
      ...Array.from({ length: 6 }, (_, index) => ({
        at: index / 10,
        left: { x: -index * 10, y: 2 },
        right: { x: -index * 10, y: -2 },
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        at: (index + 6) / 10,
        left: { x: -48, y: -(index + 1) * 10 },
        right: { x: -52, y: -(index + 1) * 10 },
      })),
    ];

    describe('when the beetle walks out along the top', () => {
      const along = findBeetlePose(branch, 0.3, true);
      const up = findBeetlePose(branch, 0.8, true);

      it('keeps it on the side that was on top, facing the trunk', () => {
        expect(along.y).toBeCloseTo(-1.6);
        expect(up.x).toBeCloseTo(-48.4);
      });

      it('keeps its feet against the branch', () => {
        expect(along.isUpsideDown).toBe(true);
        expect(up.isUpsideDown).toBe(true);
      });
    });

    describe('when the beetle walks out along the underside', () => {
      const along = findBeetlePose(branch, 0.3, true, true);
      const up = findBeetlePose(branch, 0.8, true, true);

      it('keeps it on the side that was underneath, facing away from the trunk', () => {
        expect(along.y).toBeCloseTo(1.6);
        expect(up.x).toBeCloseTo(-51.6);
      });

      it('keeps its feet against the branch', () => {
        expect(along.isUpsideDown).toBe(false);
        expect(up.isUpsideDown).toBe(false);
      });
    });
  });
});
