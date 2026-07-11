import { Fragment, type ReactNode } from "react"
import { segmentText } from "../domain/readingsMap"

type Props = {
  /** Full phrase ruby (when only one reading string for whole expression) */
  surface: string
  reading?: string
}

/** Hover or keyboard focus shows hiragana reading for kanji-containing surface text */
export function RubyWord({ surface, reading }: Props) {
  const showRuby =
    Boolean(reading?.trim()) && /[\u4e00-\u9fff]/.test(surface)

  if (!showRuby) return <span>{surface}</span>

  return (
    <span className="ruby-hover" tabIndex={0}>
      <ruby>
        {surface}
        <rt>{reading}</rt>
      </ruby>
    </span>
  )
}

type MapProps = {
  sentence: string
  gapMarker: string
  /** longest phrases first for greedy match */
  readings: Record<string, string>
  renderGap?: (gapIndex: number, marker: string) => ReactNode
}

/** Renders `segment` with furigana per matched phrase, via `segmentText`. */
export function RubySegment({
  segment,
  readings,
}: {
  segment: string
  readings: Record<string, string>
}) {
  return (
    <>
      {segmentText(segment, readings).map((s, i) =>
        s.reading?.trim() ? (
          <RubyWord key={i} surface={s.text} reading={s.reading} />
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
}

/** Ruby per substring + gap markers between segments (supports repeated gaps). */
export function RubySentence({
  sentence,
  gapMarker,
  readings,
  renderGap,
}: MapProps) {
  const marker = gapMarker.trim()
  if (!marker) {
    return (
      <span className="ruby-sentence">
        <RubySegment segment={sentence} readings={readings} />
      </span>
    )
  }
  const chunks = sentence.split(marker)
  return (
    <span className="ruby-sentence">
      {chunks.map((chunk, idx) => (
        <Fragment key={`${idx}-${chunk.slice(0, 8)}`}>
          {idx > 0 &&
            (renderGap ? (
              renderGap(idx - 1, marker)
            ) : (
              <span className="gap-mark">{marker}</span>
            ))}
          <RubySegment segment={chunk} readings={readings} />
        </Fragment>
      ))}
    </span>
  )
}
