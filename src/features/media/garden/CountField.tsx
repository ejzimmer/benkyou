import { ReactNode } from 'react';
import { Tooltip } from '../shared/controls/Tooltip';

type CountFieldProps = {
  name: string;
  label: string;
  icon: ReactNode;
  defaultValue?: number;
  isRequired?: boolean;
};

export function CountField({
  name,
  label,
  icon,
  defaultValue,
  isRequired,
}: CountFieldProps) {
  return (
    <div className="count-field">
      <Tooltip label={label} position="top">
        {(triggerProps) => (
          <span {...triggerProps} className="count-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </Tooltip>
      <input
        type="number"
        name={name}
        aria-label={label}
        min="0"
        defaultValue={defaultValue}
        required={isRequired}
      />
    </div>
  );
}
