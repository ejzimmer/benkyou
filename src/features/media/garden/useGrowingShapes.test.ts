import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { GrownShape } from './treeGrowth';
import { GROWTH_DURATION_MS, useGrowingShapes } from './useGrowingShapes';

const createShape = (key: string, amount: number): GrownShape => ({
  key,
  amount,
  edges: [],
  growth: { type: 'branch', level: 0, start: 0, end: 1 },
});

const readAmounts = (shapes: GrownShape[]) =>
  Object.fromEntries(shapes.map(({ key, amount }) => [key, amount]));

describe('useGrowingShapes', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const renderGrowingShapes = (shapes: GrownShape[]) =>
    renderHook(({ shapes }) => useGrowingShapes(shapes), {
      initialProps: { shapes },
    });

  describe('on first render', () => {
    it('shows every shape at its full amount', () => {
      const { result } = renderGrowingShapes([
        createShape('trunk', 1),
        createShape('limb', 0.5),
      ]);

      expect(readAmounts(result.current)).toEqual({ trunk: 1, limb: 0.5 });
    });
  });

  describe('when a shape grows', () => {
    const growLimb = () => {
      const hook = renderGrowingShapes([createShape('limb', 0.2)]);
      hook.rerender({ shapes: [createShape('limb', 0.6)] });
      return hook;
    };

    it('starts from where it was', () => {
      const { result } = growLimb();

      expect(readAmounts(result.current)).toEqual({ limb: 0.2 });
    });

    describe('partway through the growth', () => {
      it('shows it between its old and new amounts', () => {
        const { result } = growLimb();

        act(() => vi.advanceTimersByTime(GROWTH_DURATION_MS / 2));

        const [limb] = result.current;
        expect(limb.amount).toBeGreaterThan(0.2);
        expect(limb.amount).toBeLessThan(0.6);
      });
    });

    describe('once the growth has finished', () => {
      it('shows its new amount', () => {
        const { result } = growLimb();

        act(() => vi.advanceTimersByTime(GROWTH_DURATION_MS + 100));

        expect(readAmounts(result.current)).toEqual({ limb: 0.6 });
      });
    });
  });

  describe('when a new shape appears', () => {
    it('grows it from nothing', () => {
      const { result, rerender } = renderGrowingShapes([
        createShape('trunk', 1),
      ]);

      rerender({ shapes: [createShape('trunk', 1), createShape('limb', 0.4)] });
      act(() => vi.advanceTimersByTime(GROWTH_DURATION_MS / 4));

      const limb = result.current.find(({ key }) => key === 'limb');
      expect(limb?.amount).toBeGreaterThan(0);
      expect(limb?.amount).toBeLessThan(0.4);
    });
  });
});
