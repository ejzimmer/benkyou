import { ReactNode } from 'react';
import { Tooltip } from '../shared/controls/Tooltip';

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
      <input
        key={count}
        type="number"
        name={name}
        aria-label={label}
        defaultValue={count}
        min={0}
      />
    </div>
  );
}
