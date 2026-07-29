const promptEl = document.getElementById("prompt")
const wordEl = document.getElementById("word")
const answerEl = document.getElementById("answer")
const feedbackEl = document.getElementById("feedback")
const nextBtn = document.getElementById("next")
const submitBtn = document.getElementById("submit")

let current = null

async function loadExercise() {
  current = null
  feedbackEl.textContent = ""
  answerEl.value = ""
  answerEl.disabled = true
  submitBtn.disabled = true
  wordEl.textContent = ""
  promptEl.textContent = "Loading…"

  const res = await fetch("/api/exercise")
  const data = await res.json()
  if (!res.ok) {
    promptEl.textContent = ""
    feedbackEl.textContent = data.error ?? "Something went wrong."
    return
  }

  current = data
  promptEl.textContent = data.englishPrompt
  wordEl.textContent = `Use: ${data.card.japaneseWord} (${data.card.meaning})`
  answerEl.disabled = false
  submitBtn.disabled = false
  answerEl.focus()
}

async function submitAnswer() {
  if (!current || answerEl.value.trim() === "") return
  submitBtn.disabled = true
  answerEl.disabled = true
  feedbackEl.textContent = "Grading…"

  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card: current.card,
      englishPrompt: current.englishPrompt,
      answer: answerEl.value,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    feedbackEl.textContent = data.error ?? "Something went wrong."
    answerEl.disabled = false
    submitBtn.disabled = false
    return
  }

  feedbackEl.textContent = `${data.correct ? "✅" : "❌"} (${data.rating}) ${data.feedback}`
}

nextBtn.addEventListener("click", loadExercise)
submitBtn.addEventListener("click", submitAnswer)
answerEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    if (!submitBtn.disabled) submitAnswer()
  }
})

loadExercise()
