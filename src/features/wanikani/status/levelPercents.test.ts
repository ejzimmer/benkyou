import { describe, it, expect } from 'vitest'
import {
  calculatePercentsByLevel,
  findFullyBurnedTypesByLevel,
  isUnlocked,
} from './levelPercents';
import { assignments, subjects } from './testFixtures';
import { Assignment, Subject } from './types';

describe('calculatePercentsByLevel', () => {
  describe('counting unlocked subjects', () => {
    it('gives the percent of each type unlocked at every level up to the max', () => {
      expect(
        calculatePercentsByLevel(subjects, assignments, 2, isUnlocked).map(
          ({ level, percents }) => ({ level, percents }),
        ),
      ).toEqual([
        { level: 1, percents: { radical: 100, kanji: 100, vocabulary: 0 } },
        { level: 2, percents: { radical: 0, kanji: 66, vocabulary: 0 } },
      ]);
    });

    it('gives the number of each type unlocked out of the total at each level', () => {
      const [, level2] = calculatePercentsByLevel(
        subjects,
        assignments,
        2,
        isUnlocked,
      );

      expect(level2.counts).toEqual({
        radical: { counted: 0, total: 0 },
        kanji: { counted: 2, total: 3 },
        vocabulary: { counted: 0, total: 1 },
      });
    });
  });

  describe('when only part of a level is counted', () => {
    it('rounds down so a level only shows 100% once everything is counted', () => {
      const manyRadicals: Subject[] = Array.from({ length: 200 }, (_, id) => ({
        id,
        type: 'radical',
        level: 1,
      }));
      const allButOneUnlocked: Assignment[] = manyRadicals
        .slice(1)
        .map(({ id }) => ({ subjectId: id, srsStage: 1, passedAt: null }));

      const [level] = calculatePercentsByLevel(
        manyRadicals,
        allButOneUnlocked,
        1,
        isUnlocked,
      );

      expect(level.percents.radical).toBe(99);
    });
  });
});

describe('findFullyBurnedTypesByLevel', () => {
  it('marks the types where every subject at that level is burned', () => {
    expect(findFullyBurnedTypesByLevel(subjects, assignments, 2)).toEqual([
      { radical: false, kanji: true, vocabulary: false },
      { radical: false, kanji: false, vocabulary: false },
    ]);
  });
});
