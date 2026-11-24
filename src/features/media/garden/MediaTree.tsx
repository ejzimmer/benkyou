import { CSSProperties, useMemo, useState } from 'react';
import { ModalDialog } from '../../../journal/controls/ModalDialog';
import { OpenBookIcon } from '../../../journal/icons/OpenBook';
import { PencilIcon } from '../../../journal/icons/Pencil';
import { AddVolumeForm } from './AddVolumeForm';
import { BranchNames } from './BranchNames';
import { CloudFrame } from './CloudFrame';
import { EditSeriesForm } from './EditSeriesForm';
import { findCurrentVolume } from './findCurrentVolume';
import { findSignpostPlacement } from './findSignpostPlacement';
import { getItemsByNumber } from './lists';
import { HangingSign } from './HangingSign';
import { getBlooms } from './getBlooms';
import { groupBloomsIntoSprays } from './groupBloomsIntoSprays';
import { placeProgressBeetles } from './placeProgressBeetles';
import { TreeBeetles } from './TreeBeetles';
import { ProgressUpdateForm } from './ProgressUpdateForm';
import { createTreeLayout } from './treeLayout';
import { TreeFill } from './TreeFill';
import { TreeFlowers } from './TreeFlowers';
import { getGrownShapes } from './treeGrowth';
import { TreeOutline } from './TreeOutline';
import { TreeShoots } from './TreeShoots';
import { TreeSilhouette } from './TreeSilhouette';
import { NextVolumeBranch } from './NextVolumeBranch';
import { Signpost } from './Signpost';
import { PrintSeries, Volume } from './types';
import { UpdateStretches } from './UpdateStretches';
import { GROWTH_DURATION_MS, useGrowingShapes } from './useGrowingShapes';
import { useKeysAddedSinceMount } from './useKeysAddedSinceMount';
import { readVolumeProgress } from './volumeProgress';

type MediaTreeProps = { series: PrintSeries };

export function MediaTree({ series }: MediaTreeProps) {
  const layout = useMemo(() => createTreeLayout(series), [series]);
  const volumes = getItemsByNumber(series.volumes);
  const progress = volumes.map((volume) => readVolumeProgress(series, volume));
  const grownShapes = getGrownShapes(layout, progress);
  const growingShapes = useGrowingShapes(grownShapes);
  const blooms = getBlooms(series);
  const sprays = groupBloomsIntoSprays(blooms, layout.shapes);
  const beetleSpots = placeProgressBeetles(series, grownShapes);
  const newBloomKeys = useKeysAddedSinceMount(blooms.map(({ key }) => key));
  const newBeetleKeys = useKeysAddedSinceMount(
    beetleSpots.map(({ key }) => key),
  );
  const [isProgressUpdateFormOpen, setIsProgressUpdateFormOpen] =
    useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isAddVolumeFormOpen, setIsAddVolumeFormOpen] = useState(false);
  const [editedUpdate, setEditedUpdate] = useState<{
    volume: Volume;
    updateKey: string;
  }>();
  const currentVolume = findCurrentVolume(series);
  const { x, y, width, height } = layout.bounds;

  return (
    <div
      className="media-tree"
      style={
        {
          '--ground': `${y + height}px`,
          '--tree-width': `${width}px`,
          '--growth-duration': `${GROWTH_DURATION_MS}ms`,
        } as CSSProperties
      }
    >
      <svg
        role="img"
        aria-label={series.name}
        viewBox={`${x} ${y} ${width} ${height}`}
        width={width}
        height={height}
      >
        <TreeShoots
          shapes={growingShapes}
          flowerSpots={series.type === 'book' ? sprays : blooms}
          type={series.type}
        />
        <TreeOutline shapes={growingShapes} />
        <TreeSilhouette layout={layout} />
        <TreeFill shapes={growingShapes} />
        <TreeFlowers
          layout={layout}
          blooms={blooms}
          sprays={sprays}
          type={series.type}
          newKeys={newBloomKeys}
          onSelect={(volume, updateKey) =>
            setEditedUpdate({ volume, updateKey })
          }
        />
        {series.type === 'book' && (
          <BranchNames layout={layout} series={series} />
        )}
        <TreeBeetles spots={beetleSpots} newKeys={newBeetleKeys} />
        <UpdateStretches
          series={series}
          shapes={grownShapes}
          onSelect={(volume, updateKey) =>
            setEditedUpdate({ volume, updateKey })
          }
        />
        <NextVolumeBranch
          seriesName={series.name}
          shapes={layout.nextVolumeShapes}
          onClick={() => setIsAddVolumeFormOpen(true)}
        />
      </svg>
      <Signpost name={series.name} placement={findSignpostPlacement(layout)}>
        <HangingSign
          label="Update"
          icon={<OpenBookIcon width="18px" />}
          onClick={() => setIsProgressUpdateFormOpen(true)}
        />
        <HangingSign
          label="Edit"
          icon={<PencilIcon width="18px" />}
          onClick={() => setIsEditFormOpen(true)}
        />
      </Signpost>
      <ModalDialog
        isOpen={isProgressUpdateFormOpen}
        className="progress-update-modal"
        onCancel={() => setIsProgressUpdateFormOpen(false)}
      >
        {isProgressUpdateFormOpen && currentVolume && (
          <CloudFrame>
            <ProgressUpdateForm series={series} volume={currentVolume} />
          </CloudFrame>
        )}
      </ModalDialog>
      <ModalDialog
        isOpen={isEditFormOpen}
        className="progress-update-modal"
        onCancel={() => setIsEditFormOpen(false)}
      >
        {isEditFormOpen && (
          <CloudFrame>
            <EditSeriesForm series={series} />
          </CloudFrame>
        )}
      </ModalDialog>
      <ModalDialog
        isOpen={!!editedUpdate}
        className="progress-update-modal"
        onCancel={() => setEditedUpdate(undefined)}
      >
        {editedUpdate && (
          <CloudFrame>
            <ProgressUpdateForm
              series={series}
              volume={editedUpdate.volume}
              updateKey={editedUpdate.updateKey}
            />
          </CloudFrame>
        )}
      </ModalDialog>
      <ModalDialog
        isOpen={isAddVolumeFormOpen}
        className="progress-update-modal add-volume-modal"
        onCancel={() => setIsAddVolumeFormOpen(false)}
      >
        {isAddVolumeFormOpen && (
          <CloudFrame>
            <AddVolumeForm series={series} />
          </CloudFrame>
        )}
      </ModalDialog>
    </div>
  );
}
