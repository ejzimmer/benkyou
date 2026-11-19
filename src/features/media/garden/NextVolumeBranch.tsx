import { drawEdgeBand } from './drawEdgeBand';
import { TreeShape } from './treeLayout';
import { UpdateStretchButton } from './UpdateStretchButton';

type NextVolumeBranchProps = {
  seriesName: string;
  shapes: TreeShape[];
  onClick: () => void;
};

export function NextVolumeBranch({
  seriesName,
  shapes,
  onClick,
}: NextVolumeBranchProps) {
  return (
    <g className="next-volume-branch">
      <UpdateStretchButton
        label={`Add a volume to ${seriesName}`}
        path={shapes.map(({ edges }) => drawEdgeBand(edges)).join(' ')}
        onClick={onClick}
      />
    </g>
  );
}
