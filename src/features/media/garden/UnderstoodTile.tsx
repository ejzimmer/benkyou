import { CSSProperties, useState } from 'react';
import { MediaTypeIcon } from './MediaTypeIcon';
import { MediaType } from './types';
import { Tooltip } from '../../../journal/controls/Tooltip';

type UnderstoodTileProps = {
  mediaType: MediaType;
  defaultValue?: number;
};

export function UnderstoodTile({
  mediaType,
  defaultValue,
}: UnderstoodTileProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className={`progress-tile understood-tile ${mediaType}`}>
      <Tooltip label="Understood" position="top">
        {(triggerProps) => (
          <span {...triggerProps} className="flower-icon">
            <MediaTypeIcon type={mediaType} width="44px" />
          </span>
        )}
      </Tooltip>
      <input
        type="range"
        name={value === undefined ? undefined : 'understood'}
        aria-label="Understood"
        min={0}
        max={100}
        value={value ?? 0}
        onChange={(event) => setValue(Number(event.target.value))}
        style={{ '--understood': `${value ?? 0}%` } as CSSProperties}
      />
    </div>
  );
}
