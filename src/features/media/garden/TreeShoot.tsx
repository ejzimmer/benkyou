import { Shoot } from './growShoots';
import { TreeLeaf } from './TreeLeaf';
import { drawShapeFill } from './treeShapePaths';
import { PrintSeries } from './types';

type TreeShootProps = {
  shoot: Pick<Shoot, 'edges' | 'leaves'>;
  type: PrintSeries['type'];
};

export function TreeShoot({ shoot, type }: TreeShootProps) {
  return (
    <g>
      <path className="tree-shoot" d={drawShapeFill(shoot.edges, 1)} />
      {shoot.leaves.map((leaf, index) => (
        <TreeLeaf key={index} leaf={leaf} type={type} />
      ))}
    </g>
  );
}
