import { CSSProperties, useMemo, useState } from 'react';
import { ModalDialog } from '../../../journal/controls/ModalDialog';
import { PencilIcon } from '../../../journal/icons/Pencil';
import { PlayButtonIcon } from '../../../journal/icons/PlayButton';
import { CactusCrowns } from './CactusCrowns';
import { createCactusLayout } from './cactusLayout';
import { CactusRibs } from './CactusRibs';
import { CactusSpines } from './CactusSpines';
import { CloudFrame } from './CloudFrame';
import { EditChannelForm } from './EditChannelForm';
import { findSignpostPlacement } from './findSignpostPlacement';
import { HangingSign } from './HangingSign';
import { getItemsInAddedOrder } from './lists';
import { placeBeetles } from './placeBeetles';
import { Signpost } from './Signpost';
import { TreeBeetles } from './TreeBeetles';
import { getGrownShapes } from './treeGrowth';
import { TreeFill } from './TreeFill';
import { TreeOutline } from './TreeOutline';
import { TreeSilhouette } from './TreeSilhouette';
import { Video, YoutubeChannel } from './types';
import { VideoArms } from './VideoArms';
import { WatchedVideoForm } from './WatchedVideoForm';
import { readVideoProgress } from './videoProgress';

type MediaCactusProps = { channel: YoutubeChannel };

export function MediaCactus({ channel }: MediaCactusProps) {
  const layout = useMemo(() => createCactusLayout(channel), [channel]);
  const videos = getItemsInAddedOrder(channel.videos);
  const progress = videos.map(readVideoProgress);
  const grownShapes = getGrownShapes(layout, progress);
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editedVideo, setEditedVideo] = useState<Video>();
  const { x, y, width, height } = layout.bounds;

  return (
    <div
      className="media-tree media-cactus"
      style={
        {
          '--ground': `${y + height}px`,
          '--tree-width': `${width}px`,
        } as CSSProperties
      }
    >
      <svg
        role="img"
        aria-label={channel.name}
        viewBox={`${x} ${y} ${width} ${height}`}
        width={width}
        height={height}
      >
        <CactusSpines shapes={grownShapes} />
        <TreeOutline shapes={grownShapes} />
        <TreeSilhouette layout={layout} />
        <TreeFill shapes={grownShapes} />
        <CactusRibs shapes={grownShapes} />
        <CactusCrowns
          channel={channel}
          shapes={grownShapes}
          onSelect={setEditedVideo}
        />
        <TreeBeetles spots={placeBeetles(videos, grownShapes)} />
        <VideoArms
          channel={channel}
          shapes={grownShapes}
          onSelect={setEditedVideo}
        />
      </svg>
      <Signpost name={channel.name} placement={findSignpostPlacement(layout)}>
        <HangingSign
          label="Add a watched video"
          icon={<PlayButtonIcon width="16px" />}
          onClick={() => setIsVideoFormOpen(true)}
        />
        <HangingSign
          label="Edit"
          icon={<PencilIcon width="18px" />}
          onClick={() => setIsEditFormOpen(true)}
        />
      </Signpost>
      <ModalDialog
        isOpen={isVideoFormOpen}
        className="progress-update-modal"
        onCancel={() => setIsVideoFormOpen(false)}
      >
        {isVideoFormOpen && (
          <CloudFrame>
            <WatchedVideoForm channel={channel} />
          </CloudFrame>
        )}
      </ModalDialog>
      <ModalDialog
        isOpen={isEditFormOpen}
        className="progress-update-modal edit-channel-modal"
        onCancel={() => setIsEditFormOpen(false)}
      >
        {isEditFormOpen && (
          <CloudFrame>
            <EditChannelForm channel={channel} />
          </CloudFrame>
        )}
      </ModalDialog>
      <ModalDialog
        isOpen={!!editedVideo}
        className="progress-update-modal"
        onCancel={() => setEditedVideo(undefined)}
      >
        {editedVideo && (
          <CloudFrame>
            <WatchedVideoForm channel={channel} video={editedVideo} />
          </CloudFrame>
        )}
      </ModalDialog>
    </div>
  );
}
