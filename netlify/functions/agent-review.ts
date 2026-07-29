import type { Handler } from "@netlify/functions"
import type { Card } from "../../src/domain/types"
import type { SchedulingRow } from "../../src/lib/db/schema"
import { applyGrade, deserializeFsrs, serializeFsrs } from "../../src/lib/srs/schedule"
import { stripUndefinedDeep } from "../../src/lib/sync/firestoreData"
import {
  isAgentRating,
  japaneseWordForCard,
  ratingToGrade,
  translationModeForCard,
  AGENT_RATINGS,
} from "../lib/agentCore"
import { getAdminFirestore, requireAgentUid } from "../lib/firebaseAdmin"
import { isAuthorized, json } from "../lib/http"

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" })
  }
  if (!isAuthorized(event.headers)) {
    return json(401, { error: "Unauthorized" })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(event.body ?? "{}") as Record<string, unknown>
  } catch {
    return json(400, { error: "Invalid JSON body" })
  }

  const { id, word, rating } = body
  if (!isAgentRating(rating)) {
    return json(400, { error: `rating must be one of: ${AGENT_RATINGS.join(", ")}` })
  }
  if (typeof id !== "string" && typeof word !== "string") {
    return json(400, { error: "Provide either id or word" })
  }

  try {
    const uid = requireAgentUid()
    const db = getAdminFirestore()
    const cardsCol = db.collection("users").doc(uid).collection("cards")
    const schedulingCol = db.collection("users").doc(uid).collection("scheduling")

    let card: Card | undefined
    if (typeof id === "string") {
      const snap = await cardsCol.doc(id).get()
      if (snap.exists) card = { ...(snap.data() as Card), id: snap.id }
    }
    if (!card && typeof word === "string") {
      const [vocabMatch, grammarMatch] = await Promise.all([
        cardsCol.where("kind", "==", "vocabulary").where("content.wordJa", "==", word).limit(1).get(),
        cardsCol
          .where("kind", "==", "grammar")
          .where("content.construction", "==", word)
          .limit(1)
          .get(),
      ])
      const doc = vocabMatch.docs[0] ?? grammarMatch.docs[0]
      if (doc) card = { ...(doc.data() as Card), id: doc.id }
    }
    if (!card) {
      return json(404, { error: "No matching card found" })
    }

    const modeId = translationModeForCard(card)
    const schedRef = schedulingCol.doc(`${card.id}:${modeId}`)
    const schedSnap = await schedRef.get()
    if (!schedSnap.exists) {
      return json(404, { error: "No scheduling row for this card's translation mode" })
    }
    const row = { ...(schedSnap.data() as SchedulingRow), id: schedSnap.id }

    const grade = ratingToGrade(rating)
    const nextFsrs = applyGrade(deserializeFsrs(row.fsrs), new Date(), grade)
    const updated: SchedulingRow = {
      ...row,
      fsrs: serializeFsrs(nextFsrs),
      due: nextFsrs.due.getTime(),
      updatedAt: Date.now(),
    }
    await schedRef.set(stripUndefinedDeep(updated))

    return json(200, {
      id: card.id,
      kind: card.kind,
      japaneseWord: japaneseWordForCard(card),
      modeId,
      rating,
      nextDue: updated.due,
    })
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : "Unknown error" })
  }
}
