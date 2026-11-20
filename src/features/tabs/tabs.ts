export const TABS = [
  { id: "media", label: "Media", path: "/" },
  { id: "wanikani", label: "WaniKani", path: "/wanikani" },
  { id: "cards", label: "Cards", path: "/cards" },
] as const

export type TabId = (typeof TABS)[number]["id"]

const LAST_USED_TAB_KEY = "benkyou.lastUsedTab"

const CARDS_PAGE_PREFIXES = ["/cards", "/decks/"]

/** The tab a page belongs to, or nothing for the full-screen review session. */
export function findTabAtPath(pathname: string) {
  if (pathname === "/") return TABS[0]
  if (pathname.startsWith("/wanikani")) return TABS[1]
  if (CARDS_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return TABS[2]
  return undefined
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
    // Private browsing can refuse storage; the app then just opens on Media.
  }
}
