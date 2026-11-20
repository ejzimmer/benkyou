import { findBranchPoint } from './findBranchPoint';
import { EdgeSample } from './treeGeometry';
import { toRadians } from '../../../journal/toRadians';

const FOOT_SINK = 0.4;

export function findUpSide(edges: EdgeSample[]) {
  const { angle } = findBranchPoint(edges, 0);
  return Math.cos(toRadians(angle)) > 0 ? -1 : 1;
}

export function findBeetlePose(
  edges: EdgeSample[],
  at: number,
  forward: boolean,
  isUnderside = false,
) {
  const point = findBranchPoint(edges, at);
  const angle = toRadians(point.angle);
  const side = isUnderside ? -findUpSide(edges) : findUpSide(edges);
  const lift = (point.width / 2 - FOOT_SINK) * side;
  return {
    x: point.x - Math.sin(angle) * lift,
    y: point.y + Math.cos(angle) * lift,
    heading: forward ? point.angle : point.angle + 180,
    isUpsideDown: forward ? side === 1 : side === -1,
  };
}
