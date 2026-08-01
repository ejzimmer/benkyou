/** yyyy年M月d日 — conventional Japanese date. Month/day aren't zero-padded;
 *  the 年/月/日 separators already make the numbers unambiguous. */
export function formatDateJa(epochMs: number): string {
  const d = new Date(epochMs)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** yyyy年M月d日 HH:mm */
export function formatDateTimeJa(epochMs: number | undefined): string {
  if (epochMs == null) return "—"
  const d = new Date(epochMs)
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${formatDateJa(epochMs)} ${hours}:${minutes}`
}
