export const TABS = [
  { id: "media", label: "Media", path: "/" },
  { id: "wanikani", label: "WaniKani", path: "/wanikani" },
  { id: "cards", label: "Cards", path: "/cards" },
] as const

export type TabId = (typeof TABS)[number]["id"]

const CARDS_PAGE_PREFIXES = ["/cards", "/decks/"]

/** The tab a page belongs to, or nothing for the full-screen review session. */
export function findTabAtPath(pathname: string) {
  if (pathname === "/") return TABS[0]
  if (pathname.startsWith("/wanikani")) return TABS[1]
  if (CARDS_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return TABS[2]
  return undefined
}
