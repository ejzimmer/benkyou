import { GEM_COLOURS } from './gemColours';
import { calculateRingDash, drawStar, findPointOnRing } from './ringGeometry';
import { SvgTooltip } from '../../../journal/controls/SvgTooltip';

const SIZE = 200;
const CENTRE = SIZE / 2;
const KANJI_RADIUS = 86;
const RADICAL_RADIUS = 74;

type LevelRingsProps = {
  radical: { passed: number; total: number };
  kanji: { passed: number; total: number; needed: number };
};

export function LevelRings({ radical, kanji }: LevelRingsProps) {
  const rings = [
    {
      type: 'kanji',
      r: KANJI_RADIUS,
      width: 9,
      label: `Kanji: ${kanji.passed}/${kanji.total}`,
      fraction: kanji.total ? kanji.passed / kanji.total : 0,
    },
    {
      type: 'radical',
      r: RADICAL_RADIUS,
      width: 7,
      label: `Radicals: ${radical.passed}/${radical.total}`,
      fraction: radical.total ? radical.passed / radical.total : 0,
    },
  ] as const;
  const goal = findPointOnRing(
    CENTRE,
    CENTRE,
    KANJI_RADIUS,
    kanji.total ? kanji.needed / kanji.total : 0,
  );

  return (
    <svg
      className="level-rings"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={`Radicals ${radical.passed} of ${radical.total}, Kanji ${kanji.passed} of ${kanji.needed}`}
    >
      {rings.map(({ type, r, width, label, fraction }) => (
        <SvgTooltip key={type} content={label}>
          {(triggerProps) => (
            <g {...triggerProps} data-testid={`${type}-ring`}>
              <circle
                cx={CENTRE}
                cy={CENTRE}
                r={r}
                stroke={GEM_COLOURS[type].base}
                strokeOpacity={0.18}
                strokeWidth={width}
                fill="none"
              />
              {fraction > 0 && (
                <circle
                  cx={CENTRE}
                  cy={CENTRE}
                  r={r}
                  stroke={`url(#wanikani-status-gem-${type})`}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeDasharray={calculateRingDash(r, fraction)}
                  fill="none"
                  transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
                />
              )}
            </g>
          )}
        </SvgTooltip>
      ))}
      <path
        d={drawStar(...goal, 7)}
        fill="url(#wanikani-status-gold)"
        stroke="#7a5a14"
        strokeWidth={0.5}
      />
    </svg>
  );
}
