import "./TabBar.css"
import { useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { findTabAtPath, saveLastUsedTab, TABS } from "./tabs"

export function TabBar() {
  const { pathname } = useLocation()
  const currentTab = findTabAtPath(pathname)

  useEffect(() => {
    if (currentTab) saveLastUsedTab(currentTab.id)
  }, [currentTab])

  if (!currentTab) return null

  return (
    <nav className="tab-bar" aria-label="Sections">
      <span className="brand" lang="ja">
        勉強
      </span>
      {TABS.map((tab) => (
        <NavLink key={tab.id} to={tab.path} end>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
