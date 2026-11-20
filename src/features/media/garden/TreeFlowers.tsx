import { formatDayAndMonth, getLocalDate } from '../../../journal/dates';
import { CallistemonSpray } from './CallistemonSpray';
import { findBranchPoint } from './findBranchPoint';
import { Bloom } from './getBlooms';
import { Spray } from './groupBloomsIntoSprays';
import { findShootBase } from './growShoots';
import { HoverCloud } from './HoverCloud';
import { SakuraFlower } from './SakuraFlower';
import { TreeLayout } from './treeLayout';
import { PrintSeries, Volume } from './types';
import { toRadians } from '../../../journal/toRadians';

const CALLISTEMON_TURNS = [60, 30];
const SAKURA_TURN = 55;

type TreeFlowersProps = {
  layout: TreeLayout;
  blooms: Bloom[];
  sprays: Spray[];
  type: PrintSeries['type'];
  onSelect: (volume: Volume, updateKey: string) => void;
};

export function TreeFlowers({
  layout,
  blooms,
  sprays,
  type,
  onSelect,
}: TreeFlowersProps) {
  const findLimbPoint = ({ limbKey, at }: Pick<Bloom, 'limbKey' | 'at'>) => {
    const limb = layout.shapes.find(({ key }) => key === limbKey);
    if (!limb) return undefined;
    const point = findBranchPoint(limb.edges, at);
    const downSide = Math.cos(toRadians(point.angle)) >= 0 ? 1 : -1;
    return { point, downSide };
  };

  if (type === 'book') {
    return (
      <g className="tree-flowers">
        {sprays.map((spray, index) => {
          const limbPoint = findLimbPoint(spray);
          if (!limbPoint) return null;
          const { point, downSide } = limbPoint;
          return (
            <CallistemonSpray
              key={spray.key}
              seed={spray.key}
              base={findShootBase(point, downSide)}
              angle={point.angle + CALLISTEMON_TURNS[index % 2] * downSide}
              side={downSide}
              blooms={spray.blooms}
              onSelect={onSelect}
            />
          );
        })}
      </g>
    );
  }

  return (
    <g className="tree-flowers">
      {blooms.map((bloom, index) => {
        const limbPoint = findLimbPoint(bloom);
        if (!limbPoint) return null;
        const { point, downSide } = limbPoint;
        const side = index % 2 ? -downSide : downSide;

        return (
          <HoverCloud
            key={bloom.key}
            text={formatDayAndMonth(getLocalDate(bloom.date))}
            onClick={() => onSelect(bloom.volume, bloom.key)}
          >
            <SakuraFlower
              seed={bloom.key}
              base={findShootBase(point, side)}
              angle={point.angle + SAKURA_TURN * side}
              understood={bloom.understood}
            />
          </HoverCloud>
        );
      })}
    </g>
  );
}
