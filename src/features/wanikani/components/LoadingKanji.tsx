import { type Stroke, WritingStrokes } from './WritingStrokes'

// 永 ("eternity"), the classic brush-practice character: its five strokes
// cover the basic stroke types. Drawn in stroke order.
const STROKES: Stroke[] = [
  { d: 'M45 9 L55 19', ending: 'dot' },
  { d: 'M33 31 H57 V86 Q57 91 51 88 L45 84', ending: 'sweep' },
  { d: 'M17 48 H40 L13 80', ending: 'sweep' },
  { d: 'M83 34 Q74 46 58 56', ending: 'sweep' },
  { d: 'M58 56 Q72 76 90 86', ending: 'sweep' },
]
const CHARACTERS = [STROKES]

export function LoadingKanji() {
  return <WritingStrokes characters={CHARACTERS} characterSize={100} height={26} brushWidth={10} cycleMs={2400} />
}
