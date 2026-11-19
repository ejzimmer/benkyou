import { Beetle } from './Beetle';
import { BeetleSpot } from './placeBeetles';

type TreeBeetlesProps = { spots: BeetleSpot[] };

export function TreeBeetles({ spots }: TreeBeetlesProps) {
  return (
    <g className="tree-beetles">
      {spots.map((spot) => (
        <Beetle key={spot.key} spot={spot} />
      ))}
    </g>
  );
}
