export const TABS = [
  { id: "media", label: "Media", path: "/media" },
  { id: "wanikani", label: "WaniKani", path: "/wanikani" },
  { id: "cards", label: "Cards", path: "/" },
] as const

export type TabId = (typeof TABS)[number]["id"]

const LAST_USED_TAB_KEY = "benkyou.lastUsedTab"

export function findTabAtPath(pathname: string) {
  return TABS.find((tab) => tab.path === pathname)
}

export function readLastUsedTab() {
  try {
    const stored = localStorage.getItem(LAST_USED_TAB_KEY)
    return TABS.find((tab) => tab.id === stored)
  } catch {
    return undefined
  }
}

export function saveLastUsedTab(tabId: TabId) {
  try {
    localStorage.setItem(LAST_USED_TAB_KEY, tabId)
  } catch {
    // Private browsing can refuse storage; the app then just opens on Cards.
  }
}
