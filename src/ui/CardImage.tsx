import { useEffect, useState } from "react"
import { getImageUrl } from "../services/media"

export function CardImage({ mediaId }: { mediaId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    setMissing(false)
    setUrl(null)
    ;(async () => {
      const u = await getImageUrl(mediaId)
      if (!alive) return
      if (!u) {
        setMissing(true)
        return
      }
      objectUrl = u
      setUrl(u)
    })()
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaId])
  if (missing) return <span className="muted">Image unavailable</span>
  if (!url) return <span className="muted">Loading image…</span>
  return <img src={url} alt="" className="card-image" />
}
