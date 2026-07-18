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
 * A toggle between exactly two equally-weighted options — e.g. vocabulary vs
 * grammar. Unlike an on/off switch, neither side reads as the "active" or
 * "default" state; the sliding thumb just tracks which of the two labels is
 * currently selected. The labels themselves sit beside the (small) track
 * rather than inside it.
 */
export function Switch<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  disabled = false,
}: Props<T>) {
  const uid = useId()
  const selectedSide = value === options[1].value ? "end" : "start"
  const idFor = (option: Option<T>) => `${uid}-${option.value}`

  return (
    <fieldset className="plain">
      <legend>{legend}</legend>
      <div className="switch-row">
        <label className="switch-external-label" htmlFor={idFor(options[0])}>
          {options[0].label}
        </label>
        <div className={`switch switch-${selectedSide}`}>
          <span className="switch-thumb" aria-hidden="true" />
          {options.map((option) => (
            <span
              className="switch-hit"
              key={option.value}
              onClick={() => !disabled && onChange(option.value)}
            >
              <input
                id={idFor(option)}
                type="radio"
                name={name}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />
            </span>
          ))}
        </div>
        <label className="switch-external-label" htmlFor={idFor(options[1])}>
          {options[1].label}
        </label>
      </div>
    </fieldset>
  )
}
