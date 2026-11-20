import { EdgeSample, Point } from './treeGeometry';

export type BranchPoint = Point & { angle: number; width: number };

const findMiddle = ({ left, right }: EdgeSample) => ({
  x: (left.x + right.x) / 2,
  y: (left.y + right.y) / 2,
});

const measureWidth = ({ left, right }: EdgeSample) =>
  Math.hypot(left.x - right.x, left.y - right.y);

export function findBranchPoint(edges: EdgeSample[], at: number): BranchPoint {
  const index = Math.min(
    edges.length - 1,
    Math.max(
      1,
      edges.findIndex((sample) => sample.at >= at),
    ),
  );
  const before = edges[index - 1];
  const after = edges[index];
  const t = Math.min(
    1,
    Math.max(0, (at - before.at) / (after.at - before.at || 1)),
  );
  const from = findMiddle(before);
  const to = findMiddle(after);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    width:
      measureWidth(before) + (measureWidth(after) - measureWidth(before)) * t,
    angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
  };
}

export function measureBranchLength(edges: EdgeSample[]) {
  return edges.slice(1).reduce((length, sample, index) => {
    const from = findMiddle(edges[index]);
    const to = findMiddle(sample);
    return length + Math.hypot(to.x - from.x, to.y - from.y);
  }, 0);
}
