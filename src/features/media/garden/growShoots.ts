import {
  BranchPoint,
  findBranchPoint,
  measureBranchLength,
} from './findBranchPoint';
import { createSeededRandom } from './seededRandom';
import {
  EdgeSample,
  findPointAlong,
  Point,
  traceTaperedEdges,
  turnToward,
  walkPath,
} from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { ShootStyle } from './treeSpecies';
import { toRadians } from '../shared/toRadians';

export type Leaf = Point & { angle: number };

export type Shoot = {
  key: string;
  edges: EdgeSample[];
  leaves: Leaf[];
};

const FIRST_SHOOT = 10;
const LIMB_TIP_GAP = 4;
const SHOOT_SEGMENTS = 4;
const FIRST_LEAF = 0.25;
const ARCH_SEGMENTS = 6;
const ARCH_WOBBLE = 10;

export function findShootBase(point: BranchPoint, side: number): Point {
  const offset = point.width * 0.35 * side;
  return {
    x: point.x - Math.sin(toRadians(point.angle)) * offset,
    y: point.y + Math.cos(toRadians(point.angle)) * offset,
  };
}

export function placeLeaves(
  points: Point[],
  length: number,
  { leafGap, leafSplay, tuft }: ShootStyle,
  [from, to]: [number, number] = [FIRST_LEAF, 1],
): Leaf[] {
  const leaves: Leaf[] = [];
  let side = 1;
  for (let along = from * length; along < to * length - 2; along += leafGap) {
    const { point, angle } = findPointAlong(points, along / length);
    leaves.push({ ...point, angle: angle + leafSplay * side });
    side = -side;
  }
  if (to < 1) return leaves;
  const { point: tip, angle: tipAngle } = findPointAlong(points, 1);
  return [
    ...leaves,
    ...tuft.map((turn) => ({ ...tip, angle: tipAngle + turn })),
  ];
}

const dressShoot = (
  points: Point[],
  length: number,
  style: ShootStyle,
  leafRanges: [number, number][],
) => ({
  edges: traceTaperedEdges(points, style.widths),
  leaves: leafRanges.flatMap((range) =>
    placeLeaves(points, length, style, range),
  ),
});

export function growShoot(
  base: Point,
  angle: number,
  length: number,
  style: ShootStyle,
  random: () => number,
  leafRanges: [number, number][] = [[FIRST_LEAF, 1]],
) {
  const points = walkPath(
    base,
    angle,
    length,
    SHOOT_SEGMENTS,
    (direction) => turnToward(direction, style.bendToward, style.bend),
    random,
  );
  return dressShoot(points, length, style, leafRanges);
}

export function growArchingShoot(
  base: Point,
  angle: number,
  length: number,
  arch: number,
  style: ShootStyle,
  random: () => number,
  leafRanges: [number, number][],
) {
  const turn = arch / (ARCH_SEGMENTS - 1);
  const points = walkPath(
    base,
    angle - arch / 2,
    length,
    ARCH_SEGMENTS,
    (direction) => direction + turn + (random() - 0.5) * ARCH_WOBBLE,
    random,
  );
  return dressShoot(points, length, style, leafRanges);
}

export function spaceShootsBetween(
  start: number,
  end: number,
  flowers: number[],
  spacing: number,
) {
  const anchors = flowers
    .filter((flower) => flower > start && flower < end)
    .toSorted((a, b) => a - b);
  const filledGaps = [start, ...anchors].slice(0, -1).flatMap((from, index) => {
    const to = anchors[index];
    const count = Math.max(0, Math.round((to - from) / spacing) - 1);
    return Array.from(
      { length: count },
      (_, slot) => from + ((to - from) * (slot + 1)) / (count + 1),
    );
  });
  const lastAnchor = anchors.at(-1);
  const tail: number[] = [];
  for (
    let along = lastAnchor === undefined ? start : lastAnchor + spacing;
    along < end;
    along += spacing
  ) {
    tail.push(along);
  }
  return [...(anchors.length ? [start] : []), ...filledGaps, ...tail];
}

export function growShoots(
  shape: GrownShape,
  style: ShootStyle,
  flowers: number[] = [],
): Shoot[] {
  const length = measureBranchLength(shape.edges);
  const isLimb = shape.key.endsWith('-limb');
  const end = shape.amount * length - (isLimb ? LIMB_TIP_GAP : 0);
  const random = createSeededRandom(`${shape.key}-shoots`);
  let side = random() < 0.5 ? 1 : -1;

  const positions = spaceShootsBetween(
    FIRST_SHOOT,
    end,
    flowers.map((flower) => flower * length),
    style.spacing,
  );
  const shoots: Shoot[] = [];
  for (const along of positions) {
    const point = findBranchPoint(shape.edges, along / length);
    const [shortest, longest] = style.length;
    const shootLength = shortest + random() * (longest - shortest);
    shoots.push({
      key: `${shape.key}-shoot-${shoots.length}`,
      ...growShoot(
        findShootBase(point, side),
        point.angle + style.splay * side,
        shootLength,
        style,
        random,
      ),
    });
    side = -side;
  }
  return shoots;
}
