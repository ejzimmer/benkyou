export type FontStyle = 'fancy' | 'plain'

const KEY = 'yomu.fontStyle'

export function getFontStyle(): FontStyle {
  try {
    return localStorage.getItem(KEY) === 'plain' ? 'plain' : 'fancy'
  } catch {
    return 'fancy'
  }
}

export function saveFontStyle(fontStyle: FontStyle) {
  localStorage.setItem(KEY, fontStyle)
}

export function applyFontStyle(fontStyle: FontStyle) {
  document.documentElement.dataset.fontStyle = fontStyle
}
