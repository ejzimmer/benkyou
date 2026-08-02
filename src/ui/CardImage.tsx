import { useEffect, useRef, useState } from "react"
import { useAuth } from "../lib/auth/AuthContext"
import { getImageUrl } from "../services/media"
import { RefreshIcon } from "./RefreshIcon"

export function CardImage({ mediaId }: { mediaId: string }) {
  const { user, offlineOnly } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    setMissing(false)
    setUrl(null)
    ;(async () => {
      const u = await getImageUrl(mediaId, offlineOnly ? null : user)
      if (!alive) return
      if (!u) {
        setMissing(true)
        return
      }
      objectUrlRef.current = u
      setUrl(u)
    })()
    return () => {
      alive = false
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [mediaId, user, offlineOnly])

  async function onSyncClick() {
    setSyncing(true)
    try {
      const u = await getImageUrl(mediaId, user)
      if (u) {
        setMissing(false)
        objectUrlRef.current = u
        setUrl(u)
      }
    } finally {
      setSyncing(false)
    }
  }

  if (missing) {
    return (
      <span className="muted sync-inline">
        画像が見つかりません
        {user && !offlineOnly && (
          <button
            type="button"
            className="btn secondary white sync-btn"
            onClick={() => void onSyncClick()}
            disabled={syncing}
            aria-label="Sync this image"
            title="Sync this image"
          >
            {syncing ? (
              <span className="import-spinner" aria-hidden="true" />
            ) : (
              <RefreshIcon className="sync-icon" />
            )}
          </button>
        )}
      </span>
    )
  }
  if (!url) return <span className="muted">Loading image…</span>
  return <img src={url} alt="" className="card-image" />
}
