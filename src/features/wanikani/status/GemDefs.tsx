import { GEM_COLOURS } from './gemColours';
import { SUBJECT_TYPES } from './types';

export function GemDefs() {
  return (
    <svg className="gem-defs" aria-hidden="true">
      <defs>
        {SUBJECT_TYPES.map((type) => (
          <linearGradient
            key={type}
            id={`wanikani-status-gem-${type}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" stopColor={GEM_COLOURS[type].light} />
            <stop offset="0.45" stopColor={GEM_COLOURS[type].base} />
            <stop offset="1" stopColor={GEM_COLOURS[type].dark} />
          </linearGradient>
        ))}
        {SUBJECT_TYPES.map((type) => (
          <filter
            key={type}
            id={`wanikani-status-glow-${type}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="2.5"
              floodColor={GEM_COLOURS[type].base}
              floodOpacity="0.9"
            />
          </filter>
        ))}
        <linearGradient id="wanikani-status-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.5" stopColor="#d4a73c" />
          <stop offset="1" stopColor="#7a5a14" />
        </linearGradient>
        <linearGradient id="wanikani-status-grey" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0f0f0" />
          <stop offset="0.5" stopColor="#a8a8a8" />
          <stop offset="1" stopColor="#5e5e5e" />
        </linearGradient>
      </defs>
    </svg>
  );
}
