import { describe, it, expect } from 'vitest';
import { createMoonLitPath } from './createMoonLitPath';

describe('createMoonLitPath', () => {
  describe('at new moon', () => {
    it('lights nothing, folding the terminator back onto the right edge', () => {
      expect(createMoonLitPath(0, 10)).toBe(
        'M0 -10A10 10 0 0 1 0 10A10 10 0 0 0 0 -10Z',
      );
    });
  });

  describe('at first quarter', () => {
    it('lights the right half', () => {
      expect(createMoonLitPath(0.25, 10)).toMatch(
        /^M0 -10A10 10 0 0 1 0 10A[\d.e-]+ 10 0 0 0 0 -10Z$/,
      );
    });
  });

  describe('at full moon', () => {
    it('lights the whole disc, with the terminator round the left edge', () => {
      expect(createMoonLitPath(0.5, 10)).toBe(
        'M0 -10A10 10 0 0 1 0 10A10 10 0 0 1 0 -10Z',
      );
    });
  });

  describe('while waning', () => {
    it('lights the same shape as the matching waxing phase', () => {
      expect(createMoonLitPath(0.9, 10)).toBe(createMoonLitPath(0.1, 10));
    });
  });
});
