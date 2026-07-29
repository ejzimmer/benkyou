/**
 * Local (in-browser) heuristics for surfacing due/trouble cards on-device.
 * The over-the-network agent API (Netlify Functions, for translation
 * exercises) is separate — see docs/AGENT_API.md and netlify/lib/agentCore.ts.
 */

import type { Card, ReviewModeId } from "../domain/types"
import { deserializeFsrs } from "../lib/srs/schedule"
import { db } from "../lib/db/schema"
import { endOfLocalDay, getDueQueue, type DueItem } from "./review"

export type TroubleCard = {
  card: Card
  modeId: ReviewModeId
  reason: "high_lapses" | "low_stability"
  lapses: number
  stability: number
}

export async function agentListDue(now?: number): Promise<DueItem[]> {
  return getDueQueue(now ?? endOfLocalDay(Date.now()))
}

export async function agentListTrouble(
  maxResults = 50,
): Promise<TroubleCard[]> {
  const rows = await db.scheduling.toArray()
  const cards = await db.cards.toArray()
  const byId = new Map(cards.map((c) => [c.id, c]))
  const out: TroubleCard[] = []
  for (const r of rows) {
    const card = byId.get(r.cardId)
    if (!card) continue
    const fs = deserializeFsrs(r.fsrs)
    if (fs.lapses >= 2) {
      out.push({
        card,
        modeId: r.modeId,
        reason: "high_lapses",
        lapses: fs.lapses,
        stability: fs.stability,
      })
    } else if (fs.stability > 0 && fs.stability < 2 && fs.state !== 0) {
      out.push({
        card,
        modeId: r.modeId,
        reason: "low_stability",
        lapses: fs.lapses,
        stability: fs.stability,
      })
    }
    if (out.length >= maxResults) break
  }
  return out
}
