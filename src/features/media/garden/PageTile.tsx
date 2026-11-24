import { Tooltip } from '../../../journal/controls/Tooltip';
import { NumberInput } from './NumberInput';

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
      <NumberInput
        name="page"
        aria-label="Page"
        defaultValue={page}
        min={0}
        max={pages}
      />
      {pages && <span className="page-total">/{pages}</span>}
    </div>
  );
}
