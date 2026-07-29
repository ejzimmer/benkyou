/**
 * Thin client for the benkyou Agent API (see ../../docs/AGENT_API.md).
 */

export type BenkyouCard = {
  id: string
  kind: "vocabulary" | "grammar"
  japaneseWord: string
  meaning: string
  exampleSentences: string[]
  due: number
}

export const AGENT_RATINGS = ["easy", "ok", "hard", "incorrect"] as const
export type AgentRating = (typeof AGENT_RATINGS)[number]

type ReviewResult = {
  id: string
  kind: BenkyouCard["kind"]
  japaneseWord: string
  modeId: string
  rating: AgentRating
  nextDue: number
}

function config(): { baseUrl: string; token: string } {
  const baseUrl = process.env.BENKYOU_API_URL
  const token = process.env.BENKYOU_AGENT_TOKEN
  if (!baseUrl || !token) {
    throw new Error("BENKYOU_API_URL and BENKYOU_AGENT_TOKEN must be set (see .env.example)")
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token }
}

async function benkyouFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, token } = config()
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`benkyou API ${path} failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<T>
}

export async function fetchDueCards(count = 10): Promise<BenkyouCard[]> {
  const data = await benkyouFetch<{ cards: BenkyouCard[] }>(`/agent-cards?count=${count}`)
  return data.cards
}

export async function submitReview(id: string, rating: AgentRating): Promise<ReviewResult> {
  return benkyouFetch<ReviewResult>("/agent-review", {
    method: "POST",
    body: JSON.stringify({ id, rating }),
  })
}
