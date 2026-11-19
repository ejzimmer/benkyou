import { CSSProperties, useMemo, useState } from 'react';
import { ModalDialog } from '../shared/controls/ModalDialog';
import { TelevisionIcon } from '../shared/icons/Television';
import { AddEpisodeForm } from './AddEpisodeForm';
import { CloudFrame } from './CloudFrame';
import { EpisodeUpdateForm } from './EpisodeUpdateForm';
import { EpisodeUpdateStretches } from './EpisodeUpdateStretches';
import { findCurrentEpisode } from './findCurrentEpisode';
import { HangingSign } from './HangingSign';
import { calculateEpisodeProgress } from './calculateEpisodeProgress';
import { getRacemes } from './getRacemes';
import { placeEpisodeBeetles } from './placeEpisodeBeetles';
import { Pergola } from './Pergola';
import { placeVineLeaves } from './placeVineLeaves';
import { PostFronts } from './PostFronts';
import { SeasonBranches } from './SeasonBranches';
import { Signpost } from './Signpost';
import { TreeBeetles } from './TreeBeetles';
import { TreeFill } from './TreeFill';
import { getGrownShapes } from './treeGrowth';
import { TreeOutline } from './TreeOutline';
import { TreeSilhouette } from './TreeSilhouette';
import { Episode, Season, TvSeries } from './types';
import { VineLeaves } from './VineLeaves';
import { VineRacemes } from './VineRacemes';
import { createVineLayout, getVineEpisodes } from './vineLayout';

const OUTLINE_WIDTH = 1;
const SIGN_GAP = 18;

type MediaVineProps = { series: TvSeries };

export function MediaVine({ series }: MediaVineProps) {
  const layout = useMemo(() => createVineLayout(series), [series]);
  const progress = getVineEpisodes(series).flatMap(({ season, episodes }) =>
    episodes.map((episode) =>
      calculateEpisodeProgress(series, season, episode),
    ),
  );
  const grownShapes = getGrownShapes(layout, progress);
  const { x, y, width, height } = layout.bounds;
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const [editedUpdate, setEditedUpdate] = useState<{
    season: Season;
    episode: Episode;
    updateKey: string;
  }>();
  const [seasonForNewEpisode, setSeasonForNewEpisode] = useState<Season>();
  const [highlightedUpdateKey, setHighlightedUpdateKey] = useState<string>();
  const currentEpisode = findCurrentEpisode(series);

  return (
    <div
      className="media-tree media-vine"
      style={
        {
          '--ground': `${y + height}px`,
          '--tree-width': `${width}px`,
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
        <Pergola pergola={layout.pergola} />
        <TreeOutline shapes={grownShapes} width={OUTLINE_WIDTH} />
        <TreeSilhouette layout={layout} />
        <TreeFill shapes={grownShapes} />
        <PostFronts pergola={layout.pergola} />
        <VineLeaves
          leaves={placeVineLeaves(grownShapes, layout.pergola.beamBottom)}
        />
        <VineRacemes
          layout={layout}
          racemes={getRacemes(series)}
          highlightedKey={highlightedUpdateKey}
          onSelect={(season, episode, updateKey) =>
            setEditedUpdate({ season, episode, updateKey })
          }
        />
        <TreeBeetles spots={placeEpisodeBeetles(series, grownShapes)} />
        <SeasonBranches
          series={series}
          layout={layout}
          onSelect={setSeasonForNewEpisode}
        />
        <EpisodeUpdateStretches
          series={series}
          shapes={grownShapes}
          onSelect={(season, episode, updateKey) =>
            setEditedUpdate({ season, episode, updateKey })
          }
          onHighlight={setHighlightedUpdateKey}
        />
      </svg>
      <Signpost
        name={series.name}
        placement={{ side: 'left', offset: x + width / 2 + SIGN_GAP }}
      >
        <HangingSign
          label="Update"
          icon={<TelevisionIcon width="18px" />}
          onClick={() => setIsUpdateFormOpen(true)}
        />
      </Signpost>
      <ModalDialog
        isOpen={isUpdateFormOpen}
        className="progress-update-modal episode-update-modal"
        onCancel={() => setIsUpdateFormOpen(false)}
      >
        {isUpdateFormOpen && currentEpisode && (
          <CloudFrame>
            <EpisodeUpdateForm
              series={series}
              season={currentEpisode.season}
              episode={currentEpisode.episode}
            />
          </CloudFrame>
        )}
      </ModalDialog>
      <ModalDialog
        isOpen={!!editedUpdate}
        className="progress-update-modal episode-update-modal"
        onCancel={() => setEditedUpdate(undefined)}
      >
        {editedUpdate && (
          <CloudFrame>
            <EpisodeUpdateForm
              series={series}
              season={editedUpdate.season}
              episode={editedUpdate.episode}
              updateKey={editedUpdate.updateKey}
            />
          </CloudFrame>
        )}
      </ModalDialog>
      <ModalDialog
        isOpen={!!seasonForNewEpisode}
        className="progress-update-modal episode-update-modal"
        onCancel={() => setSeasonForNewEpisode(undefined)}
      >
        {seasonForNewEpisode && (
          <CloudFrame>
            <AddEpisodeForm series={series} season={seasonForNewEpisode} />
          </CloudFrame>
        )}
      </ModalDialog>
    </div>
  );
}
