import { getItemsInAddedOrder } from './lists';
import { createSeededRandom } from './seededRandom';
import { Point, traceTaperedEdges } from './treeGeometry';
import {
  measureBounds,
  OUTLINE_WIDTH,
  TreeLayout,
  TreeShape,
} from './treeLayout';
import { Video, YoutubeChannel } from './types';

const TRUNK_WIDTHS: [number, number] = [34, 30];
const ARM_WIDTHS: [number, number] = [22, 20];
const FIRST_ARM = 46;
const ARM_SPACING = 40;
const CROWN_HEIGHT = 46;
const TRUNK_SWAY = 3;
const DEFAULT_MINUTES = 20;
const LONGEST_MINUTES = 60;
const ARM_OVERLAP = 5;

const measureRise = ({ lengthInSeconds }: Video) =>
  22 +
  Math.min((lengthInSeconds ?? DEFAULT_MINUTES * 60) / 60, LONGEST_MINUTES) *
    0.42;

function createTrunkPoints(armCount: number, random: () => number) {
  const sway = () => (random() - 0.5) * TRUNK_SWAY;
  const attachPoints = Array.from({ length: armCount }, (_, arm) => ({
    x: sway(),
    y: -(FIRST_ARM + arm * ARM_SPACING),
  }));
  const top = FIRST_ARM + (armCount - 1) * ARM_SPACING + CROWN_HEIGHT;
  return [{ x: 0, y: 0 }, ...attachPoints, { x: sway(), y: -top }];
}

function createTrunk(points: Point[], armCount: number): TreeShape {
  const edges = traceTaperedEdges(points, TRUNK_WIDTHS);
  const [armWidth] = ARM_WIDTHS;
  const levelEnds = points.slice(1, -1).map(({ y }, arm) => {
    if (arm === armCount - 1) return 1;
    const armTop = y - armWidth / 2 - OUTLINE_WIDTH * 2;
    return edges.find(({ left, right }) => (left.y + right.y) / 2 <= armTop)!
      .at;
  });
  return { key: 'trunk', edges, growth: { type: 'trunk', levelEnds } };
}

function growArm(
  video: Video,
  level: number,
  attach: Point,
  side: number,
  random: () => number,
): TreeShape {
  const [trunkWidth] = TRUNK_WIDTHS;
  const reach = 32 + random() * 8;
  const rise = measureRise(video);
  const start = {
    x: attach.x + side * (trunkWidth / 2 - ARM_OVERLAP),
    y: attach.y,
  };
  const elbow = attach.x + side * reach;
  const points = [
    start,
    { x: attach.x + side * reach * 0.62, y: attach.y + 2 },
    { x: elbow, y: attach.y - 9 },
    { x: elbow, y: attach.y - rise },
  ];
  return {
    key: `${video.id}-arm`,
    edges: traceTaperedEdges(points, ARM_WIDTHS),
    growth: { type: 'branch', level, start: 0, end: 1 },
  };
}

export function createCactusLayout(channel: YoutubeChannel): TreeLayout {
  const videos = getItemsInAddedOrder(channel.videos);
  const random = createSeededRandom(channel.id);
  const firstSide = random() < 0.5 ? -1 : 1;
  const trunkPoints = createTrunkPoints(videos.length, random);

  const arms = videos.map((video, level) =>
    growArm(
      video,
      level,
      trunkPoints[level + 1],
      level % 2 ? -firstSide : firstSide,
      createSeededRandom(`${channel.id}-${video.id}`),
    ),
  );

  const shapes = [createTrunk(trunkPoints, videos.length), ...arms];

  return { shapes, bounds: measureBounds(shapes) };
}
