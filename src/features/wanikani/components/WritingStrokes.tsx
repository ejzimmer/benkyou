import { useEffect, useId, useMemo, useRef } from 'react'
import { buildBrushStamps, type Point, type StrokeEnding } from './buildBrushStamps'

const DRAWING_SHARE = 0.75
// Round line caps draw a dot for a zero-length dash, so an unwritten stroke's dash is pushed just
// past the path's start, with a gap long enough that the next dash never reaches its end.
const DASH_PATTERN = '1 2'
const UNWRITTEN_OFFSET = 1.01
const STAMP_SPACING = 0.4
const REVEAL_WIDTH_FACTOR = 1.5

export interface Stroke {
  d: string
  ending: StrokeEnding
}

interface Props {
  characters: readonly (readonly Stroke[])[]
  characterSize: number
  height: number
  brushWidth: number
  cycleMs: number
}

export function WritingStrokes({ characters, characterSize, height, brushWidth, cycleMs }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const maskIdPrefix = `writing-${useId().replaceAll(/[^\w-]/gu, '')}`
  const brushShapes = useMemo(
    () => characters.map((strokes) => strokes.map(({ d, ending }) => buildBrushStamps(samplePath(d), ending, brushWidth))),
    [characters, brushWidth],
  )

  useEffect(() => {
    const revealPaths = svgRef.current?.querySelectorAll('mask path') ?? []
    const strokeShare = DRAWING_SHARE / revealPaths.length
    const animations = [...revealPaths].map((path, i) =>
      path.animate(
        [
          { offset: 0, strokeDashoffset: UNWRITTEN_OFFSET },
          { offset: i * strokeShare, strokeDashoffset: UNWRITTEN_OFFSET },
          { offset: (i + 1) * strokeShare, strokeDashoffset: 0 },
          { offset: 1, strokeDashoffset: 0 },
        ],
        { duration: cycleMs, iterations: Infinity },
      ),
    )
    const fade = svgRef.current?.animate(
      [{ opacity: 1 }, { offset: 0.9, opacity: 1 }, { opacity: 0 }],
      { duration: cycleMs, iterations: Infinity },
    )
    return () => {
      animations.forEach((animation) => animation.cancel())
      fade?.cancel()
    }
  }, [cycleMs])

  return (
    <svg
      ref={svgRef}
      width={height * characters.length}
      height={height}
      viewBox={`0 0 ${characterSize * characters.length} ${characterSize}`}
      fill="currentColor"
      aria-hidden="true"
    >
      {characters.map((strokes, i) => (
        <g key={strokes[0].d} transform={`translate(${i * characterSize} 0)`}>
          {strokes.map(({ d }, j) => {
            const maskId = `${maskIdPrefix}-${i}-${j}`
            return (
              <g key={d}>
                <mask id={maskId} maskUnits="userSpaceOnUse">
                  <path
                    d={d}
                    fill="none"
                    stroke="white"
                    strokeWidth={brushWidth * REVEAL_WIDTH_FACTOR}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={DASH_PATTERN}
                    strokeDashoffset={UNWRITTEN_OFFSET}
                  />
                </mask>
                <path d={brushShapes[i][j]} mask={`url(#${maskId})`} />
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

function samplePath(d: string): Point[] {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  const length = path.getTotalLength()
  const count = Math.max(2, Math.ceil(length / STAMP_SPACING))
  return Array.from({ length: count + 1 }, (_, i) => path.getPointAtLength((i / count) * length))
}
