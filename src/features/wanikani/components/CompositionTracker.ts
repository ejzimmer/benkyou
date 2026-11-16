// Android's Japanese keyboards can confirm composed text and submit the form with the same Enter,
// firing compositionend just before submit, so a submit that soon after is still part of confirming.
const CONFIRM_WINDOW_MS = 100

export class CompositionTracker {
  #isComposing = false
  #endedAt = -Infinity

  recordStart() {
    this.#isComposing = true
  }

  recordEnd(time: number) {
    this.#isComposing = false
    this.#endedAt = time
  }

  isConfirmingText(time: number) {
    return this.#isComposing || time - this.#endedAt < CONFIRM_WINDOW_MS
  }
}
