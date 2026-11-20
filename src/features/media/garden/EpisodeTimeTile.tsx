import { DurationField } from './DurationField';
import { formatMinutesAndSeconds } from './format';
import { Tooltip } from '../../../journal/controls/Tooltip';

type EpisodeTimeTileProps = {
  timestampInSeconds?: number;
  lengthInSeconds?: number;
};

export function EpisodeTimeTile({
  timestampInSeconds,
  lengthInSeconds,
}: EpisodeTimeTileProps) {
  return (
    <div className="progress-tile time-tile">
      <Tooltip label="Up to" position="top">
        {(triggerProps) => (
          <span {...triggerProps} className="page-icon" aria-hidden="true">
            ⏱️
          </span>
        )}
      </Tooltip>
      <DurationField
        label="Up to"
        name="timestamp"
        defaultValue={timestampInSeconds}
        durationFormat="mm:ss"
      />
      {lengthInSeconds !== undefined && (
        <span className="page-total">
          / {formatMinutesAndSeconds(lengthInSeconds)}
        </span>
      )}
    </div>
  );
}
