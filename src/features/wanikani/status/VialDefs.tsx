import { SRS_LIQUID_COLOURS } from './srsLiquidColours';
import { SRS_GROUPS } from './types';

export function VialDefs() {
  return (
    <svg className="gem-defs" aria-hidden="true">
      <defs>
        {SRS_GROUPS.map((group) => (
          <linearGradient
            key={group}
            id={`wanikani-status-liquid-${group}`}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0" stopColor={SRS_LIQUID_COLOURS[group].edge} />
            <stop offset="0.3" stopColor={SRS_LIQUID_COLOURS[group].light} />
            <stop offset="0.65" stopColor={SRS_LIQUID_COLOURS[group].base} />
            <stop offset="1" stopColor={SRS_LIQUID_COLOURS[group].dark} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}
