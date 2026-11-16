import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { readLastUsedTab } from "./tabs"

/** Opening the app at its root reopens whichever tab was used last. */
export function useOpenLastUsedTab() {
  const navigate = useNavigate()
  const [startPath] = useState(useLocation().pathname)

  useEffect(() => {
    if (startPath !== "/") return
    const lastUsedTab = readLastUsedTab()
    if (lastUsedTab && lastUsedTab.path !== "/") navigate(lastUsedTab.path, { replace: true })
  }, [startPath, navigate])
}
