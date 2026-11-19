import { VineLeaf } from './placeVineLeaves';
import { WisteriaLeaf } from './WisteriaLeaf';

type VineLeavesProps = { leaves: VineLeaf[] };

export function VineLeaves({ leaves }: VineLeavesProps) {
  return (
    <g className="vine-leaves">
      {leaves.map((leaf) => (
        <WisteriaLeaf key={leaf.key} leaf={leaf} />
      ))}
    </g>
  );
}
