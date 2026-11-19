import { describe, it, expect } from 'vitest';
import { chooseScuttleTarget } from './chooseScuttleTarget';

const createRandom =
  (...values: number[]) =>
  () =>
    values.shift()!;

describe('chooseScuttleTarget', () => {
  describe('in the middle of the branch', () => {
    it('scuttles back towards the trunk', () => {
      expect(
        chooseScuttleTarget(0.5, [0, 1], 100, createRandom(0.5, 0.9)),
      ).toBeCloseTo(0.39);
    });

    it('scuttles out along the branch', () => {
      expect(
        chooseScuttleTarget(0.5, [0, 1], 100, createRandom(0, 0.1)),
      ).toBeCloseTo(0.55);
    });
  });

  describe('near the end of its range', () => {
    it('stops at the end of the range', () => {
      expect(
        chooseScuttleTarget(0.9, [0.1, 0.95], 100, createRandom(1, 0.1)),
      ).toBe(0.95);
    });

    it('stays put when it would barely move', () => {
      expect(
        chooseScuttleTarget(0.94, [0.1, 0.95], 100, createRandom(1, 0.1)),
      ).toBeUndefined();
    });
  });
});
