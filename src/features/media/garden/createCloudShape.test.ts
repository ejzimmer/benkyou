import { describe, it, expect } from 'vitest';
import { createCloudShape } from './createCloudShape';

const width = 480;
const height = 260;

const getLeftEdges = () =>
  createCloudShape(width, height)
    .puffs.filter(([cx]) => cx < width / 2)
    .filter(([, cy]) => cy >= 100)
    .map(([cx, cy, radius]) => ({ y: cy, edge: cx - radius }));

const isInsideBody = (body: [number, number][], x: number, y: number) =>
  body.reduce((inside, [x1, y1], index) => {
    const [x2, y2] = body[(index + 1) % body.length];
    const startIsBelow = y1 > y;
    const endIsBelow = y2 > y;
    const crosses =
      startIsBelow !== endIsBelow &&
      x < x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
    return crosses ? !inside : inside;
  }, false);

const findHoles = (cloudWidth: number, depth: number) => {
  const { body, puffs } = createCloudShape(cloudWidth, height);
  const isInside = (x: number, y: number) =>
    isInsideBody(body, x, y) ||
    puffs.some(([cx, cy, radius]) => Math.hypot(x - cx, y - cy) <= radius);

  const key = (x: number, y: number) => `${x},${y}`;
  const outside = new Set<string>();
  const queue: [number, number][] = [];
  const visit = (x: number, y: number) => {
    if (x < 0 || x > cloudWidth || y < 0 || y > depth) return;
    if (outside.has(key(x, y)) || isInside(x, y)) return;
    outside.add(key(x, y));
    queue.push([x, y]);
  };

  for (let x = 0; x <= cloudWidth; x++) visit(x, 0);
  for (let y = 0; y <= depth; y++) {
    visit(0, y);
    visit(cloudWidth, y);
  }
  while (queue.length) {
    const [x, y] = queue.pop()!;
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }

  const holes: [number, number][] = [];
  for (let x = 0; x <= cloudWidth; x++) {
    for (let y = 0; y <= depth; y++) {
      if (!outside.has(key(x, y)) && !isInside(x, y)) holes.push([x, y]);
    }
  }
  return holes;
};

describe('createCloudShape', () => {
  describe.each([480, 640])('the top of a %ipx cloud', (cloudWidth) => {
    it('has no holes in it', () => {
      expect(findHoles(cloudWidth, 100)).toEqual([]);
    });

    it('has each puff overlapping the next one along', () => {
      const topPuffs = createCloudShape(cloudWidth, height)
        .puffs.filter(([, cy]) => cy < 100)
        .sort(([a], [b]) => a - b);

      topPuffs.slice(1).forEach(([cx, cy, radius], index) => {
        const [previousX, previousY, previousRadius] = topPuffs[index];
        const gap =
          Math.hypot(cx - previousX, cy - previousY) - radius - previousRadius;
        expect(gap).toBeLessThan(-20);
      });
    });
  });

  describe('the bottom', () => {
    it('lies flat along the bottom of the box', () => {
      const { body } = createCloudShape(width, height);
      const bottom = body.filter(([, y]) => y === height);

      expect(bottom).toHaveLength(2);
    });

    it('has no puffs hanging below the box', () => {
      const { puffs } = createCloudShape(width, height);
      const lowest = Math.max(...puffs.map(([, cy, radius]) => cy + radius));

      expect(lowest).toBe(height);
    });
  });

  describe('the sides', () => {
    it('get wider towards the bottom', () => {
      const edges = getLeftEdges().sort((a, b) => a.y - b.y);

      edges.slice(1).forEach(({ edge }, index) => {
        expect(edge).toBeLessThan(edges[index].edge);
      });
    });

    it('overhang the box at the bottom', () => {
      const edges = getLeftEdges();
      const lowest = edges.reduce((a, b) => (b.y > a.y ? b : a));

      expect(lowest.edge).toBeLessThan(0);
    });

    it('mirror each other', () => {
      const { puffs } = createCloudShape(width, height);
      const sidePuffs = puffs.filter(([, cy]) => cy >= 100);
      const left = sidePuffs.filter(([cx]) => cx < width / 2);
      const right = sidePuffs.filter(([cx]) => cx > width / 2);

      expect(right.map(([cx, cy, r]) => [width - cx, cy, r])).toEqual(left);
    });
  });

  describe('when the box is taller', () => {
    it('adds more puffs down the sides', () => {
      const short = createCloudShape(width, 260).puffs.length;
      const tall = createCloudShape(width, 500).puffs.length;

      expect(tall).toBeGreaterThan(short);
    });
  });
});
