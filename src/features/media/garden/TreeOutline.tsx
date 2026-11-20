import { GrownShape } from './treeGrowth';
import { OUTLINE_WIDTH } from './treeLayout';
import { drawShapeOutline } from './treeShapePaths';

type TreeOutlineProps = { shapes: GrownShape[]; width?: number };

export function TreeOutline({
  shapes,
  width = OUTLINE_WIDTH,
}: TreeOutlineProps) {
  return (
    <g className="tree-outline">
      {shapes.map((shape) => (
        <path
          key={shape.key}
          d={drawShapeOutline(shape, shape.amount)}
          strokeWidth={width * 2}
        />
      ))}
    </g>
  );
}
