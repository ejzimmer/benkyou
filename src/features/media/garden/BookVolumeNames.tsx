import { useState } from 'react';
import { PlusIcon } from '../../../journal/icons/Plus';
import { Tooltip } from '../../../journal/controls/Tooltip';
import { VolumeNameField } from './VolumeNameField';

export function BookVolumeNames() {
  const [count, setCount] = useState(1);
  return (
    <div className="book-volume-names">
      {Array.from({ length: count }, (_, index) => (
        <VolumeNameField
          key={index}
          name="volumeName"
          label={`Volume ${index + 1}`}
          isFocused={index > 0}
        />
      ))}
      <Tooltip label="Add another volume" position="top">
        {(triggerProps) => (
          <button
            {...triggerProps}
            type="button"
            className="add-volume-name"
            aria-label="Add another volume"
            onClick={() => setCount((previous) => previous + 1)}
          >
            <PlusIcon width="12px" strokeWidth="2.4" />
          </button>
        )}
      </Tooltip>
    </div>
  );
}
