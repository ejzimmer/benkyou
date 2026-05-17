import type { ReactNode } from "react"
import type { Card } from "../../domain/types"
import { PLACEHOLDER_DEFINITION } from "../../domain/vocabularyContent"
import type { BulkMediaItem } from "../../lib/import/types"
import { ImportGapMediaImage } from "./ImportGapMediaImage"

function Fact({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === false) return null
  if (typeof children === "string" && !children.trim()) return null
  return (
    <div className="import-card-fact">
      <span className="import-card-fact-label">{label}</span>
      <span className="import-card-fact-value">{children}</span>
    </div>
  )
}

export function ImportGapCardPreview({
  card,
  mediaItems,
}: {
  card: Card
  mediaItems: BulkMediaItem[]
}) {
  if (card.kind === "vocabulary") {
    const c = card.content
    const defs = c.definitionsEn.filter(
      (d) => d.trim() && d.trim() !== PLACEHOLDER_DEFINITION,
    )
    return (
      <div className="import-card-preview stack">
        <p className="muted small" style={{ margin: 0 }}>
          From Anki
        </p>
        <Fact label="Japanese word">{c.wordJa}</Fact>
        <Fact label="Pronunciation">{c.reading}</Fact>
        {defs.length > 0 && (
          <Fact label="English">
            <ul className="import-card-list">
              {defs.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </Fact>
        )}
        {c.images.length > 0 && (
          <Fact label="Images">
            <div className="stack">
              {c.images.map((id) => (
                <ImportGapMediaImage key={id} mediaId={id} mediaItems={mediaItems} />
              ))}
            </div>
          </Fact>
        )}
        {c.exampleSentences.some((s) => s.trim()) && (
          <Fact label="Examples">
            <ul className="import-card-list">
              {c.exampleSentences
                .filter((s) => s.trim())
                .map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
            </ul>
          </Fact>
        )}
        {c.synonymsJa.some((s) => s.trim()) && (
          <Fact label="Synonyms">
            <ul className="import-card-list">
              {c.synonymsJa
                .filter((s) => s.trim())
                .map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
            </ul>
          </Fact>
        )}
      </div>
    )
  }

  const c = card.content
  const readingEntries = Object.entries(c.readings).filter(
    ([, v]) => v?.trim(),
  )
  return (
    <div className="import-card-preview stack">
      <p className="muted small" style={{ margin: 0 }}>
        From Anki
      </p>
      <Fact label="Sentence">{c.sentenceWithGap}</Fact>
      <Fact label="Construction">{c.construction}</Fact>
      <Fact label="English">{c.translationEn.trim() || null}</Fact>
      {readingEntries.length > 0 && (
        <Fact label="Readings">
          <ul className="import-card-list">
            {readingEntries.map(([kanji, reading]) => (
              <li key={kanji}>
                {kanji} → {reading}
              </li>
            ))}
          </ul>
        </Fact>
      )}
      {c.images.length > 0 && (
        <Fact label="Images">
          <div className="stack">
            {c.images.map((id) => (
              <ImportGapMediaImage key={id} mediaId={id} mediaItems={mediaItems} />
            ))}
          </div>
        </Fact>
      )}
      {c.synonymsJa.some((s) => s.trim()) && (
        <Fact label="Synonyms">
          <ul className="import-card-list">
            {c.synonymsJa
              .filter((s) => s.trim())
              .map((s, i) => (
                <li key={i}>{s}</li>
              ))}
          </ul>
        </Fact>
      )}
    </div>
  )
}
