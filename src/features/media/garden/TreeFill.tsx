import { GrownShape } from './treeGrowth';
import { drawShapeFill } from './treeShapePaths';

type TreeFillProps = { shapes: GrownShape[] };

export function TreeFill({ shapes }: TreeFillProps) {
  return (
    <g className="tree-fill">
      {shapes.map((shape) => (
        <path key={shape.key} d={drawShapeFill(shape.edges, shape.amount)} />
      ))}
    </g>
  );
}
