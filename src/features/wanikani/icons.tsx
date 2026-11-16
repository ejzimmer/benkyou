const common = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const

export const ArrowIcon = () => (
  <svg {...common}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
)

export const SignOutIcon = () => (
  <svg {...common}><path d="M15 4h4v16h-4" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></svg>
)

export const SyncIcon = () => (
  <svg {...common}><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></svg>
)

export const CloseIcon = () => (
  <svg {...common}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
)

export const UndoIcon = () => (
  <svg {...common}><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
)

export const StageUpIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21V4" /><path d="M3 12l9-9 9 9" /></svg>
)

export const BackIcon = () => (
  <svg {...common}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg>
)

export const PlusIcon = () => (
  <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
)

export const HourglassIcon = () => (
  <svg {...common}><path d="M6 3h12" /><path d="M6 21h12" /><path d="M7 3c0 5 5 6 5 9s-5 4-5 9" /><path d="M17 3c0 5-5 6-5 9s5 4 5 9" /></svg>
)

export const TickIcon = () => (
  <svg {...common}><path d="M5.5 13.5L10 18.5L18.5 4.5" /></svg>
)
