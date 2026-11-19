import { describe, it, expect, vi, afterEach } from 'vitest'
import { predictDaysToFinish, removeOutliers } from './levelPrediction';
import { LevelProgression } from './types';

describe('removeOutliers', () => {
  it('drops values far above the upper quartile', () => {
    expect(removeOutliers([7, 8, 8, 9, 10, 60])).toEqual([7, 8, 8, 9, 10]);
  });

  describe('with fewer than four values', () => {
    it('keeps them all', () => {
      expect(removeOutliers([7, 8, 60])).toEqual([7, 8, 60]);
    });
  });
});

describe('predictDaysToFinish', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setToday(date: string) {
    vi.useFakeTimers({ now: new Date(`${date}T00:00:00Z`) });
  }

  function createProgression(
    level: number,
    unlockedOn: string,
    passedOn?: string,
  ): LevelProgression {
    return {
      level,
      unlockedAt: `${unlockedOn}T00:00:00Z`,
      passedAt: passedOn ? `${passedOn}T00:00:00Z` : null,
      abandonedAt: null,
    };
  }

  describe('on level 58 after two 10-day levels', () => {
    const progressions = [
      createProgression(56, '2026-01-01', '2026-01-11'),
      createProgression(57, '2026-01-11', '2026-01-21'),
      createProgression(58, '2026-01-21'),
    ];

    describe('4 days into level 58', () => {
      it('predicts the 6 days left of a 10-day level, then 10 days each for levels 59 and 60', () => {
        setToday('2026-01-25');

        expect(predictDaysToFinish(progressions, 58)).toBe(26);
      });
    });

    describe('when the current level has already taken longer than the average', () => {
      it('counts the time so far as a level duration and predicts that pace for levels 59 and 60', () => {
        setToday('2026-02-10');

        expect(predictDaysToFinish(progressions, 58)).toBe(27);
      });

      it('predicts more days for each extra day spent on it', () => {
        setToday('2026-02-13');

        expect(predictDaysToFinish(progressions, 58)).toBe(29);
      });
    });
  });

  describe('when one level took unusually long', () => {
    it('leaves it out of the average', () => {
      setToday('2026-05-21');
      const progressions = [
        createProgression(54, '2026-01-01', '2026-01-11'),
        createProgression(55, '2026-01-11', '2026-01-21'),
        createProgression(56, '2026-01-21', '2026-01-31'),
        createProgression(57, '2026-01-31', '2026-05-11'),
        createProgression(58, '2026-05-11', '2026-05-21'),
        createProgression(59, '2026-05-21'),
      ];

      expect(predictDaysToFinish(progressions, 59)).toBe(20);
    });
  });

  describe('after a reset', () => {
    it('only uses the levels done since the reset', () => {
      setToday('2026-03-12');
      const progressions = [
        {
          ...createProgression(58, '2026-01-01', '2026-02-20'),
          abandonedAt: '2026-03-02T00:00:00Z',
        },
        createProgression(58, '2026-03-02', '2026-03-12'),
        createProgression(59, '2026-03-12'),
      ];

      expect(predictDaysToFinish(progressions, 59)).toBe(20);
    });
  });

  describe('once level 60 is passed', () => {
    it('has nothing left', () => {
      setToday('2026-01-21');

      expect(
        predictDaysToFinish(
          [createProgression(60, '2026-01-01', '2026-01-11')],
          60,
        ),
      ).toBe(0);
    });
  });

  describe('before any level is passed', () => {
    it('makes no prediction', () => {
      setToday('2026-01-02');

      expect(
        predictDaysToFinish([createProgression(1, '2026-01-01')], 1),
      ).toBeUndefined();
    });
  });
});
