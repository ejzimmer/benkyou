import { describe, it, expect } from 'vitest'
import { calculateLevelProgress } from './levelProgress';
import { assignments, subjects } from './testFixtures';

describe('calculateLevelProgress', () => {
  const progress = calculateLevelProgress(subjects, assignments, 2);

  it('counts the kanji passed at the level', () => {
    expect(progress.kanji.passed).toBe(1);
    expect(progress.kanji.total).toBe(3);
  });

  it('needs 90% of the level’s kanji passed, rounded up', () => {
    expect(progress.kanji.needed).toBe(3);
  });

  it('counts the radicals passed at the level', () => {
    expect(calculateLevelProgress(subjects, assignments, 1).radical).toEqual({
      passed: 2,
      total: 2,
    });
  });
});
