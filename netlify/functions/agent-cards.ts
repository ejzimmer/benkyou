import type { Handler } from "@netlify/functions"
import type { Card } from "../../src/domain/types"
import type { SchedulingRow } from "../../src/lib/db/schema"
import {
  isDueForTranslation,
  schedulingPriorityWeight,
  toAgentCard,
  weightedSampleWithoutReplacement,
} from "../lib/agentCore"
import { getAdminFirestore, requireAgentUid } from "../lib/firebaseAdmin"
import { isAuthorized, json } from "../lib/http"

const DEFAULT_COUNT = 10
const MAX_COUNT = 50

function parseCount(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_COUNT
  return Math.min(n, MAX_COUNT)
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" })
  }
  if (!isAuthorized(event.headers)) {
    return json(401, { error: "Unauthorized" })
  }

  const count = parseCount(event.queryStringParameters?.count)

  try {
    const uid = requireAgentUid()
    const db = getAdminFirestore()
    const usersDoc = db.collection("users").doc(uid)

    const [cardsSnap, schedulingSnap] = await Promise.all([
      usersDoc.collection("cards").get(),
      usersDoc.collection("scheduling").get(),
    ])

    const cardsById = new Map<string, Card>()
    for (const doc of cardsSnap.docs) {
      cardsById.set(doc.id, { ...(doc.data() as Card), id: doc.id })
    }

    const now = Date.now()
    const candidates: { item: { card: Card; row: SchedulingRow }; weight: number }[] = []
    for (const doc of schedulingSnap.docs) {
      const row = { ...(doc.data() as SchedulingRow), id: doc.id }
      const card = cardsById.get(row.cardId)
      if (!card || !isDueForTranslation(card, row, now)) continue
      candidates.push({ item: { card, row }, weight: schedulingPriorityWeight(row, now) })
    }

    const picked = weightedSampleWithoutReplacement(candidates, count)
    const cards = picked.map(({ card, row }) => toAgentCard(card, row.due))

    return json(200, { cards })
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : "Unknown error" })
  }
}
