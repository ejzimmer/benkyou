import { describe, it, expect } from 'vitest'
import { countSubjectsBySrsGroup, getSrsGroup } from './srsGroups';
import { assignments, subjects } from './testFixtures';

describe('getSrsGroup', () => {
  it.each([
    [1, 'apprentice'],
    [4, 'apprentice'],
    [5, 'guru'],
    [6, 'guru'],
    [7, 'master'],
    [8, 'enlightened'],
    [9, 'burned'],
  ])('puts stage %i in %s', (stage, group) => {
    expect(getSrsGroup(stage)).toBe(group);
  });

  it('puts unstarted lessons in no group', () => {
    expect(getSrsGroup(0)).toBeUndefined();
  });
});

describe('countSubjectsBySrsGroup', () => {
  const counts = countSubjectsBySrsGroup(subjects, assignments);

  it('counts every subject of each type in the total', () => {
    expect(counts.radical.total).toBe(2);
    expect(counts.kanji.total).toBe(4);
    expect(counts.vocabulary.total).toBe(1);
  });

  it('counts each subject in the group for its SRS stage', () => {
    expect(counts.kanji.counts).toEqual({
      apprentice: 2,
      guru: 0,
      master: 0,
      enlightened: 0,
      burned: 1,
    });
  });
});
