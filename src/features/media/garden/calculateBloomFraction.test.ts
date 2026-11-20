import { describe, it, expect } from 'vitest';
import { calculateBloomFraction } from './calculateBloomFraction';

describe('calculateBloomFraction', () => {
  describe('at the ends of the range', () => {
    it('is closed at 0%', () => {
      expect(calculateBloomFraction(0)).toBe(0);
    });

    it('is fully open at 100%', () => {
      expect(calculateBloomFraction(100)).toBe(1);
    });
  });

  describe('with the default exponent', () => {
    it('spreads 70% and 95% more than half the range apart', () => {
      expect(
        calculateBloomFraction(95) - calculateBloomFraction(70),
      ).toBeGreaterThan(0.5);
    });
  });

  describe('with a steeper exponent', () => {
    it('opens less at the same score', () => {
      expect(calculateBloomFraction(90, 6)).toBeLessThan(
        calculateBloomFraction(90),
      );
    });
  });
});
