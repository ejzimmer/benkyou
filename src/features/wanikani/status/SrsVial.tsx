import { CSSProperties } from 'react';
import { Gem } from './Gem';
import { EMPTY_GEM_COLOUR, GEM_COLOURS } from './gemColours';
import { formatPoints, getHexVertices } from './gemGeometry';
import { SUBJECT_TYPE_LABELS } from './subjectTypeLabels';
import { SRS_GROUPS, SrsGroup, SubjectType } from './types';
import { SvgTooltip } from '../../../journal/controls/SvgTooltip';
import { calculateLiquidLayers, createBubbles, drawTube } from './vialGeometry';

const WIDTH = 52;
const HEIGHT = 366;
const TUBE_TOP = 40;
const TUBE_BOTTOM = HEIGHT - 4;
const GLASS_THICKNESS = 3;
const LIQUID_TOP = TUBE_TOP + 2;
const LIQUID_BOTTOM = TUBE_BOTTOM - GLASS_THICKNESS;
const BUBBLE_COUNT = 9;

type SrsVialProps = {
  type: SubjectType;
  index: number;
  total: number;
  counts: Record<SrsGroup, number>;
};

export function SrsVial({ type, index, total, counts }: SrsVialProps) {
  const label = SUBJECT_TYPE_LABELS[type];
  const description = SRS_GROUPS.map(
    (group) => `${counts[group]} ${group}`,
  ).join(', ');
  const colour = GEM_COLOURS[type].base;
  const tube = drawTube(6, WIDTH - 6, TUBE_TOP, TUBE_BOTTOM);
  const { layers, surfaceY } = calculateLiquidLayers(
    counts,
    total,
    LIQUID_TOP,
    LIQUID_BOTTOM,
  );
  const bubbles = createBubbles(BUBBLE_COUNT, index + 1, {
    left: 14,
    right: WIDTH - 14,
    bottom: LIQUID_BOTTOM - 6,
    surfaceY: surfaceY + 2,
  });
  const innerClipId = `wanikani-status-vial-${type}`;
  const liquidClipId = `wanikani-status-liquid-${type}`;

  return (
    <svg
      className="srs-vial"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`${label}: ${description} of ${total}`}
    >
      <defs>
        <clipPath id={innerClipId}>
          <path
            d={drawTube(
              6 + GLASS_THICKNESS,
              WIDTH - 6 - GLASS_THICKNESS,
              TUBE_TOP,
              TUBE_BOTTOM,
            )}
          />
        </clipPath>
        <clipPath id={liquidClipId}>
          <rect x="0" y={surfaceY} width={WIDTH} height={HEIGHT} />
        </clipPath>
      </defs>
      <polygon
        points={formatPoints(getHexVertices(WIDTH / 2, 13, 12))}
        fill="url(#wanikani-status-gold)"
      />
      <Gem type={type} cx={WIDTH / 2} cy={13} r={10} percent={100} hasSparkle />
      <rect
        x="10"
        y="28"
        width={WIDTH - 20}
        height="10"
        rx="2"
        fill="url(#wanikani-status-gold)"
      />
      <rect
        x="7"
        y="36"
        width={WIDTH - 14}
        height="5"
        rx="2"
        fill="url(#wanikani-status-gold)"
      />
      <path d={tube} fill={EMPTY_GEM_COLOUR} fillOpacity={0.5} />
      <path
        d={tube}
        fill={colour}
        fillOpacity={0.12}
        stroke={colour}
        strokeOpacity={0.6}
        strokeWidth={1.5}
      />
      <g clipPath={`url(#${innerClipId})`}>
        {layers.map(({ group, y, height }) => (
          <SvgTooltip key={group} content={`${counts[group]} ${group}`}>
            {(triggerProps) => (
              <rect
                {...triggerProps}
                x="0"
                y={y}
                width={WIDTH}
                height={height + 0.5}
                fill={`url(#wanikani-status-liquid-${group})`}
                data-testid={`${group}-layer`}
              />
            )}
          </SvgTooltip>
        ))}
        <g clipPath={`url(#${liquidClipId})`} pointerEvents="none">
          {bubbles.map((bubble, bubbleIndex) => (
            <g
              key={bubbleIndex}
              className="bubble-drift"
              style={
                {
                  '--drift': `${bubble.drift}px`,
                  animationDuration: `${bubble.duration / 2}s`,
                  animationDelay: `${bubble.delay}s`,
                } as CSSProperties
              }
            >
              <circle
                className="bubble-rise"
                cx={bubble.x}
                cy={bubble.y}
                r={bubble.r}
                fill="white"
                fillOpacity={0.35}
                stroke="white"
                strokeOpacity={0.8}
                strokeWidth={0.6}
                style={
                  {
                    '--rise': `${bubble.rise}px`,
                    animationDuration: `${bubble.duration}s`,
                    animationDelay: `${bubble.delay}s`,
                  } as CSSProperties
                }
              />
            </g>
          ))}
        </g>
      </g>
      <rect
        x="11"
        y="46"
        width="4"
        height={TUBE_BOTTOM - 76}
        rx="2"
        fill="white"
        fillOpacity={0.45}
        pointerEvents="none"
      />
      <rect
        x="17"
        y="46"
        width="1.5"
        height={TUBE_BOTTOM - 76}
        rx="0.75"
        fill="white"
        fillOpacity={0.3}
        pointerEvents="none"
      />
    </svg>
  );
}
