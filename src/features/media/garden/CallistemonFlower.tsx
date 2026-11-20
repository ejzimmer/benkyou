import { Bottlebrush } from './Bottlebrush';
import { measureBranchLength } from './findBranchPoint';
import { Shoot } from './growShoots';
import { TreeShoot } from './TreeShoot';

const BRUSH_END = 0.84;

type CallistemonFlowerProps = {
  stem: Pick<Shoot, 'edges' | 'leaves'>;
  understood: number;
};

export function CallistemonFlower({
  stem,
  understood,
}: CallistemonFlowerProps) {
  return (
    <g className="callistemon-flower" data-testid="callistemon-flower">
      <TreeShoot shoot={stem} type="book" />
      <Bottlebrush
        edges={stem.edges}
        length={measureBranchLength(stem.edges)}
        endAt={BRUSH_END}
        understood={understood}
      />
    </g>
  );
}
