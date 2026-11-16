const PETALS = [
  { id: 1, x: 8, delay: 0, duration: 9 },
  { id: 2, x: 22, delay: 3.5, duration: 11 },
  { id: 3, x: 38, delay: 1.2, duration: 8 },
  { id: 4, x: 52, delay: 5, duration: 10 },
  { id: 5, x: 66, delay: 2.4, duration: 9.5 },
  { id: 6, x: 78, delay: 6.2, duration: 8.5 },
  { id: 7, x: 92, delay: 0.8, duration: 10.5 },
  { id: 8, x: 45, delay: 7.4, duration: 9 },
]

export function FallingPetals() {
  return (
    <div className="falling-petals">
      {PETALS.map((petal) => (
        <svg
          key={petal.id}
          className="falling-petal"
          viewBox="-5 -5 10 10"
          style={{ left: `${petal.x}%`, animationDelay: `${petal.delay}s`, animationDuration: `${petal.duration}s` }}
        >
          <ellipse rx="3" ry="4.4" />
        </svg>
      ))}
    </div>
  )
}
