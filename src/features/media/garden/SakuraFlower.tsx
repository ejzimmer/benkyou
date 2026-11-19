import { findBranchPoint } from './findBranchPoint';
import { growShoot } from './growShoots';
import { SakuraCluster } from './SakuraCluster';
import { createSeededRandom } from './seededRandom';
import { Point } from './treeGeometry';
import { TreeShoot } from './TreeShoot';
import { TREE_SPECIES } from './treeSpecies';

const SPUR_LENGTH = 18;
const CLUSTER_SIZE = 1.3;

const SPUR_STYLE = {
  ...TREE_SPECIES.manga.shoots,
  widths: [2.4, 1.3] as [number, number],
  bend: 0.12,
};

type SakuraFlowerProps = {
  seed: string;
  base: Point;
  angle: number;
  understood: number;
};

export function SakuraFlower({
  seed,
  base,
  angle,
  understood,
}: SakuraFlowerProps) {
  const spur = growShoot(
    base,
    angle,
    SPUR_LENGTH,
    SPUR_STYLE,
    createSeededRandom(seed),
    [[0.35, 0.8]],
  );
  const tip = findBranchPoint(spur.edges, 1);

  return (
    <g className="sakura-flower" data-testid="sakura-flower">
      <TreeShoot shoot={spur} type="manga" />
      <SakuraCluster
        x={tip.x}
        y={tip.y}
        angle={tip.angle}
        understood={understood}
        size={CLUSTER_SIZE}
      />
    </g>
  );
}
