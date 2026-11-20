import { describe, it, expect } from 'vitest';
import { findArcPosition } from './findArcPosition';

const trip = { rise: 1000, set: 2000 };

describe('findArcPosition', () => {
  describe('while the body is up', () => {
    it('starts on the horizon at the left when it rises', () => {
      expect(findArcPosition(1000, trip)).toEqual({ across: 0, height: 0 });
    });

    it('is at the top of the sky halfway between rising and setting', () => {
      expect(findArcPosition(1500, trip)).toEqual({ across: 0.5, height: 1 });
    });

    it('is back on the horizon at the right when it sets', () => {
      const position = findArcPosition(2000, trip);
      expect(position?.across).toBe(1);
      expect(position?.height).toBeCloseTo(0);
    });
  });

  describe('while the body is down', () => {
    it('is nowhere before it rises', () => {
      expect(findArcPosition(999, trip)).toBeUndefined();
    });

    it('is nowhere after it sets', () => {
      expect(findArcPosition(2001, trip)).toBeUndefined();
    });
  });
});
