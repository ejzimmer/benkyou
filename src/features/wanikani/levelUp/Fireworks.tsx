const SPARK_ANGLES = Array.from({ length: 18 }, (_, i) => i * 20)

const BURSTS = [
  { id: 1, x: 16, y: 18, size: 42, colour: 'gold', delay: 0 },
  { id: 2, x: 82, y: 16, size: 48, colour: 'pink', delay: 0.6 },
  { id: 3, x: 64, y: 40, size: 31, colour: 'white', delay: 1.2 },
  { id: 4, x: 30, y: 44, size: 36, colour: 'pink', delay: 1.7 },
  { id: 5, x: 90, y: 50, size: 28, colour: 'gold', delay: 2.3 },
  { id: 6, x: 50, y: 12, size: 39, colour: 'gold', delay: 2.8 },
  { id: 7, x: 8, y: 56, size: 25, colour: 'white', delay: 3.1 },
]

export function Fireworks() {
  return (
    <div className="fireworks">
      {BURSTS.map((burst) => (
        <svg
          key={burst.id}
          className={`burst ${burst.colour}`}
          viewBox="-100 -100 200 200"
          style={{ left: `${burst.x}%`, top: `${burst.y}%`, width: `${burst.size}vmin`, animationDelay: `${burst.delay}s` }}
        >
          {SPARK_ANGLES.map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <line className="trail" x1="0" y1="-40" x2="0" y2="-82" />
              <circle className="spark" cx="0" cy="-92" r="4" />
              <circle className="spark" cx="0" cy="-56" r="2.8" transform="rotate(10)" />
            </g>
          ))}
        </svg>
      ))}
    </div>
  )
}
