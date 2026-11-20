const KEY = 'yomu.celebratedLevel'

export function getCelebratedLevel(): number | null {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === null ? null : Number(stored)
  } catch {
    return null
  }
}

export function saveCelebratedLevel(level: number) {
  localStorage.setItem(KEY, String(level))
}
