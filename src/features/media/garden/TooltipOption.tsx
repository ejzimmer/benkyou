import { ReactNode } from 'react';
import { Tooltip } from '../../../journal/controls/Tooltip';

type TooltipOptionProps = {
  icon: ReactNode;
  label: string;
};

export function TooltipOption({ icon, label }: TooltipOptionProps) {
  return (
    <Tooltip label={label} position="top">
      {(triggerProps) => (
        <span
          {...triggerProps}
          className="tooltip-option"
          role="img"
          aria-label={label}
        >
          {icon}
        </span>
      )}
    </Tooltip>
  );
}
