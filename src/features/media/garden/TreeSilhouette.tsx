import { TreeLayout } from './treeLayout';
import { drawShapeFill } from './treeShapePaths';

type TreeSilhouetteProps = { layout: TreeLayout };

export function TreeSilhouette({ layout }: TreeSilhouetteProps) {
  return (
    <g className="tree-silhouette">
      {layout.shapes.map((shape) => (
        <path key={shape.key} d={drawShapeFill(shape.edges, 1)} />
      ))}
    </g>
  );
}
