import { describe, it, expect } from 'vitest';
import { countSignposts } from './signposts';

describe('countSignposts', () => {
  describe('a short name', () => {
    it('stands on one post', () => {
      expect(countSignposts('Lupin')).toBe(1);
    });
  });

  describe('a long name', () => {
    it('stands on two posts', () => {
      expect(countSignposts('Les Misérables')).toBe(2);
    });
  });

  describe('a japanese name', () => {
    it('counts each character as twice as wide', () => {
      expect(countSignposts('よつばと！')).toBe(1);
      expect(countSignposts('チェンソーマン')).toBe(2);
    });
  });
});
