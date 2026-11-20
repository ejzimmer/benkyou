import type { CharacterImage, Subject } from '../api/types'

export function findCharacterImage(subject: Subject) {
  const images = subject.character_images ?? []
  // SVGs without inline styles rely on WaniKani's own stylesheet, so they render blank on their own.
  return images.find((image) => isStandaloneSvg(image)) ?? images.filter((image) => isPng(image)).toSorted(compareSizes).at(-1)
}

function isStandaloneSvg(image: CharacterImage) {
  return image.content_type === 'image/svg+xml' && image.metadata.inline_styles === true
}

function isPng(image: CharacterImage) {
  return image.content_type === 'image/png'
}

function compareSizes(a: CharacterImage, b: CharacterImage) {
  return getWidth(a) - getWidth(b)
}

function getWidth(image: CharacterImage) {
  return Number(image.metadata.dimensions?.split('x')[0] ?? 0)
}
