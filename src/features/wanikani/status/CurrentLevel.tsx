import { StopWatchIcon } from '../../../journal/icons/StopWatch';
import { Tooltip } from '../../../journal/controls/Tooltip';
import { formatDayMonthAndYear, getDateDaysAhead } from '../../../journal/dates';
import { LevelBadge } from './LevelBadge';
import { LevelRings } from './LevelRings';
import { predictDaysToFinish } from './levelPrediction';
import { calculateLevelProgress } from './levelProgress';
import { MAX_LEVEL, WaniKaniData } from './types';

type CurrentLevelProps = { data: WaniKaniData };

export function CurrentLevel({ data }: CurrentLevelProps) {
  const { radical, kanji } = calculateLevelProgress(
    data.subjects,
    data.assignments,
    data.level,
  );

  const daysToFinish = predictDaysToFinish(data.levelProgressions, data.level);

  return (
    <section className="current-level" aria-label={`Level ${data.level}`}>
      <LevelRings radical={radical} kanji={kanji} />
      <div className="current-level-badge">
        <LevelBadge />
        <div className="level-number" aria-hidden="true">
          {data.level}
        </div>
      </div>
      {daysToFinish !== undefined && (
        <Tooltip label={formatDayMonthAndYear(getDateDaysAhead(daysToFinish))}>
          {(triggerProps) => (
            <div {...triggerProps} className="days-remaining">
              <StopWatchIcon
                width="16px"
                role="img"
                aria-label="Days remaining"
                handAngleDegrees={((data.level - 1) / MAX_LEVEL) * 360}
              />
              {daysToFinish}
            </div>
          )}
        </Tooltip>
      )}
    </section>
  );
}
