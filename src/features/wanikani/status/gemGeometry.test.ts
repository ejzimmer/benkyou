import { describe, it, expect } from 'vitest'
import { calculateGemShape, clipVerticesBelow } from './gemGeometry';

function parsePoints(points: string) {
  return points.split(' ').map((point) => point.split(',').map(Number));
}

describe('clipVerticesBelow', () => {
  it('keeps the part of the shape below the line, adding points where the line crosses it', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    expect(clipVerticesBelow(square, 4)).toEqual([
      [10, 4],
      [10, 10],
      [0, 10],
      [0, 4],
    ]);
  });
});

describe('calculateGemShape', () => {
  describe('at 0%', () => {
    const shape = calculateGemShape(0, 0, 10, 0);

    it('has no fill', () => {
      expect(shape.isEmpty).toBe(true);
      expect(shape.fill).toBe('');
    });
  });

  describe('at 50%', () => {
    const shape = calculateGemShape(0, 0, 10, 50);

    it('fills the bottom half of the gem', () => {
      const ys = parsePoints(shape.fill).map(([, y]) => y);
      expect(Math.min(...ys)).toBe(0);
      expect(Math.max(...ys)).toBe(10);
    });

    it('draws a surface line across the top of the fill', () => {
      expect(parsePoints(shape.surface).map(([, y]) => y)).toEqual([0, 0]);
    });
  });

  describe('at 100%', () => {
    const shape = calculateGemShape(0, 0, 10, 100);

    it('fills the whole gem', () => {
      expect(shape.fill).toBe(shape.outline);
    });
  });
});
