import { cutEdges } from './treeShapePaths';
import { EdgeSample } from './treeGeometry';

const reverseEdges = (edges: EdgeSample[]) =>
  edges
    .toReversed()
    .map(({ at, left, right }) => ({ at: 1 - at, left, right }));

export function sliceEdges(edges: EdgeSample[], from: number, to: number) {
  const upToEnd = cutEdges(edges, to);
  if (from <= 0) return upToEnd;
  return reverseEdges(cutEdges(reverseEdges(upToEnd), 1 - from));
}
