import { Tooltip } from '../../../journal/controls/Tooltip';
import { digitsStyle } from './digitsStyle';

type PageTileProps = { page?: number; pages?: number };

export function PageTile({ page, pages }: PageTileProps) {
  return (
    <div className="progress-tile page-tile">
      <Tooltip label="Page" position="top">
        {(triggerProps) => (
          <span {...triggerProps} className="page-icon" aria-hidden="true">
            📖
          </span>
        )}
      </Tooltip>
      <input
        type="number"
        name="page"
        aria-label="Page"
        defaultValue={page}
        min={0}
        max={pages}
        style={digitsStyle(pages ?? page)}
      />
      {pages && <span className="page-total">/{'\u2009'}{pages}</span>}
    </div>
  );
}
