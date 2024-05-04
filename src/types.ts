export type Word = {
  kana: string
  furigana: string[]
}

export type CardType = {
  id: string
  japanese: Word
  english: string
  examples: string[]
}
