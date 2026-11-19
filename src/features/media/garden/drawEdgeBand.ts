import { EdgeSample } from './treeGeometry';
import { formatCap, formatLine, formatMove } from './treeShapePaths';

export function drawEdgeBand(edges: EdgeSample[]) {
  const base = edges[0];
  const end = edges[edges.length - 1];
  return [
    formatMove(base.left),
    formatLine(edges.slice(1).map(({ left }) => left)),
    formatCap(end, end.right),
    formatLine(
      edges
        .toReversed()
        .slice(1)
        .map(({ right }) => right),
    ),
    formatCap(base, base.left),
    'Z',
  ].join(' ');
}
