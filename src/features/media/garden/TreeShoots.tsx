import { Bloom } from './getBlooms';
import { growShoots } from './growShoots';
import { GrownShape } from './treeGrowth';
import { TreeShoot } from './TreeShoot';
import { TREE_SPECIES } from './treeSpecies';
import { PrintSeries } from './types';

type TreeShootsProps = {
  shapes: GrownShape[];
  flowerSpots: Pick<Bloom, 'limbKey' | 'at'>[];
  type: PrintSeries['type'];
};

export function TreeShoots({ shapes, flowerSpots, type }: TreeShootsProps) {
  const shoots = shapes
    .filter(({ growth }) => growth.type === 'branch')
    .flatMap((shape) =>
      growShoots(
        shape,
        TREE_SPECIES[type].shoots,
        flowerSpots
          .filter(({ limbKey }) => limbKey === shape.key)
          .map(({ at }) => at),
      ),
    );

  return (
    <g className="tree-shoots">
      {shoots.map((shoot) => (
        <TreeShoot key={shoot.key} shoot={shoot} type={type} />
      ))}
    </g>
  );
}
