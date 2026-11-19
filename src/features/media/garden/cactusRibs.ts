import { EdgeSample, Point, roundCoordinate } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { cutEdges } from './treeShapePaths';

const TRUNK_RIBS = [-0.54, 0, 0.54];
const ARM_RIBS = [-0.44, 0.44];
const ARM_BASE_GAP = 10;
const TIP_GAP = 6;
const AREOLE_SPACING = 8;
const SPINE_SPACING = 7;

export type Spine = { base: Point; direction: Point };

const roundPoint = ({ x, y }: Point) => ({
  x: roundCoordinate(x),
  y: roundCoordinate(y),
});

const blend = (from: Point, to: Point, t: number) => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

function measureDistances(points: Point[]) {
  return points.reduce<number[]>(
    (totals, point, index) => [
      ...totals,
      index === 0
        ? 0
        : totals[index - 1] +
          Math.hypot(
            point.x - points[index - 1].x,
            point.y - points[index - 1].y,
          ),
    ],
    [],
  );
}

function placeEvenly(
  points: Point[],
  spacing: number,
  from: number,
  to: number,
) {
  const distances = measureDistances(points);
  const end = distances[distances.length - 1] - to;
  const places: { point: Point; index: number }[] = [];
  for (let distance = from; distance <= end; distance += spacing) {
    const index = Math.max(
      1,
      distances.findIndex((total) => total >= distance),
    );
    const t =
      (distance - distances[index - 1]) /
      (distances[index] - distances[index - 1] || 1);
    places.push({ point: blend(points[index - 1], points[index], t), index });
  }
  return places;
}

const findMiddle = ({ left, right }: EdgeSample) => blend(left, right, 0.5);

const isWhole = (shape: GrownShape) => shape.amount >= 1;

const measureBaseGap = (shape: GrownShape) =>
  shape.growth.type === 'trunk' ? 0 : ARM_BASE_GAP;

export function traceRibs(shape: GrownShape) {
  const edges = cutEdges(shape.edges, shape.amount);
  const offsets = shape.growth.type === 'trunk' ? TRUNK_RIBS : ARM_RIBS;
  return offsets.map((offset) => {
    const rib = edges.map(({ left, right }) =>
      blend(right, left, (1 + offset) / 2),
    );
    const distances = measureDistances(rib);
    const total = distances[distances.length - 1];
    const end = isWhole(shape) ? total - TIP_GAP : total;
    return rib
      .filter(
        (_, index) =>
          distances[index] >= measureBaseGap(shape) && distances[index] <= end,
      )
      .map(roundPoint);
  });
}

export function placeAreoles(rib: Point[]) {
  return placeEvenly(rib, AREOLE_SPACING, AREOLE_SPACING / 2, 0).map(
    ({ point }) => roundPoint(point),
  );
}

export function placeEdgeSpines(shape: GrownShape, reach: number): Spine[] {
  const edges = cutEdges(shape.edges, shape.amount);
  const middles = edges.map(findMiddle);
  const tipGap = isWhole(shape) ? TIP_GAP : 0;
  return placeEvenly(
    middles,
    SPINE_SPACING,
    measureBaseGap(shape) + 4,
    tipGap,
  ).flatMap(({ point, index }) => {
    const edge = edges[index];
    const middle = findMiddle(edge);
    const halfWidth =
      Math.hypot(edge.left.x - edge.right.x, edge.left.y - edge.right.y) / 2;
    return [edge.left, edge.right].map((side) => {
      const direction = {
        x: (side.x - middle.x) / halfWidth,
        y: (side.y - middle.y) / halfWidth,
      };
      return {
        base: roundPoint({
          x: point.x + direction.x * (halfWidth + reach),
          y: point.y + direction.y * (halfWidth + reach),
        }),
        direction,
      };
    });
  });
}
