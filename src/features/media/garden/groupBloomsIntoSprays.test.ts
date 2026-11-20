import { describe, it, expect } from 'vitest';
import { Bloom } from './getBlooms';
import { groupBloomsIntoSprays } from './groupBloomsIntoSprays';
import { EdgeSample } from './treeGeometry';

const createStraightLimb = (key: string, length: number) => ({
  key,
  edges: [0, 1].map((at): EdgeSample => ({
    at,
    left: { x: at * length, y: -1 },
    right: { x: at * length, y: 1 },
  })),
});

const createBloom = (key: string, limbKey: string, at: number): Bloom => ({
  key,
  volume: { id: limbKey, number: 1, pages: 100 },
  limbKey,
  at,
  understood: 50,
  date: '2026-10-01T10:00:00Z',
});

const findGroupedKeys = (blooms: Bloom[], limbs = [limb]) =>
  groupBloomsIntoSprays(blooms, limbs).map((spray) =>
    spray.blooms.map(({ key }) => key),
  );

const limb = createStraightLimb('vol1-limb', 100);

describe('groupBloomsIntoSprays', () => {
  describe('blooms far apart on a limb', () => {
    it('gives each its own spray', () => {
      expect(
        findGroupedKeys([
          createBloom('a', 'vol1-limb', 0.2),
          createBloom('b', 'vol1-limb', 0.6),
        ]),
      ).toEqual([['a'], ['b']]);
    });
  });

  describe('blooms close together on a limb', () => {
    const blooms = [
      createBloom('b', 'vol1-limb', 0.3),
      createBloom('a', 'vol1-limb', 0.2),
    ];

    it('shares one spray between them, in order along the limb', () => {
      expect(findGroupedKeys(blooms)).toEqual([['a', 'b']]);
    });

    it('places the spray between them', () => {
      expect(groupBloomsIntoSprays(blooms, [limb])[0].at).toBeCloseTo(0.25);
    });

    describe('when there are more than a spray can hold', () => {
      it('starts a new spray', () => {
        expect(
          findGroupedKeys(
            ['a', 'b', 'c', 'd', 'e'].map((key, index) =>
              createBloom(key, 'vol1-limb', 0.2 + index * 0.05),
            ),
          ),
        ).toEqual([['a', 'b', 'c', 'd'], ['e']]);
      });
    });
  });

  describe('blooms close together on different limbs', () => {
    it('keeps them on their own limbs', () => {
      expect(
        groupBloomsIntoSprays(
          [
            createBloom('a', 'vol1-limb', 0.2),
            createBloom('b', 'vol2-limb', 0.21),
          ],
          [limb, createStraightLimb('vol2-limb', 100)],
        ).map(({ limbKey, blooms }) => [limbKey, blooms.map(({ key }) => key)]),
      ).toEqual([
        ['vol1-limb', ['a']],
        ['vol2-limb', ['b']],
      ]);
    });
  });

  describe('a short limb', () => {
    it('groups blooms that are a large fraction of it apart', () => {
      expect(
        findGroupedKeys(
          [
            createBloom('a', 'short-limb', 0.2),
            createBloom('b', 'short-limb', 0.4),
          ],
          [createStraightLimb('short-limb', 40)],
        ),
      ).toEqual([['a', 'b']]);
    });
  });
});
