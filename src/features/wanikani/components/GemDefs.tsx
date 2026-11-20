import './GemDefs.css'

const GEM_TYPES = ['radical', 'kanji', 'vocab'] as const

export function GemDefs() {
  return (
    <svg className="gem-defs" aria-hidden="true">
      <defs>
        {GEM_TYPES.map((type) => (
          <linearGradient key={type} id={`gem-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`var(--${type}-light)`} />
            <stop offset="0.45" stopColor={`var(--${type})`} />
            <stop offset="1" stopColor={`var(--${type}-dark)`} />
          </linearGradient>
        ))}
        {GEM_TYPES.map((type) => (
          <filter key={type} id={`gem-glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={`var(--${type})`} floodOpacity="0.9" />
          </filter>
        ))}
      </defs>
    </svg>
  )
}
