import { describe, it, expect } from 'vitest';
import { createCactusLayout } from './cactusLayout';
import { measureShapeGrowth } from './treeGrowth';
import { Video, YoutubeChannel } from './types';

const createVideo = (id: string, lengthInSeconds?: number): Video => ({
  id,
  url: `https://youtu.be/${id}`,
  lengthInSeconds,
  lookups: 0,
  aiQuestions: 0,
});

const createChannel = (
  videos: Video[],
  overrides: Partial<YoutubeChannel> = {},
): YoutubeChannel => ({
  id: 'hugo',
  type: 'youtube',
  name: 'HugoDécrypte',
  language: 'french',
  videos: Object.fromEntries(videos.map((video) => [video.id, video])),
  ...overrides,
});

const findShape = (channel: YoutubeChannel, key: string) =>
  createCactusLayout(channel).shapes.find((shape) => shape.key === key)!;

const measureHeight = ({ edges }: ReturnType<typeof findShape>) => {
  const ys = edges.flatMap(({ left, right }) => [left.y, right.y]);
  return Math.max(...ys) - Math.min(...ys);
};

describe('createCactusLayout', () => {
  describe('with several videos', () => {
    const channel = createChannel([
      createVideo('v1', 600),
      createVideo('v2', 3600),
      createVideo('v3', 600),
    ]);

    it('grows an arm for each video, in the order they were added', () => {
      expect(
        createCactusLayout(channel).shapes.flatMap(({ key, growth }) =>
          growth.type === 'branch' ? [[key, growth.level]] : [],
        ),
      ).toEqual([
        ['v1-arm', 0],
        ['v2-arm', 1],
        ['v3-arm', 2],
      ]);
    });

    it('grows the same cactus every time', () => {
      expect(createCactusLayout(channel)).toEqual(createCactusLayout(channel));
    });

    it('alternates the arms between the two sides of the trunk', () => {
      const sides = ['v1-arm', 'v2-arm', 'v3-arm'].map((key) =>
        Math.sign(findShape(channel, key).edges.at(-1)!.left.x),
      );

      expect(sides).toEqual([sides[0], -sides[0], sides[0]]);
    });

    it('grows taller arms for longer videos', () => {
      expect(measureHeight(findShape(channel, 'v2-arm'))).toBeGreaterThan(
        measureHeight(findShape(channel, 'v1-arm')),
      );
    });

    describe('when only the first video has been started', () => {
      it('grows the trunk up past the top of the first arm', () => {
        const trunk = findShape(channel, 'trunk');
        const arm = findShape(channel, 'v1-arm');
        const armTop = Math.min(arm.edges[0].left.y, arm.edges[0].right.y);
        const grown = measureShapeGrowth(trunk.growth, [0.5, 0, 0]);
        const trunkTop = trunk.edges.find(({ at }) => at >= grown)!.left.y;

        expect(trunkTop).toBeLessThan(armTop);
      });
    });

    describe('when the last video has been started', () => {
      it('grows the whole trunk', () => {
        const trunk = findShape(channel, 'trunk');

        expect(measureShapeGrowth(trunk.growth, [1, 1, 0.1])).toBe(1);
      });
    });
  });

  describe('with no videos', () => {
    it('is just a trunk', () => {
      expect(
        createCactusLayout(createChannel([])).shapes.map(({ key }) => key),
      ).toEqual(['trunk']);
    });
  });
});
