import { describe, expect, it } from 'vitest'
import type { Subject } from '../api/types'
import { checkMeaning } from './checkMeaning'
import { checkReading } from './checkReading'

const makeSubject = (overrides: Partial<Subject>): Subject => ({
  level: 1,
  slug: '',
  characters: null,
  meanings: [],
  auxiliary_meanings: [],
  meaning_mnemonic: '',
  lesson_position: 0,
  spaced_repetition_system_id: 1,
  hidden_at: null,
  document_url: '',
  ...overrides,
})

const persimmon = makeSubject({
  characters: '柿',
  meanings: [
    { meaning: 'Persimmon', primary: true, accepted_answer: true },
    { meaning: 'Kaki', primary: false, accepted_answer: false },
  ],
  auxiliary_meanings: [
    { meaning: 'Persimmon Tree', type: 'whitelist' },
    { meaning: 'Peach', type: 'blacklist' },
  ],
})

const person = makeSubject({
  characters: '人',
  readings: [
    { reading: 'じん', primary: true, accepted_answer: true, type: 'onyomi' },
    { reading: 'にん', primary: false, accepted_answer: true, type: 'onyomi' },
    { reading: 'ひと', primary: false, accepted_answer: false, type: 'kunyomi' },
  ],
})

const one = makeSubject({
  characters: '一',
  meanings: [{ meaning: 'One', primary: true, accepted_answer: true }],
  readings: [
    { reading: 'いち', primary: true, accepted_answer: true, type: 'onyomi' },
    { reading: 'ひと', primary: false, accepted_answer: false, type: 'kunyomi' },
  ],
})

const toEat = makeSubject({
  characters: '食べる',
  readings: [{ reading: 'たべる', primary: true, accepted_answer: true }],
})

const tea = makeSubject({
  characters: 'お茶',
  readings: [{ reading: 'おちゃ', primary: true, accepted_answer: true }],
})

const our = makeSubject({
  characters: '我が〜',
  readings: [{ reading: 'わが', primary: true, accepted_answer: true }],
})

describe('checkMeaning', () => {
  it('accepts an accepted meaning, ignoring case and spacing', () => {
    expect(checkMeaning('  persimmon ', persimmon)).toBe('correct')
  })

  it('accepts whitelisted auxiliary meanings and the user’s synonyms', () => {
    expect(checkMeaning('persimmon tree', persimmon)).toBe('correct')
    expect(checkMeaning('sharon fruit', persimmon, ['Sharon fruit'])).toBe('correct')
  })

  it('rejects meanings that are listed but not accepted', () => {
    expect(checkMeaning('kaki', persimmon)).toBe('incorrect')
  })

  it('allows small typos in longer answers', () => {
    expect(checkMeaning('persimon', persimmon)).toBe('correct')
  })

  it('allows no typos in short answers', () => {
    const dog = makeSubject({ meanings: [{ meaning: 'Dog', primary: true, accepted_answer: true }] })
    expect(checkMeaning('dot', dog)).toBe('incorrect')
  })

  it('always rejects a blacklisted meaning', () => {
    expect(checkMeaning('peach', persimmon)).toBe('incorrect')
  })

  it('says an answer typed in Japanese isn’t English', () => {
    expect(checkMeaning('かき', persimmon)).toBe('not-english')
  })

  it('asks again for the meaning when a reading is typed in romaji', () => {
    expect(checkMeaning('ichi', one)).toBe('reading-given')
    expect(checkMeaning('hito', one)).toBe('reading-given')
    expect(checkMeaning('ni', one)).toBe('incorrect')
  })

  it('asks again for the meaning when romaji ends in the question’s kana', () => {
    const toLeak = makeSubject({
      characters: '漏れる',
      meanings: [{ meaning: 'To Leak', primary: true, accepted_answer: true }],
      readings: [{ reading: 'もれる', primary: true, accepted_answer: true }],
    })
    expect(checkMeaning('nureru', toLeak)).toBe('reading-given')
    expect(checkMeaning('Moreru', toLeak)).toBe('reading-given')
    expect(checkMeaning('to drip', toLeak)).toBe('incorrect')
    expect(checkMeaning('more', toLeak)).toBe('incorrect')
  })

  it('doesn’t treat romaji as a reading when the question has no kana', () => {
    expect(checkMeaning('same', persimmon)).toBe('incorrect')
  })
})

describe('checkReading', () => {
  it('accepts an accepted reading, in hiragana or katakana', () => {
    expect(checkReading('じん', person)).toBe('correct')
    expect(checkReading('ニン', person)).toBe('correct')
  })

  it('asks again for a real reading that isn’t the one wanted', () => {
    expect(checkReading('ひと', person)).toBe('onyomi-wanted')
  })

  it('marks other kana wrong', () => {
    expect(checkReading('じつ', person)).toBe('incorrect')
  })

  it('doesn’t ask for the 〜 that marks where a word attaches', () => {
    expect(checkReading('わが', our)).toBe('correct')
    expect(checkReading('わが〜', our)).toBe('correct')
    expect(checkReading('われが', our)).toBe('incorrect')
  })

  it('converts romaji, and says an answer that won’t convert isn’t kana', () => {
    expect(checkReading('jin', person)).toBe('correct')
    expect(checkReading('じq', person)).toBe('not-kana')
  })

  it('treats an answer that changes the kana shown in the question as a mismatch', () => {
    expect(checkReading('たべる', toEat)).toBe('correct')
    expect(checkReading('たべれ', toEat)).toBe('kana-mismatch')
    expect(checkReading('おちゃ', tea)).toBe('correct')
    expect(checkReading('ちゃ', tea)).toBe('kana-mismatch')
  })

  it('asks again for the reading when a meaning is typed', () => {
    expect(checkReading('おね', one)).toBe('meaning-given')
    expect(checkReading('one', one)).toBe('meaning-given')
    expect(checkReading('ふた', one)).toBe('incorrect')
  })
})
