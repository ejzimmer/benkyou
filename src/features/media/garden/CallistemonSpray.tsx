import { formatDayAndMonth, getLocalDate } from '../../../journal/dates';
import { CallistemonFlower } from './CallistemonFlower';
import { findBranchPoint } from './findBranchPoint';
import { Bloom } from './getBlooms';
import { growArchingShoot, growShoot } from './growShoots';
import { HoverCloud } from './HoverCloud';
import { createSeededRandom } from './seededRandom';
import { Point } from './treeGeometry';
import { TreeShoot } from './TreeShoot';
import { TREE_SPECIES } from './treeSpecies';
import { Volume } from './types';

const TWIG_LENGTH = 18;
const TWIG_LENGTH_PER_FLOWER = 16;
const FIRST_FORK = 0.4;
const LONE_FORK = 0.75;
const STEM_LENGTH = 36;
const STEM_TURN = 50;
const ARCH = [30, 55];

const SHOOTS = TREE_SPECIES.book.shoots;
const TWIG_STYLE = {
  ...SHOOTS,
  widths: [2.2, 1] as [number, number],
};
const STEM_STYLE = {
  ...SHOOTS,
  widths: [0.7, 0.45] as [number, number],
  bend: 0.2,
};

const findForkPositions = (count: number) =>
  count === 1
    ? [LONE_FORK]
    : Array.from(
        { length: count },
        (_, index) => FIRST_FORK + ((1 - FIRST_FORK) * index) / (count - 1),
      );

type CallistemonSprayProps = {
  seed: string;
  base: Point;
  angle: number;
  side: number;
  blooms: Bloom[];
  onSelect: (volume: Volume, updateKey: string) => void;
};

export function CallistemonSpray({
  seed,
  base,
  angle,
  side,
  blooms,
  onSelect,
}: CallistemonSprayProps) {
  const random = createSeededRandom(seed);
  const [gentlest, steepest] = ARCH;
  const twig = growArchingShoot(
    base,
    angle,
    TWIG_LENGTH + TWIG_LENGTH_PER_FLOWER * blooms.length,
    side * (gentlest + random() * (steepest - gentlest)),
    TWIG_STYLE,
    random,
    [[0.15, 0.35]],
  );
  const forks = findForkPositions(blooms.length);
  const stems = forks.map((at, index) => {
    const fork = findBranchPoint(twig.edges, at);
    const turn = index % 2 ? -side : side;
    return growShoot(
      fork,
      fork.angle + STEM_TURN * turn,
      STEM_LENGTH,
      STEM_STYLE,
      random,
      [[0.86, 1]],
    );
  });

  return (
    <g className="callistemon-spray">
      <TreeShoot shoot={twig} type="book" />
      {blooms.map((bloom, index) => (
        <HoverCloud
          key={bloom.key}
          text={formatDayAndMonth(getLocalDate(bloom.date))}
          onClick={() => onSelect(bloom.volume, bloom.key)}
        >
          <CallistemonFlower
            stem={stems[index]}
            understood={bloom.understood}
          />
        </HoverCloud>
      ))}
    </g>
  );
}
