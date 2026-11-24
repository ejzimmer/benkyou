import { formatDayAndMonth, getLocalDate } from '../../../journal/dates';
import { CallistemonSpray } from './CallistemonSpray';
import { findBranchPoint } from './findBranchPoint';
import { Bloom } from './getBlooms';
import { Spray } from './groupBloomsIntoSprays';
import { findShootBase } from './growShoots';
import { HoverCloud } from './HoverCloud';
import { NewGrowth } from './NewGrowth';
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
  newKeys: Set<string>;
  onSelect: (volume: Volume, updateKey: string) => void;
};

export function TreeFlowers({
  layout,
  blooms,
  sprays,
  type,
  newKeys,
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
          const base = findShootBase(point, downSide);
          const isNewSpray = spray.blooms.every(({ key }) => newKeys.has(key));
          return (
            <NewGrowth key={spray.key} isNew={isNewSpray} origin={base}>
              <CallistemonSpray
                seed={spray.key}
                base={base}
                angle={point.angle + CALLISTEMON_TURNS[index % 2] * downSide}
                side={downSide}
                blooms={spray.blooms}
                newKeys={isNewSpray ? new Set() : newKeys}
                onSelect={onSelect}
              />
            </NewGrowth>
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
        const base = findShootBase(point, side);

        return (
          <NewGrowth
            key={bloom.key}
            isNew={newKeys.has(bloom.key)}
            origin={base}
          >
            <HoverCloud
              text={formatDayAndMonth(getLocalDate(bloom.date))}
              onClick={() => onSelect(bloom.volume, bloom.key)}
            >
              <SakuraFlower
                seed={bloom.key}
                base={base}
                angle={point.angle + SAKURA_TURN * side}
                understood={bloom.understood}
              />
            </HoverCloud>
          </NewGrowth>
        );
      })}
    </g>
  );
}
