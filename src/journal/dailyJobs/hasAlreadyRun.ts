export const hasAlreadyRun = (lastRun: unknown, day: string) =>
  typeof lastRun === 'string' && Temporal.PlainDate.compare(lastRun, day) >= 0;
