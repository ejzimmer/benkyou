const LAST_LEVEL = 60

export function countBlossoms(level: number, total: number) {
  return Math.round((Math.min(level, LAST_LEVEL) / LAST_LEVEL) * total)
}
