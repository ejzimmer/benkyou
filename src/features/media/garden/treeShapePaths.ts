import { EdgeSample, Point, roundCoordinate } from './treeGeometry';
import { TreeShape } from './treeLayout';

const interpolatePoint = (from: Point, to: Point, t: number) => ({
  x: roundCoordinate(from.x + (to.x - from.x) * t),
  y: roundCoordinate(from.y + (to.y - from.y) * t),
});

export function cutEdges(edges: EdgeSample[], amount: number) {
  if (amount >= 1) {
    return edges;
  }
  const index = edges.findIndex(({ at }) => at >= amount);
  const before = edges[index - 1];
  const after = edges[index];
  const t = (amount - before.at) / (after.at - before.at);
  return [
    ...edges.slice(0, index),
    {
      at: amount,
      left: interpolatePoint(before.left, after.left, t),
      right: interpolatePoint(before.right, after.right, t),
    },
  ];
}

const formatPoint = ({ x, y }: Point) => `${x} ${y}`;

export const formatLine = (points: Point[]) =>
  `L${points.map(formatPoint).join(' ')}`;

export const formatCap = ({ left, right }: EdgeSample, to: Point) => {
  const radius = roundCoordinate(
    Math.hypot(left.x - right.x, left.y - right.y) / 2,
  );
  return `A${radius} ${radius} 0 0 0 ${formatPoint(to)}`;
};

type ShapeOutline = Pick<TreeShape, 'edges' | 'growth'>;

export const formatMove = (point: Point) => `M${formatPoint(point)}`;

export function drawShapeOutline(
  { edges, growth }: ShapeOutline,
  amount: number,
) {
  const cut = cutEdges(edges, amount);
  const base = cut[0];
  const end = cut[cut.length - 1];
  const lefts = cut.map(({ left }) => left);
  const rights = cut.map(({ right }) => right);
  const isWhole = amount >= 1;
  const isTrunk = growth.type === 'trunk';

  if (!isWhole && !isTrunk) {
    return [
      formatMove(base.left),
      formatLine(lefts.slice(1)),
      formatMove(base.right),
      formatLine(rights.slice(1)),
    ].join(' ');
  }
  if (!isWhole) {
    return [
      formatMove(end.right),
      formatLine(rights.reverse().slice(1)),
      formatCap(base, base.left),
      formatLine(lefts.slice(1)),
    ].join(' ');
  }
  return [
    formatMove(base.left),
    formatLine(lefts.slice(1)),
    formatCap(end, end.right),
    formatLine(rights.reverse().slice(1)),
    ...(isTrunk ? [formatCap(base, base.left), 'Z'] : []),
  ].join(' ');
}

export function drawShapeFill(edges: EdgeSample[], amount: number) {
  const cut = cutEdges(edges, amount);
  const base = cut[0];
  const end = cut[cut.length - 1];
  return [
    formatMove(base.left),
    formatLine(cut.slice(1).map(({ left }) => left)),
    amount >= 1 ? formatCap(end, end.right) : formatLine([end.right]),
    formatLine(
      cut
        .map(({ right }) => right)
        .reverse()
        .slice(1),
    ),
    formatCap(base, base.left),
    'Z',
  ].join(' ');
}
