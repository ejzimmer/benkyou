import { ReactNode } from 'react';
import { Tooltip } from '../../../journal/controls/Tooltip';
import { NumberInput } from './NumberInput';

type CountTileProps = {
  name: string;
  label: string;
  addLabel: string;
  icon: ReactNode;
  count: number;
  onAdd: () => void;
};

export function CountTile({
  name,
  label,
  addLabel,
  icon,
  count,
  onAdd,
}: CountTileProps) {
  return (
    <div className="progress-tile">
      <Tooltip label={label} position="top">
        {(triggerProps) => (
          <button
            {...triggerProps}
            type="button"
            className="count-button"
            aria-label={addLabel}
            onClick={onAdd}
          >
            {icon}
          </button>
        )}
      </Tooltip>
      <NumberInput
        key={count}
        name={name}
        aria-label={label}
        defaultValue={count}
        min={0}
      />
    </div>
  );
}
