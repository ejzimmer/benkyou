import { Gem } from './Gem';
import {
  calculateClusterLayout,
  formatPoints,
  getHexVertices,
} from './gemGeometry';
import { SUBJECT_TYPE_LABELS } from './subjectTypeLabels';
import { SUBJECT_TYPES, SubjectType } from './types';
import { SvgTooltip } from '../../../journal/controls/SvgTooltip';

const SETTING_RADIUS = 16;
const layout = calculateClusterLayout(SETTING_RADIUS);

type LevelGemClusterProps = {
  level: number;
  counts: Record<SubjectType, { counted: number; total: number }>;
  percents: Record<SubjectType, number>;
  burned: Record<SubjectType, boolean>;
};

export function LevelGemCluster({
  level,
  counts,
  percents,
  burned,
}: LevelGemClusterProps) {
  const description = SUBJECT_TYPES.map(
    (type) =>
      `${SUBJECT_TYPE_LABELS[type]} ${percents[type]}% unlocked${burned[type] ? ' and burned' : ''}`,
  ).join(', ');

  return (
    <svg
      className="level-gem-cluster"
      viewBox={layout.viewBox}
      width={layout.width}
      height={layout.height}
      role="img"
      aria-label={`Level ${level}: ${description}`}
    >
      {SUBJECT_TYPES.map((type) => (
        <polygon
          key={type}
          points={formatPoints(
            getHexVertices(...layout.centres[type], layout.settingRadius),
          )}
          fill={burned[type] ? 'url(#wanikani-status-gold)' : 'url(#wanikani-status-grey)'}
        />
      ))}
      {SUBJECT_TYPES.map((type) => (
        <SvgTooltip
          key={type}
          content={`${SUBJECT_TYPE_LABELS[type]}: ${counts[type].counted}/${counts[type].total}`}
        >
          {(triggerProps) => (
            <g {...triggerProps} data-testid={`${type}-gem`}>
              <Gem
                type={type}
                cx={layout.centres[type][0]}
                cy={layout.centres[type][1]}
                r={layout.gemRadius}
                percent={percents[type]}
                hasSparkle={burned[type]}
              />
            </g>
          )}
        </SvgTooltip>
      ))}
      <text
        x={layout.label.x}
        y={layout.label.y}
        textAnchor="end"
        dominantBaseline="central"
        aria-hidden="true"
      >
        {level}
      </text>
    </svg>
  );
}
