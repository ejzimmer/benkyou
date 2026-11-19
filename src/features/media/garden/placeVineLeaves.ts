import { findBranchPoint, measureBranchLength } from './findBranchPoint';
import { createSeededRandom } from './seededRandom';
import { Point } from './treeGeometry';
import { GrownShape } from './treeGrowth';

export type VineLeaf = Point & { key: string; angle: number; size: number };

const BEAM_LEAF_GAP = 5;
const BRANCH_LEAF_GAP = 6;
const SHOOT_LEAF_GAP = 7;
const BEAM_REACH = 10;
const UPWARD_SHARE = 0.62;

function placeAlong(
  shape: GrownShape,
  gap: number,
  isWanted: (point: Point) => boolean = () => true,
): VineLeaf[] {
  const random = createSeededRandom(`${shape.key}-leaves`);
  const length = measureBranchLength(shape.edges);
  const grown = length * shape.amount;
  const leaves: VineLeaf[] = [];
  for (let along = 2; along < grown; along += gap * (0.7 + random() * 0.6)) {
    const point = findBranchPoint(shape.edges, along / length);
    const isUpward = random() < UPWARD_SHARE;
    const angle = isUpward
      ? -90 + (random() - 0.5) * 150
      : 90 + (random() - 0.5) * 125;
    const size = 0.65 + random() * 0.5;
    if (isWanted(point)) {
      leaves.push({
        key: `${shape.key}-leaf-${leaves.length}`,
        x: point.x,
        y: point.y,
        angle,
        size,
      });
    }
  }
  return leaves;
}

export function placeVineLeaves(shapes: GrownShape[], beamBottom: number) {
  const trunk = shapes.find(({ key }) => key === 'trunk');
  const growing = shapes.filter(({ key }) => key !== 'trunk');
  const reach =
    Math.max(
      ...growing.flatMap(({ edges, amount }) =>
        edges
          .filter(({ at }) => at <= amount)
          .map(({ left, right }) => Math.max(left.x, right.x)),
      ),
    ) + BEAM_REACH;

  return [
    ...(trunk && growing.length
      ? placeAlong(
          trunk,
          BEAM_LEAF_GAP,
          ({ x, y }) => y < beamBottom && x <= reach,
        )
      : []),
    ...growing.flatMap((shape) =>
      placeAlong(
        shape,
        shape.growth.type === 'stem' ? BRANCH_LEAF_GAP : SHOOT_LEAF_GAP,
      ),
    ),
  ];
}
