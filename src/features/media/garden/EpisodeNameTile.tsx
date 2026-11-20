import { Tooltip } from '../../../journal/controls/Tooltip';

export function EpisodeNameTile() {
  return (
    <div className="progress-tile url-tile">
      <Tooltip label="Name" position="top">
        {(triggerProps) => (
          <span {...triggerProps} className="page-icon" aria-hidden="true">
            🎬
          </span>
        )}
      </Tooltip>
      <input name="name" aria-label="Name" />
    </div>
  );
}
