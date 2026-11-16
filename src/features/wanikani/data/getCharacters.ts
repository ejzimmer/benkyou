import type { Subject } from '../api/types'

// Some radicals only exist as an image, with no characters; their slug is the best text stand-in.
export function getCharacters(subject: Subject) {
  return subject.characters ?? subject.slug
}
