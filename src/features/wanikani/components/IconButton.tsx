import './IconButton.css'
import type { ComponentProps } from 'react'
import { LoadingKanji } from './LoadingKanji'
import { Tooltip } from './Tooltip'

type Props = Omit<ComponentProps<'button'>, 'aria-label' | 'title' | 'onKeyDown' | 'onBlur' | 'onMouseLeave'> & {
  label: string
  tooltipAlign?: 'center' | 'end'
  isLoading?: boolean
}

export function IconButton({ label, tooltipAlign, isLoading = false, children, onClick, ...buttonProps }: Props) {
  return (
    <Tooltip text={label} align={tooltipAlign}>
      {(tooltipProps) => (
        <button
          {...buttonProps}
          {...tooltipProps}
          aria-disabled={isLoading || undefined}
          onClick={(e) => {
            if (isLoading) {
              e.preventDefault()
              return
            }
            onClick?.(e)
          }}
        >
          {isLoading ? <LoadingKanji /> : children}
        </button>
      )}
    </Tooltip>
  )
}
