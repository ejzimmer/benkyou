/**
 * LLM prompt-building/grading for a single translation exercise: an English
 * sentence the learner must render in Japanese using a given card's word or
 * construction.
 */
import type { AgentRating, BenkyouCard } from "./benkyouClient.js"
import { chat, extractJson } from "./llmClient.js"

export type Exercise = {
  card: BenkyouCard
  englishPrompt: string
}

export async function buildExercise(card: BenkyouCard): Promise<Exercise> {
  const content = await chat([
    {
      role: "system",
      content:
        "You write short English sentences for a Japanese learner to translate. " +
        "Reply with a single English sentence only — no quotes, no explanation.",
    },
    {
      role: "user",
      content:
        `Japanese word/construction: ${card.japaneseWord}\n` +
        `Meaning: ${card.meaning}\n` +
        "Write one short English sentence (5-12 words) that a learner would naturally " +
        "translate back into Japanese using this word or construction.",
    },
  ])
  return { card, englishPrompt: content.trim() }
}

export type GradeResult = {
  correct: boolean
  rating: AgentRating
  feedback: string
}

export async function gradeAnswer(
  card: BenkyouCard,
  englishPrompt: string,
  answer: string,
): Promise<GradeResult> {
  const content = await chat([
    {
      role: "system",
      content:
        "You grade a Japanese learner's translation attempt. Reply with strict JSON only, " +
        'matching {"correct": boolean, "rating": "easy" | "ok" | "hard" | "incorrect", "feedback": string}. ' +
        '"rating": "easy" if natural and correct, "ok" if correct but a little effortful, ' +
        '"hard" if correct but with real mistakes, "incorrect" if wrong or unusable. ' +
        "feedback is one short English sentence explaining any mistake, or confirming it's correct.",
    },
    {
      role: "user",
      content:
        `English sentence to translate: ${englishPrompt}\n` +
        `Target word/construction: ${card.japaneseWord} (${card.meaning})\n` +
        `Learner's Japanese translation: ${answer}`,
    },
  ])
  return extractJson<GradeResult>(content)
}
