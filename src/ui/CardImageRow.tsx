import { CardImage } from "./CardImage"

/**
 * Lays card images out side-by-side. The row scrolls horizontally (rather
 * than the card itself) when the images don't all fit across; vertically it
 * grows with its images so the enclosing card grows to fit them.
 */
export function CardImageRow({ images }: { images: string[] }) {
  const ids = images.filter(Boolean)
  if (ids.length === 0) return null
  return (
    <div
      className={`card-image-row${ids.length > 1 ? " card-image-row-multi" : ""}`}
    >
      {ids.map((id) => (
        <CardImage key={id} mediaId={id} />
      ))}
    </div>
  )
}
