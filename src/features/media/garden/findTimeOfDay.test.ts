import { describe, it, expect } from 'vitest';
import { findTimeOfDay } from './findTimeOfDay';

const melbourne = { latitude: -37.81, longitude: 144.96 };

describe('findTimeOfDay', () => {
  describe('in Melbourne on 23 October 2026', () => {
    it.each([
      ['3am', '2026-10-22T16:00:00Z', 'night'],
      ['just after sunrise', '2026-10-22T19:30:00Z', 'dawn'],
      ['noon', '2026-10-23T01:00:00Z', 'day'],
      ['just before sunset', '2026-10-23T08:30:00Z', 'dusk'],
      ['10pm', '2026-10-23T11:00:00Z', 'night'],
    ])('calls %s %s', (_, time, timeOfDay) => {
      expect(findTimeOfDay(Date.parse(time), melbourne)).toBe(timeOfDay);
    });
  });
});
