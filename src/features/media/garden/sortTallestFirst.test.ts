import { describe, it, expect } from 'vitest';
import { sortTallestFirst } from './sortTallestFirst';
import { Video, YoutubeChannel } from './types';

function createChannel(id: string, videoCount: number): YoutubeChannel {
  const videos: Record<string, Video> = {};
  for (let number = 0; number < videoCount; number++) {
    videos[`v${number}`] = {
      id: `v${number}`,
      createdAt: `2026-09-${String(number + 1).padStart(2, '0')}T09:00:00Z`,
      url: '',
      lengthInSeconds: 600,
      lookups: 0,
      aiQuestions: 0,
    };
  }
  return { id, type: 'youtube', name: id, language: 'japanese', videos };
}

describe('sortTallestFirst', () => {
  describe('when plants have different heights', () => {
    it('puts the tallest first', () => {
      const short = createChannel('short', 1);
      const tall = createChannel('tall', 8);
      const medium = createChannel('medium', 4);

      expect(sortTallestFirst([short, tall, medium])).toEqual([
        tall,
        medium,
        short,
      ]);
    });
  });

  describe('when plants are the same height', () => {
    it('keeps them in their original order', () => {
      const first = createChannel('first', 0);
      const second = createChannel('second', 0);

      expect(sortTallestFirst([first, second])).toEqual([first, second]);
    });
  });
});
