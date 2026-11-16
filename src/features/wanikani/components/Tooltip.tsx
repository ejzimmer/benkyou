import './Tooltip.css'
import { useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'

export interface TooltipTriggerProps {
  'aria-label': string
  onKeyDown: (event: KeyboardEvent) => void
  onBlur: (event: FocusEvent) => void
  onMouseLeave: () => void
}

interface Props {
  text: string
  align?: 'center' | 'end'
  children: (triggerProps: TooltipTriggerProps) => ReactNode
}

export function Tooltip({ text, align = 'center', children }: Props) {
  const [isDismissed, setIsDismissed] = useState(false)

  return (
    <span className={`has-tooltip tooltip-${align}`} data-dismissed={isDismissed || undefined}>
      {children({
        'aria-label': text,
        onKeyDown: (e) => {
          if (e.key === 'Escape') setIsDismissed(true)
        },
        onBlur: () => setIsDismissed(false),
        onMouseLeave: () => setIsDismissed(false),
      })}
      <span className="tooltip" aria-hidden="true">{text}</span>
    </span>
  )
}
