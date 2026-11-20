import { calculateGemShape } from './gemGeometry';
import { EMPTY_GEM_COLOUR, GEM_COLOURS } from './gemColours';
import { SubjectType } from './types';

type GemProps = {
  type: SubjectType;
  cx: number;
  cy: number;
  r: number;
  percent: number;
  hasSparkle: boolean;
};

export function Gem({ type, cx, cy, r, percent, hasSparkle }: GemProps) {
  const shape = calculateGemShape(cx, cy, r, percent);
  const colour = GEM_COLOURS[type].base;

  return (
    <g>
      <polygon
        points={shape.outline}
        fill={EMPTY_GEM_COLOUR}
        fillOpacity={0.5}
      />
      <polygon
        points={shape.outline}
        fill={colour}
        fillOpacity={0.12}
        stroke={colour}
        strokeOpacity={0.6}
      />
      {!shape.isEmpty && (
        <polygon
          points={shape.fill}
          fill={`url(#wanikani-status-gem-${type})`}
          filter={shape.isFull ? `url(#wanikani-status-glow-${type})` : undefined}
        />
      )}
      {shape.surface && (
        <polyline
          points={shape.surface}
          stroke="white"
          strokeOpacity={0.85}
          strokeWidth={1.2}
          fill="none"
        />
      )}
      <path
        d={shape.facets}
        stroke={shape.isEmpty ? colour : 'white'}
        strokeOpacity={shape.isEmpty ? 0.35 : shape.isFull ? 0.5 : 0.3}
        strokeWidth={0.8}
        fill="none"
      />
      {shape.isFull && (
        <polygon points={shape.highlight} fill="white" fillOpacity={0.45} />
      )}
      {hasSparkle && <path d={shape.sparkle} fill="white" />}
    </g>
  );
}
