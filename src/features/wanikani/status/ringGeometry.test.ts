import { describe, it, expect } from 'vitest'
import { calculateRingDash, findPointOnRing } from './ringGeometry';

describe('calculateRingDash', () => {
  it('draws the given fraction of the ring and leaves a gap for the rest', () => {
    const circumference = 2 * Math.PI * 10;

    expect(calculateRingDash(10, 0.25)).toBe(
      `${circumference / 4} ${circumference}`,
    );
  });
});

describe('findPointOnRing', () => {
  describe('at the start of the ring', () => {
    it('is at the top', () => {
      const [x, y] = findPointOnRing(0, 0, 10, 0);

      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(-10);
    });
  });

  describe('a quarter of the way round', () => {
    it('is on the right', () => {
      const [x, y] = findPointOnRing(0, 0, 10, 0.25);

      expect(x).toBeCloseTo(10);
      expect(y).toBeCloseTo(0);
    });
  });
});
