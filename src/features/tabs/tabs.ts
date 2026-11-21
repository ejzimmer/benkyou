export const TABS = [
  { id: "media", label: "Media", path: "/" },
  { id: "wanikani", label: "WaniKani", path: "/wanikani" },
  { id: "cards", label: "Cards", path: "/cards" },
] as const

export type TabId = (typeof TABS)[number]["id"]

/** The tab a page belongs to. Every page outside Media and WaniKani is a Cards page. */
export function findTabAtPath(pathname: string) {
  if (pathname === "/") return TABS[0]
  if (pathname.startsWith("/wanikani")) return TABS[1]
  return TABS[2]
}
