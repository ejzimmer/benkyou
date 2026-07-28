/** Lapses (FSRS `Card.lapses`) a scheduling row must reach before it's
 *  offered up as a leech. Scheduling is per card × review mode, so this is
 *  a per-mode count, not a per-card total. */
export const LEECH_LAPSE_THRESHOLD = 4

/**
 * True the moment `nextLapses` first reaches the threshold — i.e. `prevLapses`
 * was still below it. `lapses` only ever increases (FSRS bumps it on an
 * "Again" grade, never decrements it), so this fires exactly once per row
 * unless it's reset from outside FSRS.
 */
export function crossedLeechThreshold(
  prevLapses: number,
  nextLapses: number,
): boolean {
  return prevLapses < LEECH_LAPSE_THRESHOLD && nextLapses >= LEECH_LAPSE_THRESHOLD
}
