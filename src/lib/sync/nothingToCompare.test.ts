import { describe, expect, it } from "vitest"
import { nothingToCompare } from "./runSync"
import type {
  CardSyncConflict,
  DeckSyncConflict,
  MediaSyncConflict,
  SchedulingSyncConflict,
} from "./syncTypes"

describe("nothingToCompare", () => {
  it("is true for a card conflict with an empty diff", () => {
    const conflict: CardSyncConflict = {
      key: "card:1",
      entityType: "card",
      entityId: "1",
      localUpdatedAt: 2,
      remoteUpdatedAt: 1,
      localSummary: "猫 — cat",
      remoteSummary: "猫 — cat",
      diffRows: [],
      local: {} as CardSyncConflict["local"],
      remote: {} as CardSyncConflict["remote"],
    }
    expect(nothingToCompare(conflict)).toBe(true)
  })

  it(
    "is false for a card conflict whose summaries match but content differs " +
      "(reading/images/etc. changed while word+definitions didn't) — this is " +
      "exactly the case that must never silently auto-resolve",
    () => {
      const conflict: CardSyncConflict = {
        key: "card:1",
        entityType: "card",
        entityId: "1",
        localUpdatedAt: 2,
        remoteUpdatedAt: 1,
        localSummary: "猫 — cat",
        remoteSummary: "猫 — cat",
        diffRows: [
          { label: "Reading", kind: "text", local: "ねこ", remote: "—" },
        ],
        local: {} as CardSyncConflict["local"],
        remote: {} as CardSyncConflict["remote"],
      }
      expect(nothingToCompare(conflict)).toBe(false)
    },
  )

  it("is true for a scheduling conflict with an empty diff", () => {
    const conflict: SchedulingSyncConflict = {
      key: "scheduling:1",
      entityType: "scheduling",
      entityId: "1",
      localUpdatedAt: 2,
      remoteUpdatedAt: 1,
      localSummary: "x",
      remoteSummary: "y",
      diffRows: [],
      local: {} as SchedulingSyncConflict["local"],
      remote: {} as SchedulingSyncConflict["remote"],
    }
    expect(nothingToCompare(conflict)).toBe(true)
  })

  it("is true for a deck conflict whose summaries (names) match", () => {
    const conflict: DeckSyncConflict = {
      key: "deck:1",
      entityType: "deck",
      entityId: "1",
      localUpdatedAt: 2,
      remoteUpdatedAt: 1,
      localSummary: 'Deck "N3"',
      remoteSummary: 'Deck "N3"',
      local: { id: "1", name: "N3", updatedAt: 2 },
      remote: { id: "1", name: "N3", updatedAt: 1 },
    }
    expect(nothingToCompare(conflict)).toBe(true)
  })

  it(
    "is always false for a media conflict, even with matching summaries — " +
      "reaching a media conflict at all already means the content digest " +
      "differs, so there's never a safe auto-resolve",
    () => {
      const conflict: MediaSyncConflict = {
        key: "media:1",
        entityType: "media",
        entityId: "1",
        localUpdatedAt: 2,
        remoteUpdatedAt: 1,
        localSummary: "image/png · same text",
        remoteSummary: "image/png · same text",
        local: {} as MediaSyncConflict["local"],
        remote: {} as MediaSyncConflict["remote"],
        localPreviewUrl: "blob:local",
        remotePreviewUrl: "blob:remote",
      }
      expect(nothingToCompare(conflict)).toBe(false)
    },
  )
})
