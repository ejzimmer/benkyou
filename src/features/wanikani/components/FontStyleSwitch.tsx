import './FontStyleSwitch.css'
import type { FontStyle } from '../fontStyle'

interface Props {
  fontStyle: FontStyle
  onChange: (fontStyle: FontStyle) => void
}

export function FontStyleSwitch({ fontStyle, onChange }: Props) {
  const isPlain = fontStyle === 'plain'

  return (
    <label className="font-style-switch">
      <span className="visually-hidden">Plain font</span>
      <span className="fancy" aria-hidden>字</span>
      <input
        type="checkbox"
        role="switch"
        checked={isPlain}
        aria-checked={isPlain}
        onChange={(e) => onChange(e.target.checked ? 'plain' : 'fancy')}
      />
      <span className="plain" aria-hidden>字</span>
    </label>
  )
}
