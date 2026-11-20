export const readText = (data: FormData, name: string) =>
  String(data.get(name) ?? '').trim() || undefined;

export const readNumber = (data: FormData, name: string) =>
  Number(data.get(name)) || undefined;

export const parseNumber = (data: FormData, name: string) => {
  const value = readText(data, name);
  return value === undefined ? undefined : Number(value);
};

export const readDuration = (data: FormData, name: string) => {
  const [hours, minutes, seconds] = (
    ['hours', 'minutes', 'seconds'] as const
  ).map((unit) => readText(data, `${name}-${unit}`));
  if (hours === undefined && minutes === undefined && seconds === undefined) {
    return undefined;
  }
  return Temporal.Duration.from({
    hours: Number(hours ?? 0),
    minutes: Number(minutes ?? 0),
    seconds: Number(seconds ?? 0),
  }).total('seconds');
};

export type FieldProps<T> = {
  label: string;
  name: string;
  defaultValue?: T;
  isRequired?: boolean;
};
