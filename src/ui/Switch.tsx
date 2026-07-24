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
 * grammar. Rendered as two joined buttons, one per option, with the selected
 * option shown pressed. Neither side reads as the "active" or "default"
 * state.
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
  const idFor = (option: Option<T>) => `${uid}-${option.value}`

  return (
    <fieldset className="plain switch-group">
      <legend className="sr-only">{legend}</legend>
      <div className="switch">
        {options.map((option) => (
          <label
            key={option.value}
            className={
              value === option.value
                ? "switch-option switch-option-selected"
                : "switch-option"
            }
            htmlFor={idFor(option)}
          >
            <input
              id={idFor(option)}
              type="radio"
              name={name}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
