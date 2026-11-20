import { Fragment } from 'react';
import { FieldProps } from './fields';

export const DURATION_UNITS = {
  'mm:ss': ['minutes', 'seconds'],
  'hh:mm:ss': ['hours', 'minutes', 'seconds'],
} as const;

const UNIT_NAMES = { hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' };

const padToTwoDigits = (value: number | string) =>
  String(value).padStart(2, '0');

const padSegment = (event: React.FocusEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  if (input.value) input.value = padToTwoDigits(input.value);
};

const focusNextSegment = (event: React.ChangeEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  const nextSegment = input.nextElementSibling;
  if (input.value.length >= 2 && nextSegment instanceof HTMLInputElement) {
    nextSegment.focus();
    nextSegment.select();
  }
};

const splitIntoUnits = (
  totalSeconds: number,
  largestUnit: 'hours' | 'minutes',
) => Temporal.Duration.from({ seconds: totalSeconds }).round({ largestUnit });

type DurationFieldProps = FieldProps<number> & {
  durationFormat: keyof typeof DURATION_UNITS;
};

export function DurationField({
  label,
  name,
  defaultValue,
  durationFormat,
}: DurationFieldProps) {
  const units = DURATION_UNITS[durationFormat];
  const defaultDuration =
    defaultValue === undefined
      ? undefined
      : splitIntoUnits(defaultValue, units[0]);

  return (
    <fieldset>
      <legend>{label}</legend>
      {units.map((unit, index) => (
        <Fragment key={unit}>
          {index > 0 && ':'}
          <input
            name={`${name}-${unit}`}
            aria-label={UNIT_NAMES[unit]}
            inputMode="numeric"
            pattern={index === 0 ? '\\d+' : '[0-5]?\\d'}
            size={2}
            defaultValue={
              defaultDuration && padToTwoDigits(defaultDuration[unit])
            }
            onBlur={padSegment}
            onChange={focusNextSegment}
          />
        </Fragment>
      ))}
    </fieldset>
  );
}
