import { useEffect, useState } from "react"
import type { BulkMediaItem } from "../../lib/import/types"

function mediaItemBytes(item: BulkMediaItem): Uint8Array {
  if (item.bytes) return item.bytes
  if (item.base64) {
    const binary = atob(item.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  return new Uint8Array()
}

export function ImportGapMediaImage({
  mediaId,
  mediaItems,
}: {
  mediaId: string
  mediaItems: BulkMediaItem[]
}) {
  const [url, setUrl] = useState<string | null>(null)
  const item = mediaItems.find((m) => m.id === mediaId)

  useEffect(() => {
    if (!item) return
    const blob = new Blob([mediaItemBytes(item)], { type: item.mimeType })
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item])

  if (!item) return <span className="muted small">Image missing from package</span>
  if (!url) return <span className="muted small">Loading image…</span>
  return <img src={url} alt="" className="card-image" />
}
