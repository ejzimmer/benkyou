import { Tooltip } from '../shared/controls/Tooltip';

type VideoUrlTileProps = {
  name?: string;
  defaultValue?: string;
};

export function VideoUrlTile({
  name = 'url',
  defaultValue,
}: VideoUrlTileProps) {
  return (
    <div className="progress-tile url-tile">
      <Tooltip label="URL" position="top">
        {(triggerProps) => (
          <span {...triggerProps} className="page-icon" aria-hidden="true">
            🔗
          </span>
        )}
      </Tooltip>
      <input
        type="url"
        name={name}
        aria-label="URL"
        defaultValue={defaultValue}
        required
      />
    </div>
  );
}
