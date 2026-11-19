import { describe, it, expect } from 'vitest';
import { findBeetlePose } from './findBeetlePose';
import { BeetleSpot, placeBeetles } from './placeBeetles';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { Comprehension } from './types';

const createBranch = (key: string, amount: number): GrownShape => ({
  key,
  amount,
  growth: { type: 'branch', level: 0, start: 0, end: 1 },
  edges: Array.from({ length: 11 }, (_, index): EdgeSample => ({
    at: index / 10,
    left: { x: index * 10, y: 2 },
    right: { x: index * 10, y: -2 },
  })),
});

const createTrunk = (amount: number): GrownShape => ({
  key: 'trunk',
  amount,
  growth: { type: 'trunk', levelEnds: [1] },
  edges: Array.from({ length: 21 }, (_, index): EdgeSample => ({
    at: index / 20,
    left: { x: -4, y: -index * 10 },
    right: { x: 4, y: -index * 10 },
  })),
});

const createHosts = (questions: Comprehension) => [
  { id: 'vol1', ...questions },
];

const createLimb = (amount: number): GrownShape => {
  const limb = createBranch('vol1-limb', amount);
  return {
    ...limb,
    edges: limb.edges.map(({ at, left, right }) => ({
      at,
      left: { x: left.x, y: left.y - 100 },
      right: { x: right.x, y: right.y - 100 },
    })),
  };
};

describe('placeBeetles', () => {
  describe('for an item with look-ups and AI questions', () => {
    const beetles = placeBeetles(createHosts({ lookups: 3, aiQuestions: 1 }), [
      createBranch('vol1-limb', 1),
    ]);

    it('puts a red beetle on for every look-up and a yellow one for every AI question, alternating', () => {
      expect(beetles.map(({ colour }) => colour)).toEqual([
        'red',
        'yellow',
        'red',
        'red',
      ]);
    });

    it('spreads the beetles evenly along the branch', () => {
      expect(beetles.map(({ at }) => at)).toEqual([
        0.12 + 0.8 / 8,
        0.12 + (0.8 * 3) / 8,
        0.12 + (0.8 * 5) / 8,
        0.12 + (0.8 * 7) / 8,
      ]);
    });

    it('measures the length of the branch each beetle is on', () => {
      expect(beetles[0].length).toBe(100);
    });

    it('puts the beetles on the underside of the branch', () => {
      expect(beetles.every(({ isUnderside }) => isUnderside)).toBe(true);
    });
  });

  describe('for an item with several grown branches', () => {
    const beetles = placeBeetles(createHosts({ lookups: 3, aiQuestions: 0 }), [
      createBranch('vol1-limb', 1),
      createBranch('vol1-twig-0', 0.5),
      createBranch('vol1-twig-1', 0.1),
      createBranch('vol2-limb', 1),
    ]);

    it('shares the beetles between the item’s branches that have room for one', () => {
      expect(beetles.map(({ edges }) => edges)).toEqual([
        createBranch('vol1-limb', 1).edges,
        createBranch('vol1-limb', 1).edges,
        createBranch('vol1-twig-0', 0.5).edges,
      ]);
    });

    it('keeps each beetle off the ungrown end of its branch', () => {
      expect(beetles[2].range).toEqual([0.12, 0.42]);
    });
  });

  describe('for an item with more beetles than its branches have room for', () => {
    const limb = createLimb(0.5);
    const trunk = createTrunk(1);
    const beetles = placeBeetles(createHosts({ lookups: 3, aiQuestions: 2 }), [
      trunk,
      limb,
    ]);
    const onTrunk = beetles.filter(({ edges }) => edges === trunk.edges);

    it('fills the branch', () => {
      expect(beetles.filter(({ edges }) => edges === limb.edges)).toHaveLength(
        2,
      );
    });

    it('sends the rest to climb the trunk', () => {
      expect(onTrunk.map(({ colour }) => colour)).toEqual([
        'red',
        'yellow',
        'red',
      ]);
    });

    it('keeps the climbers just below where the branch joins the trunk', () => {
      expect(onTrunk[0].range).toEqual([0.5 - 36 / 200, 0.5]);
    });
  });

  describe('for an item whose branch is too short to hold any beetles', () => {
    const trunk = createTrunk(1);
    const beetles = placeBeetles(createHosts({ lookups: 2, aiQuestions: 1 }), [
      trunk,
      createLimb(0.15),
    ]);

    it('puts all of its beetles on the trunk', () => {
      expect(beetles.map(({ edges }) => edges)).toEqual(
        Array(3).fill(trunk.edges),
      );
    });
  });

  describe('for items overflowing from branches on either side of the trunk', () => {
    const createSideLimb = (key: string, direction: 1 | -1): GrownShape => ({
      key,
      amount: 0.15,
      growth: { type: 'branch', level: 0, start: 0, end: 1 },
      edges: Array.from({ length: 11 }, (_, index): EdgeSample => ({
        at: index / 10,
        left: { x: (4 + index * 10) * direction, y: -98 },
        right: { x: (4 + index * 10) * direction, y: -102 },
      })),
    });
    const trunk = createTrunk(1);
    const beetles = placeBeetles(
      [
        { id: 'left', lookups: 1, aiQuestions: 0 },
        { id: 'right', lookups: 1, aiQuestions: 0 },
      ],
      [trunk, createSideLimb('left-arm', -1), createSideLimb('right-arm', 1)],
    );
    const findX = ({ edges, at, forward, isUnderside }: BeetleSpot) =>
      findBeetlePose(edges, at, forward, isUnderside).x;

    it('climbs each on the side of the trunk its branch grows from', () => {
      expect(beetles.map(findX)).toEqual([
        expect.closeTo(-3.6),
        expect.closeTo(3.6),
      ]);
    });
  });
});
