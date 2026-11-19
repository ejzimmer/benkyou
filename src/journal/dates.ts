const monthFormatter = Intl.DateTimeFormat('en-AU', { month: 'short' });
const weekdayFormatter = Intl.DateTimeFormat('en-AU', { weekday: 'short' });

const getTodaysPlainDate = () => Temporal.Now.plainDateISO();

const getStartOfWeek = (date: Temporal.PlainDate) =>
  date.subtract({ days: date.dayOfWeek - 1 });

export const getToday = () => getTodaysPlainDate().toString();

export const getThisMonth = () => getTodaysPlainDate().toPlainYearMonth();

export const getThisYear = () => getTodaysPlainDate().year;

export const getDateDaysAgo = (days: number) =>
  getTodaysPlainDate().subtract({ days }).toString();

export const getDateDaysAhead = (days: number) =>
  getTodaysPlainDate().add({ days }).toString();

export const getLocalDate = (instant: string) =>
  Temporal.Instant.from(instant)
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDate()
    .toString();

export const isToday = (date: string) =>
  Temporal.PlainDate.compare(date, getToday()) === 0;

export const isBeforeToday = (date: string) =>
  Temporal.PlainDate.compare(date, getToday()) < 0;

export const isAfterToday = (date: string) =>
  Temporal.PlainDate.compare(date, getToday()) > 0;

export const isThisWeek = (date: string) =>
  getStartOfWeek(Temporal.PlainDate.from(date)).equals(
    getStartOfWeek(getTodaysPlainDate()),
  );

export const getDaysSince = (date: string) =>
  getTodaysPlainDate().since(date, { largestUnit: 'day' }).days;

export const getDaysUntil = (date: string) =>
  Temporal.PlainDate.from(date).since(getTodaysPlainDate(), {
    largestUnit: 'day',
  }).days;

export const getMillisecondsUntilTomorrow = () => {
  const now = Temporal.Now.zonedDateTimeISO();

  return (
    now.startOfDay().add({ days: 1 }).epochMilliseconds - now.epochMilliseconds
  );
};

export const formatDateId = (date: Temporal.PlainDate) => date.toString();

const formatMonth = (date: Temporal.PlainDate) =>
  monthFormatter.format(date).substring(0, 3);

export const formatDate = (date: Temporal.PlainDate) => ({
  day: date.day,
  month: formatMonth(date),
  year: date.year.toString().substring(2),
});

export const formatMonthAndYear = (yearMonth: Temporal.PlainYearMonth) =>
  `${formatMonth(yearMonth.toPlainDate({ day: 1 }))} ${yearMonth.year}`;

export const formatDayAndMonth = (date: string) => {
  const plainDate = Temporal.PlainDate.from(date);

  return `${plainDate.day.toString().padStart(2, '0')} ${formatMonth(plainDate)}`;
};

export const formatDayMonthAndYear = (date: string) => {
  const plainDate = Temporal.PlainDate.from(date);

  return `${plainDate.day} ${formatMonth(plainDate)} ${plainDate.year}`;
};

export const formatWeekdayDayAndMonth = (date: string) => {
  const plainDate = Temporal.PlainDate.from(date);

  return `${weekdayFormatter.format(plainDate)} ${plainDate.day} ${formatMonth(plainDate)}`;
};
