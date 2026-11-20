import { createZigzagPoints } from './createZigzagPoints';
import { getItemsByNumber } from './lists';
import { Point, traceEdges, traceTaperedEdges } from './treeGeometry';
import { TreeLayout, TreeShape } from './treeLayout';
import { Episode, Season, TvSeries } from './types';

export type Pergola = {
  posts: number[];
  beamTop: number;
  beamBottom: number;
  left: number;
  right: number;
  trunkCrossings: [top: number, bottom: number][];
};

type VineLayout = TreeLayout & { pergola: Pergola };

export const BAY_WIDTH = 132;
export const BEAM_HEIGHT = 12;
export const RAFTER_HEIGHT = 10;
const BEAM_OVERHANG = 22;
const POST_INSET = 10;
const TWIST_WIDTH = 8.5;
const TWIST_LENGTH = 58;
const ROW_GAP = 46;
const FIRST_ROW_DROP = 14;
const HANG_ROOM = 56;
const EPISODE_SPACING = 24;
const BRANCH_LEAD = 14;
const SHOOT_LENGTH = 24;
const DEFAULT_EPISODE_SECONDS = 45 * 60;
const TRUNK_WIDTH = 3.5;
const BRANCH_WIDTHS: [number, number] = [3.4, 2.6];
const SHOOT_WIDTHS: [number, number] = [2, 1.4];
const TRUNK_SAMPLE_SPACING = 2;
const BRANCH_SAMPLE_SPACING = 6;
const MARGIN = 2;
const LEAF_ROOM = 10;

const measureTrunkWidth =
  (taperFrom: number, end: number) =>
  (_at: number, { x }: Point) =>
    x <= taperFrom
      ? TRUNK_WIDTH
      : (TRUNK_WIDTH * Math.max(0, end - x)) / (end - taperFrom);

const measureLength = (points: Point[]) =>
  points
    .slice(1)
    .reduce(
      (total, point, index) =>
        total +
        Math.hypot(point.x - points[index].x, point.y - points[index].y),
      0,
    );

const thinPoints = (points: Point[], spacing: number) => [
  ...points.filter((_, index) => index % spacing === 0),
  ...(points.length % spacing === 1 ? [] : [points[points.length - 1]]),
];

const findNearestPoint = (points: Point[], target: Point) =>
  points.reduce((nearest, point) =>
    Math.hypot(point.x - target.x, point.y - target.y) <
    Math.hypot(nearest.x - target.x, nearest.y - target.y)
      ? point
      : nearest,
  );

function findPointAtLength(points: Point[], length: number) {
  let travelled = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const step = Math.hypot(to.x - from.x, to.y - from.y);
    if (travelled + step >= length) {
      const t = (length - travelled) / step;
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
    }
    travelled += step;
  }
  return points[points.length - 1];
}

const measureBranchLength = (episodeCount: number) =>
  Math.max(1, episodeCount) * EPISODE_SPACING + BRANCH_LEAD;

const findAttachLengths = (episodeCount: number, length: number) =>
  Array.from(
    { length: episodeCount },
    (_, index) =>
      BRANCH_LEAD / 2 +
      ((length - BRANCH_LEAD / 2) * (index + 0.7)) / episodeCount,
  );

function planBranch(bay: number, episodeCount: number) {
  const post = bay * BAY_WIDTH;
  return createZigzagPoints({
    start: { x: post + POST_INSET, y: 2 },
    left: post + POST_INSET,
    right: post + BAY_WIDTH - POST_INSET,
    firstRowY: BEAM_HEIGHT / 2 + FIRST_ROW_DROP,
    rowGap: ROW_GAP,
    length: measureBranchLength(episodeCount),
  });
}

function createTrunk(beamMid: number, beamBottom: number, right: number) {
  const points: Point[] = [];
  const trunkCrossings: [number, number][] = [];
  let crossingBottom: number | undefined;
  for (let y = 0; y >= beamBottom + 6; y -= 2) {
    const phase = (-y / TWIST_LENGTH) * Math.PI * 2;
    points.push({ x: Math.sin(phase) * TWIST_WIDTH, y });
    const isBehind = Math.cos(phase) < 0;
    if (isBehind && crossingBottom === undefined) crossingBottom = y;
    if (!isBehind && crossingBottom !== undefined) {
      trunkCrossings.push([y, crossingBottom]);
      crossingBottom = undefined;
    }
  }
  const top = points[points.length - 1];
  for (let x = top.x + 2; x <= right; x += 2) {
    const along = x - top.x;
    const rise = Math.min(1, along / 22);
    points.push({
      x,
      y: top.y + (beamMid + 1 - top.y) * rise + Math.sin(along / 18) * 4 * rise,
    });
  }
  return { points: thinPoints(points, TRUNK_SAMPLE_SPACING), trunkCrossings };
}

function growShoot(
  season: Season,
  episode: Episode,
  level: number,
  attach: Point,
  meanSeconds: number,
): TreeShape {
  const length =
    (SHOOT_LENGTH * (episode.lengthInSeconds ?? meanSeconds)) / meanSeconds;
  const points = Array.from({ length: 5 }, (_, index) => {
    const angle = ((76 + index * 4) * Math.PI) / 180;
    return { angle, step: (length / 4) * index };
  }).map(({ angle, step }) => ({
    x: attach.x + Math.cos(angle) * step,
    y: attach.y + Math.sin(angle) * step,
  }));
  return {
    key: `${season.id}-${episode.id}-shoot`,
    edges: traceTaperedEdges(points, SHOOT_WIDTHS),
    growth: { type: 'branch', level, start: 0, end: 1 },
  };
}

function growSeason(
  season: Season,
  episodes: Episode[],
  firstLevel: number,
  points: Point[],
) {
  const length = measureLength(points);
  const attachLengths = findAttachLengths(episodes.length, length);
  const branch: TreeShape = {
    key: `${season.id}-branch`,
    edges: traceTaperedEdges(
      thinPoints(points, BRANCH_SAMPLE_SPACING),
      BRANCH_WIDTHS,
    ),
    growth: {
      type: 'stem',
      firstLevel,
      levelEnds: attachLengths.map((at) => Math.min(1, (at + 2) / length)),
    },
  };
  const knownLengths = episodes.flatMap(({ lengthInSeconds }) =>
    lengthInSeconds ? [lengthInSeconds] : [],
  );
  const meanSeconds = knownLengths.length
    ? knownLengths.reduce((total, seconds) => total + seconds, 0) /
      knownLengths.length
    : DEFAULT_EPISODE_SECONDS;
  const shoots = episodes.map((episode, index) =>
    growShoot(
      season,
      episode,
      firstLevel + index,
      findPointAtLength(points, attachLengths[index]),
      meanSeconds,
    ),
  );
  return [branch, ...shoots];
}

export function getVineEpisodes(series: TvSeries) {
  return getItemsByNumber(series.seasons).map((season) => ({
    season,
    episodes: getItemsByNumber(season.episodes),
  }));
}

export function createVineLayout(series: TvSeries): VineLayout {
  const seasons = getVineEpisodes(series);
  const bays = Math.max(1, seasons.length);
  const posts = Array.from({ length: bays + 1 }, (_, bay) => bay * BAY_WIDTH);
  const plans = seasons.map(({ episodes }, bay) =>
    planBranch(bay, episodes.length),
  );
  const rows = Math.max(1, ...plans.map((plan) => plan.rows));
  const beamBottom = -(HANG_ROOM + (rows - 1) * ROW_GAP + FIRST_ROW_DROP);
  const beamTop = beamBottom - BEAM_HEIGHT;
  const beamMid = beamBottom - BEAM_HEIGHT / 2;
  const right = posts[bays] + BEAM_OVERHANG;
  const left = -BEAM_OVERHANG;
  const episodeCount = seasons.reduce(
    (total, { episodes }) => total + episodes.length,
    0,
  );

  const trunkEnd = posts[bays] + POST_INSET;
  const trunk = createTrunk(beamMid, beamBottom, trunkEnd);
  const trunkShape: TreeShape = {
    key: 'trunk',
    edges: traceEdges(
      trunk.points,
      measureTrunkWidth(posts[bays - 1] + POST_INSET, trunkEnd),
    ),
    growth: { type: 'trunk', levelEnds: Array(episodeCount).fill(1) },
  };

  let firstLevel = 0;
  const seasonShapes = seasons.flatMap(({ season, episodes }, bay) => {
    const [start, ...rest] = plans[bay].points.map(({ x, y }) => ({
      x,
      y: y + beamMid,
    }));
    const points = [findNearestPoint(trunk.points, start), ...rest];
    const shapes = growSeason(season, episodes, firstLevel, points);
    firstLevel += episodes.length;
    return shapes;
  });

  const top = beamTop - RAFTER_HEIGHT - LEAF_ROOM;
  return {
    shapes: [trunkShape, ...seasonShapes],
    bounds: {
      x: left - MARGIN,
      y: top,
      width: right - left + MARGIN * 2,
      height: MARGIN - top,
    },
    pergola: {
      posts,
      beamTop,
      beamBottom,
      left,
      right,
      trunkCrossings: trunk.trunkCrossings,
    },
  };
}
