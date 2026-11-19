import { formatDayAndMonth, getLocalDate } from '../../../journal/dates';

type UpdateDateProps = { instant: string };

export function UpdateDate({ instant }: UpdateDateProps) {
  return (
    <time className="progress-update-date" dateTime={instant}>
      {formatDayAndMonth(getLocalDate(instant))}
    </time>
  );
}
