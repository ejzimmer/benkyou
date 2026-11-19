import { describe, it, expect } from 'vitest';
import { measureShapeGrowth } from './treeGrowth';
import { ShapeGrowth } from './treeLayout';

describe('measureShapeGrowth', () => {
  describe('for the trunk', () => {
    const trunk: ShapeGrowth = { type: 'trunk', levelEnds: [0.3, 0.6, 1] };

    describe('when a volume has started', () => {
      it('grows up to the level of the last started volume', () => {
        expect(measureShapeGrowth(trunk, [1, 0.4, 0])).toBe(0.6);
      });
    });

    describe('when the last volume has started', () => {
      it('grows all the way to the crown', () => {
        expect(measureShapeGrowth(trunk, [1, 1, 0.1])).toBe(1);
      });
    });

    describe('when no volume has started', () => {
      it('has not grown', () => {
        expect(measureShapeGrowth(trunk, [0, 0, 0])).toBe(0);
      });
    });
  });

  describe('for a branch', () => {
    const branch: ShapeGrowth = {
      type: 'branch',
      level: 0,
      start: 0.4,
      end: 0.6,
    };

    describe('when the volume is read past its end', () => {
      it('is fully grown', () => {
        expect(measureShapeGrowth(branch, [0.8])).toBe(1);
      });
    });

    describe('when the volume is read partway through it', () => {
      it('grows that far along it', () => {
        expect(measureShapeGrowth(branch, [0.45])).toBeCloseTo(0.25);
      });
    });

    describe('when the volume is not read up to its start', () => {
      it('has not grown', () => {
        expect(measureShapeGrowth(branch, [0.3])).toBe(0);
      });
    });
  });

  describe('for a stem', () => {
    const stem: ShapeGrowth = {
      type: 'stem',
      firstLevel: 2,
      levelEnds: [0.2, 0.5, 0.8],
    };

    describe('when one of its episodes has started', () => {
      it('grows up to the last started episode', () => {
        expect(measureShapeGrowth(stem, [1, 1, 1, 0.3, 0])).toBe(0.5);
      });
    });

    describe('when only episodes on other stems have started', () => {
      it('has not grown', () => {
        expect(measureShapeGrowth(stem, [1, 1, 0, 0, 0, 1])).toBe(0);
      });
    });
  });
});
