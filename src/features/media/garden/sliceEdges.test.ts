import { describe, it, expect } from 'vitest';
import { sliceEdges } from './sliceEdges';
import { EdgeSample } from './treeGeometry';

const edges: EdgeSample[] = [0, 0.5, 1].map((at) => ({
  at,
  left: { x: at * 100, y: 0 },
  right: { x: at * 100, y: 10 },
}));

describe('sliceEdges', () => {
  describe('from the base', () => {
    it('keeps the edges up to the end, cutting the last sample', () => {
      expect(sliceEdges(edges, 0, 0.25)).toEqual([
        edges[0],
        { at: 0.25, left: { x: 25, y: 0 }, right: { x: 25, y: 10 } },
      ]);
    });
  });

  describe('from part way along', () => {
    it('cuts both ends and keeps the samples between', () => {
      expect(sliceEdges(edges, 0.25, 0.75)).toEqual([
        { at: 0.25, left: { x: 25, y: 0 }, right: { x: 25, y: 10 } },
        edges[1],
        { at: 0.75, left: { x: 75, y: 0 }, right: { x: 75, y: 10 } },
      ]);
    });
  });
});
