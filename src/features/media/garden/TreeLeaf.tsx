import { Leaf } from './growShoots';
import { PrintSeries } from './types';

const LEAF_PATHS: Record<PrintSeries['type'], string> = {
  book: 'M0 0 Q5.4 -2.8 12 0 Q5.4 2.8 0 0 Z',
  manga: 'M0 0 C1.6 -4.4 6 -3.9 8 0 C6 3.9 1.6 4.4 0 0 Z',
};

const MIDRIB_LENGTHS: Record<PrintSeries['type'], number> = {
  book: 10,
  manga: 6.8,
};

type TreeLeafProps = {
  leaf: Leaf;
  type: PrintSeries['type'];
};

export function TreeLeaf({ leaf: { x, y, angle }, type }: TreeLeafProps) {
  return (
    <g
      className={`tree-leaf ${type}`}
      transform={`translate(${x} ${y}) rotate(${angle})`}
    >
      <path d={LEAF_PATHS[type]} />
      <path className="midrib" d={`M0 0 L${MIDRIB_LENGTHS[type]} 0`} />
    </g>
  );
}
