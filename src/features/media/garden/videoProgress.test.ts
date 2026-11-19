import { describe, it, expect } from 'vitest';
import { readVideoProgress } from './videoProgress';
import { Video } from './types';

const video: Video = {
  id: 'v1',
  url: 'https://youtu.be/1',
  lengthInSeconds: 1200,
  lookups: 0,
  aiQuestions: 0,
};

describe('readVideoProgress', () => {
  describe('when nothing says how far I got', () => {
    it('assumes I watched all of it', () => {
      expect(readVideoProgress(video)).toBe(1);
    });

    describe('and the video has no length', () => {
      it('assumes I watched all of it', () => {
        expect(
          readVideoProgress({ ...video, lengthInSeconds: undefined }),
        ).toBe(1);
      });
    });
  });

  describe('when the video is marked done', () => {
    it('has finished it, whatever time it was up to', () => {
      expect(
        readVideoProgress({ ...video, status: 'done', upToInSeconds: 300 }),
      ).toBe(1);
    });
  });

  describe('when the video is marked not started', () => {
    it('has not watched any of it', () => {
      expect(readVideoProgress({ ...video, status: 'not-started' })).toBe(0);
    });
  });

  describe('when I am part way through the video', () => {
    it('has watched up to that point', () => {
      expect(readVideoProgress({ ...video, upToInSeconds: 300 })).toBe(0.25);
    });

    describe('and the time is past the end', () => {
      it('stops at the whole video', () => {
        expect(readVideoProgress({ ...video, upToInSeconds: 1500 })).toBe(1);
      });
    });

    describe('and the video has no length', () => {
      it('assumes I watched all of it', () => {
        expect(
          readVideoProgress({
            ...video,
            lengthInSeconds: undefined,
            upToInSeconds: 300,
          }),
        ).toBe(1);
      });
    });
  });
});
