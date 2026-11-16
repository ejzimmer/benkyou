import { useId } from 'react'
import type { CharacterImage, Subject } from '../api/types'
import { findCharacterImage } from '../data/findCharacterImage'

interface Props {
  subject: Subject
}

export function SubjectCharacters({ subject }: Props) {
  if (subject.characters !== null) return subject.characters

  const image = findCharacterImage(subject)
  if (!image) return subject.slug
  return <CharacterImageGlyph image={image} label={subject.slug} />
}

function CharacterImageGlyph({ image, label }: { image: CharacterImage; label: string }) {
  const filterId = `tint-${useId().replaceAll(/[^\w-]/gu, '')}`

  // The images are black; the filter repaints them in the surrounding text colour, like a font glyph.
  return (
    <>
      <span className="visually-hidden">{label}</span>
      <svg className="character-image" aria-hidden="true" viewBox="0 0 1 1" width="1em" height="1em">
        <filter id={filterId}>
          <feFlood floodColor="currentColor" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <image href={image.url} width="1" height="1" filter={`url(#${filterId})`} />
      </svg>
    </>
  )
}
