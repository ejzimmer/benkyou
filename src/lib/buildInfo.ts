import { formatDateTimeJa } from "./formatDate"

/** Set at build time in vite.config.ts — use to confirm prod has the latest deploy. */
export const BUILD_LABEL: string =
  typeof __BUILD_LABEL__ !== "undefined" ? __BUILD_LABEL__ : "dev"

/**
 * Format the (UTC, ISO) build label in the viewer's local timezone. Falls back
 * to the raw label for non-date values like "dev".
 */
export function formatBuildLabel(label: string): string {
  const date = new Date(label)
  if (Number.isNaN(date.getTime())) return label
  return formatDateTimeJa(date.getTime())
}

/** Build label formatted in the local timezone, for display. */
export const BUILD_LABEL_LOCAL: string = formatBuildLabel(BUILD_LABEL)
