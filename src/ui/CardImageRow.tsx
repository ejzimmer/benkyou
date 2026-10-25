import { CardImage } from "./CardImage"
import { useScrollShadow } from "./useScrollShadow"

/**
 * Lays card images out side-by-side. The row scrolls horizontally (rather
 * than the card itself) when the images don't all fit across; vertically it
 * grows with its images, and the enclosing card's content scrolls if they
 * don't fit.
 */
export function CardImageRow({ images }: { images: string[] }) {
  const rowRef = useScrollShadow<HTMLDivElement>()
  const ids = images.filter(Boolean)
  if (ids.length === 0) return null
  return (
    <div
      ref={rowRef}
      className={`card-image-row${ids.length > 1 ? " card-image-row-multi" : ""}`}
    >
      {ids.map((id) => (
        <CardImage key={id} mediaId={id} />
      ))}
    </div>
  )
}
