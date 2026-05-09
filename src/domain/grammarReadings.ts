/** Serialize kanji→reading map for the grammar card editor (one `key=value` per line). */
export function grammarReadingsToText(readings: Record<string, string>): string {
  return Object.entries(readings)
    .filter(([k]) => k.trim().length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")
}

/** Parse completed `kanji=reading` lines; lines without `=` are ignored (draft lines live only in textarea state). */
export function parseGrammarReadingsText(text: string): Record<string, string> {
  const readings: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const idx = line.indexOf("=")
    if (idx === -1) continue
    const k = line.slice(0, idx).trim()
    if (!k) continue
    readings[k] = line.slice(idx + 1).trim()
  }
  return readings
}
