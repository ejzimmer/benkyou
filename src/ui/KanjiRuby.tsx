import { Fragment, type ReactNode } from "react"

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
}

function RubySegment({
  segment,
  readings,
}: {
  segment: string
  readings: Record<string, string>
}) {
  const keys = Object.keys(readings).sort((a, b) => b.length - a.length)
  const parts: ReactNode[] = []
  let i = 0
  let keyIdx = 0
  while (i < segment.length) {
    let matched = false
    for (const k of keys) {
      if (!k || !readings[k]?.trim()) continue
      if (segment.slice(i, i + k.length) === k) {
        parts.push(
          <RubyWord key={keyIdx++} surface={k} reading={readings[k]} />,
        )
        i += k.length
        matched = true
        break
      }
    }
    if (!matched) {
      const ch = segment[i]
      parts.push(<span key={keyIdx++}>{ch}</span>)
      i += 1
    }
  }
  return <>{parts}</>
}

/** Ruby per substring + gap markers between segments (supports repeated gaps). */
export function RubySentence({ sentence, gapMarker, readings }: MapProps) {
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
          {idx > 0 && <span className="gap-mark">{marker}</span>}
          <RubySegment segment={chunk} readings={readings} />
        </Fragment>
      ))}
    </span>
  )
}
