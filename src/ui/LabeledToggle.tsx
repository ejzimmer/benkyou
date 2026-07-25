import { useId } from "react"

type Option<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  legend: string
  name: string
  value: T
  onChange: (value: T) => void
  options: readonly [Option<T>, Option<T>]
  disabled?: boolean
}

/**
 * A toggle between exactly two options, shown as a sliding on/off knob with
 * a static text label on each side — unlike Switch's two equally-weighted
 * segmented buttons, this reads as a single knob with the unselected side
 * dimmed.
 */
export function LabeledToggle<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  disabled = false,
}: Props<T>) {
  const id = useId()
  const checked = value === options[1].value

  return (
    <label className="toggle-row labeled-toggle-row" htmlFor={id}>
      <span
        className={
          checked
            ? "labeled-toggle-option"
            : "labeled-toggle-option labeled-toggle-option-selected"
        }
      >
        {options[0].label}
      </span>
      <span className="toggle-track">
        <input
          id={id}
          type="checkbox"
          role="switch"
          name={name}
          aria-label={legend}
          checked={checked}
          disabled={disabled}
          onChange={() =>
            onChange(checked ? options[0].value : options[1].value)
          }
        />
        <span className="toggle-thumb" aria-hidden="true" />
      </span>
      <span
        className={
          checked
            ? "labeled-toggle-option labeled-toggle-option-selected"
            : "labeled-toggle-option"
        }
      >
        {options[1].label}
      </span>
    </label>
  )
}
