import { describe, it, expect } from 'vitest';
import { getBlooms } from './getBlooms';
import { PrintSeries, ProgressUpdate, Volume } from './types';

type KeyedUpdate = [string, ProgressUpdate];

const createUpdate = (
  key: string,
  at: string,
  details: Partial<ProgressUpdate>,
): KeyedUpdate => [key, { at, lookups: 0, aiQuestions: 0, ...details }];

const createVolume = (number: number, updates: KeyedUpdate[]): Volume => ({
  id: `vol${number}`,
  number,
  pages: 200,
  updates: Object.fromEntries(updates),
});

const createSeries = (
  volumes: Volume[],
  upTo: PrintSeries['upTo'],
): PrintSeries => ({
  id: 'series',
  type: 'book',
  name: 'Series',
  language: 'french',
  volumes: Object.fromEntries(volumes.map((volume) => [volume.id, volume])),
  upTo,
});

describe('getBlooms', () => {
  describe('for a volume with updates', () => {
    const series = createSeries(
      [
        createVolume(1, [
          createUpdate('u2', '2026-10-03T10:00:00Z', {
            page: 100,
            understood: 55,
          }),
          createUpdate('u1', '2026-10-01T10:00:00Z', {
            page: 50,
            understood: 40,
          }),
          createUpdate('u3', '2026-10-04T10:00:00Z', {
            page: 120,
            lookups: 3,
          }),
        ]),
      ],
      { volume: 1, page: 150 },
    );

    it('grows a flower for each update that says how much was understood, at its page, in the order they were saved', () => {
      expect(getBlooms(series)).toEqual([
        {
          key: 'u1',
          volume: series.volumes!.vol1,
          limbKey: 'vol1-limb',
          at: 0.25,
          understood: 40,
          date: '2026-10-01T10:00:00Z',
        },
        {
          key: 'u2',
          volume: series.volumes!.vol1,
          limbKey: 'vol1-limb',
          at: 0.5,
          understood: 55,
          date: '2026-10-03T10:00:00Z',
        },
      ]);
    });
  });

  describe('for an update with no page', () => {
    it('puts the flower where reading is up to now', () => {
      const series = createSeries(
        [
          createVolume(1, [
            createUpdate('u1', '2026-10-01T10:00:00Z', { understood: 40 }),
          ]),
        ],
        { volume: 1, page: 120 },
      );

      expect(getBlooms(series)[0].at).toBe(0.6);
    });
  });

  describe('for an update past where the volume is up to now', () => {
    it('keeps the flower on the grown part of the branch', () => {
      const series = createSeries(
        [
          createVolume(1, [
            createUpdate('u1', '2026-10-01T10:00:00Z', {
              page: 180,
              understood: 40,
            }),
          ]),
        ],
        { volume: 1, page: 100 },
      );

      expect(getBlooms(series)[0].at).toBe(0.5);
    });
  });

  describe('when reading was barely started', () => {
    it('keeps the flower a little way out from the trunk', () => {
      const series = createSeries(
        [
          createVolume(1, [
            createUpdate('u1', '2026-10-01T10:00:00Z', {
              page: 2,
              understood: 10,
            }),
          ]),
        ],
        { volume: 1, page: 2 },
      );

      expect(getBlooms(series)[0].at).toBe(0.1);
    });
  });
});
