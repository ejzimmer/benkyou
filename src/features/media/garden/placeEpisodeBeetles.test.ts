import { describe, it, expect } from 'vitest';
import { placeEpisodeBeetles } from './placeEpisodeBeetles';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { EpisodeUpdate, TvSeries } from './types';

const createShoot = (length: number): GrownShape => ({
  key: 's1-e1-shoot',
  amount: 1,
  growth: { type: 'branch', level: 0, start: 0, end: 1 },
  edges: Array.from({ length: 21 }, (_, index): EdgeSample => ({
    at: index / 20,
    left: { x: 100 + (index * length) / 20, y: -99 },
    right: { x: 100 + (index * length) / 20, y: -101 },
  })),
});

const createBranch = (): GrownShape => ({
  key: 's1-branch',
  amount: 1,
  growth: { type: 'stem', firstLevel: 0, levelEnds: [1] },
  edges: Array.from({ length: 21 }, (_, index): EdgeSample => ({
    at: index / 20,
    left: { x: index * 5, y: -98 },
    right: { x: index * 5, y: -102 },
  })),
});

const createUpdate = (
  day: number,
  timestampInSeconds: number,
  lookups: number,
  aiQuestions = 0,
): EpisodeUpdate => ({
  at: `2026-09-0${day}T20:00:00Z`,
  timestampInSeconds,
  lookups,
  aiQuestions,
});

const createSeries = (updates: EpisodeUpdate[]): TvSeries => ({
  id: 'lupin',
  type: 'tv',
  name: 'Lupin',
  language: 'french',
  seasons: {
    s1: {
      id: 's1',
      number: 1,
      episodes: {
        e1: {
          id: 'e1',
          number: 1,
          lengthInSeconds: 2000,
          status: 'done',
          lookups: 0,
          aiQuestions: 0,
          updates: Object.fromEntries(
            updates.map((update, index) => [`u${index + 1}`, update]),
          ),
        },
      },
    },
  },
});

describe('placeEpisodeBeetles', () => {
  describe('for an episode with several updates', () => {
    const beetles = placeEpisodeBeetles(
      createSeries([createUpdate(1, 500, 2, 1), createUpdate(2, 1500, 3)]),
      [createBranch(), createShoot(200)],
    );
    const beetlesOf = (key: string) =>
      beetles.filter((beetle) => beetle.key.startsWith(`${key}-`));

    it('gives each update its own beetles', () => {
      expect(beetlesOf('u1').map(({ colour }) => colour)).toEqual([
        'red',
        'yellow',
        'red',
      ]);
      expect(beetlesOf('u2')).toHaveLength(3);
    });

    describe('for the first update', () => {
      it('scatters its beetles between the base of the shoot and its timestamp', () => {
        beetlesOf('u1').forEach(({ at }) => {
          expect(at).toBeGreaterThan(0.12);
          expect(at).toBeLessThan(0.25);
        });
      });
    });

    describe('for a later update', () => {
      it('spreads its beetles evenly between the previous update and its timestamp', () => {
        expect(beetlesOf('u2').map(({ at }) => at)).toEqual([
          expect.closeTo(0.25 + 0.5 / 6),
          expect.closeTo(0.5),
          expect.closeTo(0.75 - 0.5 / 6),
        ]);
      });
    });
  });

  describe('when an update has no room on the shoot for its beetles', () => {
    const branch = createBranch();
    const beetles = placeEpisodeBeetles(
      createSeries([createUpdate(1, 1000, 2, 1)]),
      [branch, createShoot(24)],
    );
    const onBranch = beetles.filter(({ edges }) => edges === branch.edges);

    it('keeps as many as fit on the shoot', () => {
      const onShoot = beetles.filter(({ edges }) => edges !== branch.edges);
      expect(onShoot.map(({ key }) => key)).toEqual(['u1-beetle-0']);
    });

    it('sends the rest along the season’s branch', () => {
      expect(onBranch.map(({ colour }) => colour)).toEqual(['yellow', 'red']);
    });

    it('lines them up just behind where the shoot grows from', () => {
      onBranch.forEach(({ at }) => {
        expect(at).toBeGreaterThan(0.75);
        expect(at).toBeLessThan(1);
      });
    });
  });
});
