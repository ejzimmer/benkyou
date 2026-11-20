import { describe, it, expect } from 'vitest';
import { createTreeLayout } from './treeLayout';
import { EdgeSample } from './treeGeometry';
import { PrintSeries, Volume } from './types';

const createVolume = (number: number, pages?: number): Volume => ({
  id: `vol${number}`,
  number,
  pages,
});

const createSeries = (
  volumes: Volume[],
  overrides: Partial<PrintSeries> = {},
): PrintSeries => ({
  id: 'hugo',
  type: 'book',
  name: 'Les Misérables',
  language: 'french',
  volumes: Object.fromEntries(volumes.map((volume) => [volume.id, volume])),
  ...overrides,
});

const getBranchLevels = (series: PrintSeries) =>
  createTreeLayout(series).shapes.flatMap(({ growth }) =>
    growth.type === 'branch' ? [growth.level] : [],
  );

const findMiddle = ({ left, right }: EdgeSample) => ({
  x: (left.x + right.x) / 2,
  y: (left.y + right.y) / 2,
});

const findShape = (series: PrintSeries, key: string) =>
  createTreeLayout(series).shapes.find((shape) => shape.key === key)!;

describe('createTreeLayout', () => {
  describe('with several volumes', () => {
    const series = createSeries([
      createVolume(2, 400),
      createVolume(1, 200),
      createVolume(3, 200),
    ]);

    it('grows a branch for each volume, in volume order, then one for the next volume', () => {
      expect([...new Set(getBranchLevels(series))]).toEqual([0, 1, 2, 3]);
    });

    it('grows the next volume branch on the level above the last volume', () => {
      const { nextVolumeShapes } = createTreeLayout(series);

      expect(nextVolumeShapes.map(({ growth }) => growth)).toEqual(
        nextVolumeShapes.map(() => expect.objectContaining({ level: 3 })),
      );
    });

    it('grows the same tree every time', () => {
      expect(createTreeLayout(series)).toEqual(createTreeLayout(series));
    });

    it('centres the bounds on the trunk', () => {
      const { bounds } = createTreeLayout(series);

      expect(bounds.x).toBe(-bounds.width / 2);
    });

    describe('when another volume is added', () => {
      const grown = createSeries([
        ...Object.values(series.volumes!),
        createVolume(4, 300),
      ]);

      it('keeps the existing branches where they were', () => {
        const branchesOf = ({
          shapes,
          nextVolumeShapes,
        }: ReturnType<typeof createTreeLayout>) =>
          shapes.filter(
            (shape) =>
              shape.growth.type === 'branch' &&
              !nextVolumeShapes.includes(shape),
          );

        expect(branchesOf(createTreeLayout(grown))).toEqual(
          expect.arrayContaining(branchesOf(createTreeLayout(series))),
        );
      });

      describe('with the branch seed of the next volume', () => {
        it('grows it the branch the next volume had', () => {
          const nextLimb = createTreeLayout(series).nextVolumeShapes[0];
          const added = createSeries([
            ...Object.values(series.volumes!),
            { ...createVolume(4, 200), branchSeed: 'volume-4' },
          ]);

          expect(findShape(added, 'vol4-limb').edges).toEqual(nextLimb.edges);
        });
      });
    });
  });

  describe('with a longer volume', () => {
    it('grows a longer branch', () => {
      const short = createSeries([createVolume(1, 100)]);
      const long = createSeries([createVolume(1, 900)]);
      const reach = (series: PrintSeries) => {
        const { edges } = findShape(series, 'vol1-limb');
        const base = findMiddle(edges[0]);
        const tip = findMiddle(edges[edges.length - 1]);
        return Math.hypot(tip.x - base.x, tip.y - base.y);
      };

      expect(reach(long)).toBeGreaterThan(reach(short));
    });
  });

  describe('with a different series', () => {
    it('grows a different tree', () => {
      const volumes = [createVolume(1, 200), createVolume(2, 200)];

      expect(createTreeLayout(createSeries(volumes)).shapes).not.toEqual(
        createTreeLayout(createSeries(volumes, { id: 'verne' })).shapes,
      );
    });
  });

  describe.each(['book', 'manga'] as const)('for a %s series', (type) => {
    it('grows twigs off each limb', () => {
      const { shapes } = createTreeLayout(
        createSeries([createVolume(1, 200)], { type }),
      );

      expect(shapes.map(({ key }) => key)).toContain('vol1-twig-0');
    });
  });

  describe('with no volumes', () => {
    it('grows a trunk from the ground', () => {
      const { shapes } = createTreeLayout(createSeries([]));

      expect(shapes[0].key).toBe('trunk');
      expect(findMiddle(shapes[0].edges[0])).toEqual({ x: 0, y: 0 });
    });

    it('grows only the branch for the first volume', () => {
      const { shapes, nextVolumeShapes } = createTreeLayout(createSeries([]));

      expect(shapes.slice(1)).toEqual(nextVolumeShapes);
    });
  });
});
