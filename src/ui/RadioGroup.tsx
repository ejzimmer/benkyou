type Option<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  legend: string
  name: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  disabled?: boolean
}

export function RadioGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  disabled = false,
}: Props<T>) {
  return (
    <fieldset className="plain">
      <legend>{legend}</legend>
      <div className="row" style={{ gap: "1rem" }}>
        {options.map((option) => (
          <label className="row" key={option.value}>
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
