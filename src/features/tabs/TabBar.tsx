import "./TabBar.css"
import { useLocation } from "react-router-dom"
import { SyncButton } from "../../ui/SyncButton"
import { LogoutButton } from "./LogoutButton"
import { TabLink } from "./TabLink"
import { findTabAtPath, TABS } from "./tabs"
import { useReviewCounts } from "./useReviewCounts"

export function TabBar() {
  const { pathname } = useLocation()
  const currentTab = findTabAtPath(pathname)
  const reviewCounts = useReviewCounts()

  if (!currentTab) return null

  return (
    <header className="tab-bar" data-tab={currentTab.id}>
      <nav aria-label="Sections">
        {TABS.map((tab) => (
          <TabLink
            key={tab.id}
            path={tab.path}
            label={tab.label}
            isActive={tab.id === currentTab.id}
            reviewCount={reviewCounts[tab.id]}
          />
        ))}
      </nav>
      <div className="tab-bar-actions">
        <SyncButton />
        <LogoutButton />
      </div>
    </header>
  )
}
