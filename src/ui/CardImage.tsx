import { useEffect, useState } from "react"
import { getImageUrl } from "../services/media"

export function CardImage({ mediaId }: { mediaId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    ;(async () => {
      const u = await getImageUrl(mediaId)
      if (!alive) return
      objectUrl = u
      setUrl(u)
    })()
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaId])
  if (!url) return <span className="muted">Loading image…</span>
  return <img src={url} alt="" className="card-image" />
}
