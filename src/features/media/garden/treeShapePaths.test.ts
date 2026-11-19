import { describe, it, expect } from 'vitest';
import { EdgeSample } from './treeGeometry';
import { ShapeGrowth } from './treeLayout';
import { drawShapeFill, drawShapeOutline } from './treeShapePaths';

const edges: EdgeSample[] = [
  { at: 0, left: { x: -2, y: 0 }, right: { x: 2, y: 0 } },
  { at: 0.5, left: { x: -2, y: -10 }, right: { x: 2, y: -10 } },
  { at: 1, left: { x: -2, y: -20 }, right: { x: 2, y: -20 } },
];
const branch: ShapeGrowth = { type: 'branch', level: 0, start: 0, end: 1 };
const trunk: ShapeGrowth = { type: 'trunk', levelEnds: [1] };

describe('drawShapeFill', () => {
  describe('when the shape is fully grown', () => {
    it('rounds off both ends', () => {
      expect(drawShapeFill(edges, 1)).toBe(
        'M-2 0 L-2 -10 -2 -20 A2 2 0 0 0 2 -20 L2 -10 2 0 A2 2 0 0 0 -2 0 Z',
      );
    });
  });

  describe('when the shape is partly grown', () => {
    it('cuts straight across where it stops', () => {
      expect(drawShapeFill(edges, 0.75)).toBe(
        'M-2 0 L-2 -10 -2 -15 L2 -15 L2 -10 2 0 A2 2 0 0 0 -2 0 Z',
      );
    });
  });
});

describe('drawShapeOutline', () => {
  describe('for a fully grown branch', () => {
    it('runs up one side, around the tip and back down, leaving the base open', () => {
      expect(drawShapeOutline({ edges, growth: branch }, 1)).toBe(
        'M-2 0 L-2 -10 -2 -20 A2 2 0 0 0 2 -20 L2 -10 2 0',
      );
    });
  });

  describe('for a partly grown branch', () => {
    it('traces each side up to where it stops', () => {
      expect(drawShapeOutline({ edges, growth: branch }, 0.75)).toBe(
        'M-2 0 L-2 -10 -2 -15 M2 0 L2 -10 2 -15',
      );
    });
  });

  describe('for a fully grown trunk', () => {
    it('goes all the way around', () => {
      expect(drawShapeOutline({ edges, growth: trunk }, 1)).toBe(
        'M-2 0 L-2 -10 -2 -20 A2 2 0 0 0 2 -20 L2 -10 2 0 A2 2 0 0 0 -2 0 Z',
      );
    });
  });

  describe('for a partly grown trunk', () => {
    it('goes around the base, leaving the top open', () => {
      expect(drawShapeOutline({ edges, growth: trunk }, 0.75)).toBe(
        'M2 -15 L2 -10 2 0 A2 2 0 0 0 -2 0 L-2 -10 -2 -15',
      );
    });
  });
});
