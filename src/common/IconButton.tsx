import { ButtonHTMLAttributes, ElementType, forwardRef } from "react"

type ButtonType = ButtonHTMLAttributes<HTMLButtonElement>["type"]

type Props = {
  label: string
  onClick?: (event: React.MouseEvent) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  type?: ButtonType
  size?: string
  isSecondary?: boolean
  icon: ElementType
  className?: string
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  function IconButton(
    {
      onClick,
      onKeyDown,
      size = "40px",
      type = "button",
      isSecondary,
      icon: Icon,
      className,
      label,
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        style={{
          opacity: isSecondary ? 0.8 : 1,
          width: size,
          height: size,
          padding: 0,
        }}
        onClick={onClick}
        onKeyDown={onKeyDown}
        type={type}
        className={className}
        aria-label={label}
      >
        <Icon />
      </button>
    )
  }
)
