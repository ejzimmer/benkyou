/**
 * Hands control back to the browser (paint, input) before continuing a long
 * synchronous loop. Prefers the Scheduler API's cooperative `yield()`
 * (skips the macrotask queue's usual delay); falls back to a plain
 * `setTimeout` where that API isn't available.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } })
    .scheduler
  if (scheduler?.yield) return scheduler.yield()
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Yields every `chunkSize` iterations of a 0-based loop counter `i`. */
export async function yieldPeriodically(i: number, chunkSize = 200): Promise<void> {
  if (i > 0 && i % chunkSize === 0) await yieldToMain()
}
