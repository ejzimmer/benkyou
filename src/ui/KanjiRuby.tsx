import { type ReactNode } from "react"

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

/** Apply readings from a map (exact substring keys in sentence, excluding gap). */
export function RubySentence({ sentence, gapMarker, readings }: MapProps) {
  const gapIdx = sentence.indexOf(gapMarker)
  const keys = Object.keys(readings).sort((a, b) => b.length - a.length)
  const parts: ReactNode[] = []
  let i = 0
  let key = 0
  while (i < sentence.length) {
    if (gapIdx >= 0 && i === gapIdx) {
      parts.push(
        <span key={key++} className="gap-mark">
          {gapMarker}
        </span>,
      )
      i += gapMarker.length
      continue
    }
    let matched = false
    for (const k of keys) {
      if (!k || !readings[k]?.trim()) continue
      if (sentence.slice(i, i + k.length) === k) {
        parts.push(
          <RubyWord key={key++} surface={k} reading={readings[k]} />,
        )
        i += k.length
        matched = true
        break
      }
    }
    if (!matched) {
      const ch = sentence[i]
      parts.push(<span key={key++}>{ch}</span>)
      i += 1
    }
  }
  return <span className="ruby-sentence">{parts}</span>
}
