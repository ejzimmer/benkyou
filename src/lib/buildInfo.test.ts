import { describe, expect, it } from "vitest"
import { formatBuildLabel } from "./buildInfo"

describe("formatBuildLabel", () => {
  it("passes through non-date labels like 'dev'", () => {
    expect(formatBuildLabel("dev")).toBe("dev")
  })

  it("reformats an ISO build label (away from the raw UTC string)", () => {
    const iso = "2026-06-29T01:38:36.000Z"
    const formatted = formatBuildLabel(iso)
    expect(formatted).not.toBe(iso)
    // It represents the same instant.
    expect(new Date(iso).getTime()).toBe(Date.parse("2026-06-29T01:38:36.000Z"))
    expect(formatted.length).toBeGreaterThan(0)
  })
})
