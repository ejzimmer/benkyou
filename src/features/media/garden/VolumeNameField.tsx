import { Tooltip } from '../../../journal/controls/Tooltip';

type VolumeNameFieldProps = {
  name: string;
  label: string;
  defaultValue?: string;
  isRequired?: boolean;
  isFocused?: boolean;
};

export function VolumeNameField({
  name,
  label,
  defaultValue,
  isRequired,
  isFocused,
}: VolumeNameFieldProps) {
  return (
    <div className="volume-name-field">
      <Tooltip label={label} position="top">
        {(triggerProps) => (
          <span {...triggerProps} className="count-icon" aria-hidden="true">
            📕
          </span>
        )}
      </Tooltip>
      <input
        name={name}
        aria-label={label}
        defaultValue={defaultValue}
        required={isRequired}
        autoFocus={isFocused}
      />
    </div>
  );
}
