import { CSSProperties } from 'react';

const MIN_DIGITS = 3;

/** Sets `--digits` so a number input is wide enough for `value`, and never
 * narrower than three digits so there's room to type past a small value. */
export function digitsStyle(value: number | undefined) {
  const digits = Math.max(MIN_DIGITS, String(value ?? '').length);
  return { '--digits': digits } as CSSProperties;
}
