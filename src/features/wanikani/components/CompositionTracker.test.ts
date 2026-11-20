import { describe, expect, it } from 'vitest'
import { CompositionTracker } from './CompositionTracker'

describe('CompositionTracker', () => {
  it('isn’t confirming text before any composition', () => {
    expect(new CompositionTracker().isConfirmingText(0)).toBe(false)
  })

  it('is confirming text while composing', () => {
    const tracker = new CompositionTracker()
    tracker.recordStart()
    expect(tracker.isConfirmingText(5000)).toBe(true)
  })

  it('treats an Enter right after composition ends as confirming the text', () => {
    const tracker = new CompositionTracker()
    tracker.recordStart()
    tracker.recordEnd(1000)
    expect(tracker.isConfirmingText(1020)).toBe(true)
  })

  it('lets a later Enter submit', () => {
    const tracker = new CompositionTracker()
    tracker.recordStart()
    tracker.recordEnd(1000)
    expect(tracker.isConfirmingText(1500)).toBe(false)
  })
})
