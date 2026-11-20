import { describe, it, expect } from 'vitest';
import { placeCrowns } from './placeCrowns';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { Video, YoutubeChannel } from './types';

const createArm = (key: string, amount: number): GrownShape => ({
  key,
  amount,
  growth: { type: 'branch', level: 0, start: 0, end: 1 },
  edges: Array.from({ length: 11 }, (_, index): EdgeSample => ({
    at: index / 10,
    left: { x: -10, y: -index * 10 },
    right: { x: 10, y: -index * 10 },
  })),
});

const createVideo = (id: string, understood?: number): Video => ({
  id,
  url: `https://youtu.be/${id}`,
  lookups: 0,
  aiQuestions: 0,
  understood,
});

const createChannel = (videos: Video[]): YoutubeChannel => ({
  id: 'hugo',
  type: 'youtube',
  name: 'HugoDécrypte',
  language: 'french',
  videos: Object.fromEntries(videos.map((video) => [video.id, video])),
});

describe('placeCrowns', () => {
  describe('for a video I have said how much of I understood', () => {
    const video = createVideo('v1', 40);
    const crowns = placeCrowns(createChannel([video]), [
      createArm('v1-arm', 0.5),
    ]);

    it('puts a crown on the grown tip of its arm', () => {
      expect(crowns).toEqual([
        { key: 'v1-crown', video, x: 0, y: -58, angle: -90, understood: 40 },
      ]);
    });
  });

  describe('for a video without an understood amount', () => {
    it('puts no crown on its arm', () => {
      expect(
        placeCrowns(createChannel([createVideo('v1')]), [
          createArm('v1-arm', 1),
        ]),
      ).toEqual([]);
    });
  });

  describe('for a video whose arm has not started growing', () => {
    it('has nowhere to put a crown', () => {
      expect(placeCrowns(createChannel([createVideo('v1', 40)]), [])).toEqual(
        [],
      );
    });
  });
});
