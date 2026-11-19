import { describe, it, expect } from 'vitest'
import { calculateLiquidLayers, createBubbles } from './vialGeometry';

describe('calculateLiquidLayers', () => {
  const counts = {
    apprentice: 1,
    guru: 1,
    master: 0,
    enlightened: 0,
    burned: 2,
  };

  describe('when some subjects have been started', () => {
    const { layers, surfaceY } = calculateLiquidLayers(counts, 10, 0, 100);

    it('stacks the stages from burned at the bottom to apprentice on top', () => {
      expect(layers.map(({ group }) => group)).toEqual([
        'burned',
        'enlightened',
        'master',
        'guru',
        'apprentice',
      ]);
    });

    it('gives each stage a height in proportion to its share of the total', () => {
      expect(layers[0]).toEqual({ group: 'burned', y: 80, height: 20 });
      expect(layers[3]).toEqual({ group: 'guru', y: 70, height: 10 });
      expect(layers[4]).toEqual({ group: 'apprentice', y: 60, height: 10 });
    });

    it('puts the surface on top of the last stage', () => {
      expect(surfaceY).toBe(60);
    });
  });

  describe('when there are no subjects', () => {
    it('leaves the vial empty', () => {
      const { surfaceY } = calculateLiquidLayers(
        { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 },
        0,
        0,
        100,
      );

      expect(surfaceY).toBe(100);
    });
  });
});

describe('createBubbles', () => {
  const bounds = { left: 10, right: 40, bottom: 300, surfaceY: 120 };

  it('starts every bubble at the bottom, inside the walls', () => {
    const bubbles = createBubbles(9, 1, bounds);

    expect(bubbles).toHaveLength(9);
    bubbles.forEach((bubble) => {
      expect(bubble.y).toBe(300);
      expect(bubble.x).toBeGreaterThanOrEqual(10);
      expect(bubble.x).toBeLessThanOrEqual(40);
    });
  });

  it('floats every bubble up to the surface', () => {
    createBubbles(9, 1, bounds).forEach((bubble) => {
      expect(bubble.rise).toBe(-180);
    });
  });

  it('places the bubbles the same way every time for the same seed', () => {
    expect(createBubbles(9, 2, bounds)).toEqual(createBubbles(9, 2, bounds));
  });
});
