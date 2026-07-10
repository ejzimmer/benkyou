type Props = {
  size?: number
  className?: string
}

/** Mirrors public/favicon.svg so the header shows the same mark as the tab icon. */
export function AppIcon({ size = 28, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="6" fill="#1a1a2e" />
      <text
        x="16"
        y="25"
        textAnchor="middle"
        fontFamily="'Yu Mincho','Hiragino Mincho ProN','Noto Serif JP',serif"
        fontSize="26"
        fill="var(--pink)"
      >
        学
      </text>
    </svg>
  )
}
