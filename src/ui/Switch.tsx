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
 * currently selected.
 */
export function Switch<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  disabled = false,
}: Props<T>) {
  const [start, end] = options
  const selectedSide = value === end.value ? "end" : "start"

  return (
    <fieldset className="plain">
      <legend>{legend}</legend>
      <div className={`switch switch-${selectedSide}`}>
        <span className="switch-thumb" aria-hidden="true" />
        {[start, end].map((option) => (
          <label className="switch-option" key={option.value}>
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
