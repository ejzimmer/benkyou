import "dotenv/config"
import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { fetchDueCards, submitReview } from "./benkyouClient.js"
import { buildExercise, gradeAnswer } from "./exercise.js"
import type { BenkyouCard } from "./benkyouClient.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, "../public")))

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error"
}

app.get("/api/exercise", async (_req, res) => {
  try {
    const cards = await fetchDueCards(10)
    if (cards.length === 0) {
      res.status(404).json({ error: "No cards are due for review right now." })
      return
    }
    const card = cards[Math.floor(Math.random() * cards.length)]
    const exercise = await buildExercise(card)
    res.json(exercise)
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) })
  }
})

app.post("/api/submit", async (req, res) => {
  try {
    const body = req.body as { card?: BenkyouCard; englishPrompt?: string; answer?: string }
    const { card, englishPrompt, answer } = body
    if (!card?.id || !englishPrompt || typeof answer !== "string") {
      res.status(400).json({ error: "card, englishPrompt and answer are required" })
      return
    }
    const grade = await gradeAnswer(card, englishPrompt, answer)
    const review = await submitReview(card.id, grade.rating)
    res.json({ ...grade, nextDue: review.nextDue })
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) })
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, "0.0.0.0", () => {
  console.log(`benkyou agent listening on http://0.0.0.0:${port}`)
})
