export function addSynonym(synonyms: readonly string[], typed: string): readonly string[] {
  const synonym = typed.trim()
  const isKnown = synonyms.some((existing) => existing.toLowerCase() === synonym.toLowerCase())
  return synonym && !isKnown ? [...synonyms, synonym] : synonyms
}
