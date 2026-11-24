import { Beetle } from './Beetle';
import { NewGrowth } from './NewGrowth';
import { BeetleSpot } from './placeBeetles';

type TreeBeetlesProps = { spots: BeetleSpot[]; newKeys?: Set<string> };

export function TreeBeetles({ spots, newKeys }: TreeBeetlesProps) {
  return (
    <g className="tree-beetles">
      {spots.map((spot) => (
        <NewGrowth key={spot.key} isNew={!!newKeys?.has(spot.key)}>
          <Beetle spot={spot} />
        </NewGrowth>
      ))}
    </g>
  );
}
