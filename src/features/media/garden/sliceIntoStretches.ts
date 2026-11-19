import { sliceEdges } from './sliceEdges';
import { EdgeSample } from './treeGeometry';

const MIN_STRETCH = 0.02;

export function sliceIntoStretches(
  edges: EdgeSample[],
  ends: { key: string; at: number }[],
) {
  return ends.map(({ key, at }, index) => {
    const from = index === 0 ? 0 : ends[index - 1].at;
    return {
      key,
      edges: sliceEdges(edges, from, Math.max(at, from + MIN_STRETCH)),
    };
  });
}
