import { useMemo, useRef } from 'react';
import { useLanguageMediaStorage } from './LanguageMediaStorageContext';
import { MediaCactus } from './MediaCactus';
import { AddMediaButton } from './AddMediaButton';
import { MediaTree } from './MediaTree';
import { MediaVine } from './MediaVine';
import { GardenScenery } from './GardenScenery';
import { useHorizon } from './useHorizon';
import { useNow } from './useNow';
import { useGardenLocation } from './useGardenLocation';
import { findTimeOfDay } from './findTimeOfDay';
import { isPrintSeries } from './types';
import { useGridSpans } from './useGridSpans';
import { sortTallestFirst } from './sortTallestFirst';

import './MediaGarden.css';

export function MediaGarden() {
  const { media } = useLanguageMediaStorage();
  const plants = useMemo(() => sortTallestFirst(media), [media]);
  const listRef = useRef<HTMLUListElement>(null);
  useGridSpans(listRef, media.length);
  const horizon = useHorizon(listRef);
  const now = useNow();
  const location = useGardenLocation();

  return (
    <div className="garden" data-time-of-day={findTimeOfDay(now, location)}>
      {horizon !== undefined && (
        <GardenScenery horizon={horizon} now={now} location={location} />
      )}
      <ul ref={listRef} className="media-garden">
        {plants.map((item) => {
          if (isPrintSeries(item)) {
            return (
              <li key={item.id}>
                <MediaTree series={item} />
              </li>
            );
          }
          if (item.type === 'youtube') {
            return (
              <li key={item.id}>
                <MediaCactus channel={item} />
              </li>
            );
          }
          return (
            <li key={item.id}>
              <MediaVine series={item} />
            </li>
          );
        })}
        <li className="add-media-plot">
          <AddMediaButton />
        </li>
      </ul>
    </div>
  );
}
