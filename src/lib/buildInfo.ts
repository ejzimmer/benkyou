/** Set at build time in vite.config.ts — use to confirm prod has the latest deploy. */
export const BUILD_LABEL: string =
  typeof __BUILD_LABEL__ !== "undefined" ? __BUILD_LABEL__ : "dev"
