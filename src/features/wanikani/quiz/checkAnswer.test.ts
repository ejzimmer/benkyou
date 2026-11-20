import { describe, expect, it } from 'vitest'
import type { Resource, Subject } from '../api/types'
import { checkAnswer } from './checkAnswer'

const makeResource = (object: string, data: Subject) => ({ id: 1, object, url: '', data_updated_at: null, data }) as Resource<Subject>

const person = makeResource('kanji', {
  characters: '人',
  meanings: [{ meaning: 'Person', primary: true, accepted_answer: true }],
  auxiliary_meanings: [],
  readings: [
    { reading: 'じん', primary: true, accepted_answer: true, type: 'onyomi' },
    { reading: 'ひと', primary: false, accepted_answer: false, type: 'kunyomi' },
  ],
} as unknown as Subject)

describe('checkAnswer', () => {
  it('marks answers right or wrong', () => {
    expect(checkAnswer('person', 'meaning', person, [])).toBe('correct')
    expect(checkAnswer('dog', 'meaning', person, [])).toBe('incorrect')
    expect(checkAnswer('jin', 'reading', person, [])).toBe('correct')
    expect(checkAnswer('nin', 'reading', person, [])).toBe('incorrect')
  })

  it('says why an answer can’t be marked', () => {
    expect(checkAnswer(' ', 'meaning', person, [])).toBe('blank')
    expect(checkAnswer('ひと', 'meaning', person, [])).toBe('not-english')
    expect(checkAnswer('jix', 'reading', person, [])).toBe('not-kana')
    expect(checkAnswer('hito', 'reading', person, [])).toBe('onyomi-wanted')
  })

  describe('when the answer belongs to a lookalike subject', () => {
    const mountainData = {
      characters: '山',
      meanings: [{ meaning: 'Mountain', primary: true, accepted_answer: true }],
      auxiliary_meanings: [],
      readings: [
        { reading: 'さん', primary: true, accepted_answer: true, type: 'onyomi' },
        { reading: 'やま', primary: false, accepted_answer: false, type: 'kunyomi' },
      ],
    } as unknown as Subject

    const makeLookalike = (object: string, data: Partial<Subject>) => makeResource(object, { ...mountainData, ...data })

    const mountainVocabulary = makeLookalike('vocabulary', {
      readings: [{ reading: 'やま', primary: true, accepted_answer: true }],
    } as Partial<Subject>)
    const mountainRadical = makeLookalike('radical', {
      meanings: [{ meaning: 'Peak', primary: true, accepted_answer: true }],
      readings: undefined,
    })
    const mountainKanji = makeLookalike('kanji', {})

    it('says which subject’s answer is wanted', () => {
      expect(checkAnswer('peak', 'meaning', mountainKanji, [], [mountainRadical])).toBe('kanji-meaning-wanted')
      expect(checkAnswer('yama', 'reading', mountainKanji, [], [mountainVocabulary])).toBe('kanji-reading-wanted')
      expect(checkAnswer('san', 'reading', mountainVocabulary, [], [mountainKanji])).toBe('vocabulary-reading-wanted')
      expect(checkAnswer('mountain', 'meaning', mountainRadical, [], [mountainKanji])).toBe('radical-meaning-wanted')
    })

    it('marks answers that are right for this subject too as correct', () => {
      expect(checkAnswer('mountain', 'meaning', mountainVocabulary, [], [mountainKanji])).toBe('correct')
    })

    it('marks answers that fit no subject as incorrect', () => {
      expect(checkAnswer('river', 'meaning', mountainKanji, [], [mountainRadical, mountainVocabulary])).toBe('incorrect')
    })
  })
})
