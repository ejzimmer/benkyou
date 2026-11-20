import { describe, expect, it } from 'vitest'
import type { CharacterImage, Subject } from '../api/types'
import { findCharacterImage } from './findCharacterImage'

const makeSubject = (images: CharacterImage[]) => ({ characters: null, character_images: images }) as unknown as Subject

const svg = (inlineStyles: boolean): CharacterImage => ({
  url: `svg-${inlineStyles}`,
  content_type: 'image/svg+xml',
  metadata: { inline_styles: inlineStyles },
})
const png = (dimensions: string): CharacterImage => ({ url: `png-${dimensions}`, content_type: 'image/png', metadata: { dimensions } })

describe('findCharacterImage', () => {
  it('prefers an SVG that carries its own styles', () => {
    expect(findCharacterImage(makeSubject([png('1024x1024'), svg(false), svg(true)]))?.url).toBe('svg-true')
  })

  it('falls back to the largest PNG', () => {
    expect(findCharacterImage(makeSubject([png('64x64'), svg(false), png('1024x1024'), png('256x256')]))?.url).toBe('png-1024x1024')
  })

  it('finds nothing when the subject has no images', () => {
    expect(findCharacterImage({ characters: '一' } as Subject)).toBeUndefined()
  })
})
