const FIELD_SEP = "\x1f"

export function splitAnkiFields(flds: string): string[] {
  return flds.split(FIELD_SEP)
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/~~/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function extractMediaRefs(html: string): string[] {
  const refs: string[] = []
  const re = /(?:src|href)=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    refs.push(m[1])
  }
  return refs
}

export function hasGapMarker(raw: string): boolean {
  return (
    /_{2,}/.test(raw) ||
    /[\uFF3F]{2,}/.test(raw) ||
    raw.includes("___")
  )
}

/** Map Anki / deck fullwidth or ASCII underscore gaps to Benkyou's `___` marker. */
export function normalizeGapMarkers(text: string): string {
  return text
    .replace(/[\uFF3F]{2,}/g, "___")
    .replace(/_{2,}/g, "___")
}

export function containsJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9fff]/.test(text)
}

/** Lines intended as English glosses (definitions, grammar hints). */
export function isEnglishLine(text: string): boolean {
  return /[a-zA-Z]/.test(text)
}

/** Lines whose meaning is carried by emoji / pictographs (e.g. a 🐌🐢 gloss). */
export function isPictographLine(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text)
}

export function isWrappedJapanese(text: string): boolean {
  const s = text.trim()
  return (
    (s.startsWith("«") && s.endsWith("»")) ||
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("「") && s.endsWith("」"))
  )
}

export function unwrapJapanese(text: string): string {
  const s = text.trim()
  if (s.startsWith("«") && s.endsWith("»")) return s.slice(1, -1)
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1)
  if (s.startsWith("「") && s.endsWith("」")) return s.slice(1, -1)
  return s
}

/** Drop a trailing "の読み" ("the reading of …") annotation if present. */
export function stripReadingSuffix(text: string): string {
  return text.trim().replace(/の読み$/, "").trim()
}

/** True when a field carries a trailing "の読み" reading annotation. */
export function hasReadingSuffix(text: string): boolean {
  return /の読み$/.test(text.trim())
}

/**
 * The bare kana reading carried by a "reading" note's hiragana side, tolerating
 * optional quote wrapping and a trailing "の読み" in either nesting order
 * (e.g. "«じん»の読み", "«じんの読み»", and "じんの読み" all yield "じん").
 */
export function readingValue(text: string): string {
  let s = text.trim()
  for (let i = 0; i < 2; i += 1) {
    s = stripReadingSuffix(unwrapJapanese(s))
  }
  return s
}

export function normalizeHeadwordKey(text: string): string {
  // Match on the headword itself: strip quote wrapping, punctuation/whitespace,
  // and a trailing "の読み" annotation so "陣の読み" keys the same as "陣" and
  // finds its meaning/type siblings.
  return unwrapJapanese(text)
    .replace(/[«»"「」]/g, "")
    .replace(/[!！?？…。、\s]/g, "")
    .replace(/の読み$/, "")
    .trim()
}

export function containsKanji(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x4e00 && cp <= 0x9fff) return true
  }
  return false
}

export function isKanaOnly(text: string): boolean {
  const s = text.trim()
  if (!s) return false
  for (const ch of s) {
    if (ch.trim() === "") continue
    const cp = ch.codePointAt(0)!
    const isKana =
      (cp >= 0x3040 && cp <= 0x309f) ||
      (cp >= 0x30a0 && cp <= 0x30ff) ||
      ch === "ー" ||
      ch === "・"
    if (!isKana) return false
  }
  return true
}

function htmlToLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/~~/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

/** English glosses plus emoji/pictograph meanings (e.g. a 🐌🐢 gloss). */
export function extractEnglishLines(...htmlParts: string[]): string[] {
  const lines: string[] = []
  for (const html of htmlParts) {
    for (const line of htmlToLines(html)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (containsJapanese(trimmed)) continue
      if (!isEnglishLine(trimmed) && !isPictographLine(trimmed)) continue
      if (trimmed.includes("___")) continue
      lines.push(trimmed)
    }
  }
  return [...new Set(lines)]
}

export function normalizeConstruction(text: string): string {
  return text
    .split(/[、,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ")
}

export function mimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".webp")) return "image/webp"
  return "application/octet-stream"
}
