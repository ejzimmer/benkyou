import { placeEdgeSpines, Spine } from './cactusRibs';
import { roundCoordinate } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { OUTLINE_WIDTH } from './treeLayout';

const LENGTH = 3.4;
const SPLAY_LENGTH = 2.6;
const SPLAY_WIDTH = 1.6;

function drawSpine({ base, direction }: Spine) {
  const across = { x: -direction.y, y: direction.x };
  const tips = [
    { along: LENGTH, aside: 0 },
    { along: SPLAY_LENGTH, aside: SPLAY_WIDTH },
    { along: SPLAY_LENGTH, aside: -SPLAY_WIDTH },
  ].map(({ along, aside }) => ({
    x: roundCoordinate(base.x + direction.x * along + across.x * aside),
    y: roundCoordinate(base.y + direction.y * along + across.y * aside),
  }));
  return tips.map(({ x, y }) => `M${base.x} ${base.y} L${x} ${y}`).join(' ');
}

type CactusSpinesProps = { shapes: GrownShape[] };

export function CactusSpines({ shapes }: CactusSpinesProps) {
  return (
    <path
      className="cactus-spines"
      d={shapes
        .flatMap((shape) => placeEdgeSpines(shape, OUTLINE_WIDTH))
        .map(drawSpine)
        .join(' ')}
    />
  );
}
