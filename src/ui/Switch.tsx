import { useId, useLayoutEffect, useRef, useState } from "react"

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
 * grammar. Rendered as two joined buttons, one per option, with a sliding
 * thumb behind the selected option's label. Neither side reads as the
 * "active" or "default" state; the thumb just tracks which label is
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
  const uid = useId()
  const idFor = (option: Option<T>) => `${uid}-${option.value}`
  const selectedIndex = value === options[1].value ? 1 : 0
  const selectedSide = selectedIndex === 1 ? "end" : "start"

  const optionRefs = useRef<(HTMLLabelElement | null)[]>([])
  const [thumbRect, setThumbRect] = useState<{
    left: number
    width: number
  } | null>(null)

  // The two options' labels aren't the same length, so their boxes aren't
  // the same width either — measure the selected one directly rather than
  // assuming a 50/50 split, or the thumb drifts off the real divide between
  // the two labels.
  useLayoutEffect(() => {
    const option = optionRefs.current[selectedIndex]
    if (!option) return
    setThumbRect({ left: option.offsetLeft, width: option.offsetWidth })
  }, [selectedIndex, options[0].label, options[1].label])

  return (
    <fieldset className="plain switch-group">
      <legend className="sr-only">{legend}</legend>
      <div className={`switch switch-${selectedSide}`}>
        <span
          className="switch-thumb"
          aria-hidden="true"
          style={
            thumbRect
              ? { left: thumbRect.left, width: thumbRect.width }
              : undefined
          }
        />
        {options.map((option, index) => (
          <label
            key={option.value}
            ref={(el) => {
              optionRefs.current[index] = el
            }}
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
