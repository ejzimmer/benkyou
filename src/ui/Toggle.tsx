import { useId } from "react"

type Props = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** A single on/off switch — a checkbox styled as a sliding pill/knob. */
export function Toggle({ label, checked, onChange, disabled = false }: Props) {
  const id = useId()

  return (
    <label className="toggle-row" htmlFor={id}>
      <span className="toggle-track">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-thumb" aria-hidden="true" />
      </span>
      {label}
    </label>
  )
}
