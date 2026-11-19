import { Route, Routes } from "react-router-dom"
import { CardsTab } from "./features/tabs/CardsTab"
import { useAuth } from "./lib/auth/AuthContext"
import { useEffect } from "react"
import { TabBar } from "./features/tabs/TabBar"
import { useOpenLastUsedTab } from "./features/tabs/useOpenLastUsedTab"
import { WaniKaniTab } from "./features/wanikani/WaniKaniTab"
import { MediaTab } from "./features/media/MediaTab"

export function App() {
  const { loading } = useAuth()
  useOpenLastUsedTab()

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const syncViewportHeight = () => {
      document.documentElement.style.setProperty("--vvh", `${vv.height}px`)
      // How far iOS Safari has panned the visual viewport down (to show a
      // focused input above the keyboard) — the mobile review screen pins
      // itself there. See `.app-shell:has(.page.review)` in index.css.
      document.documentElement.style.setProperty("--vvt", `${vv.offsetTop}px`)
    }
    syncViewportHeight()
    vv.addEventListener("resize", syncViewportHeight)
    vv.addEventListener("scroll", syncViewportHeight)
    return () => {
      vv.removeEventListener("resize", syncViewportHeight)
      vv.removeEventListener("scroll", syncViewportHeight)
      document.documentElement.style.removeProperty("--vvh")
      document.documentElement.style.removeProperty("--vvt")
    }
  }, [])

  if (loading) {
    return (
      <div className="page centred">
        <p>読み込み中</p>
      </div>
    )
  }

  return (
    <>
      <TabBar />
      <Routes>
        <Route path="/media" element={<MediaTab />} />
        <Route path="/wanikani" element={<WaniKaniTab />} />
        <Route path="*" element={<CardsTab />} />
      </Routes>
    </>
  )
}
