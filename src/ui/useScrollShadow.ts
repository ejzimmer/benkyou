import { useCallback, useEffect, useRef } from "react"

// Standard "fade" scroll-shadow recipe: an inset shadow hugging the edge
// that has more content beyond it, shrunk down (negative spread) so it only
// reads as a soft line rather than a full inner glow.
const SHADOW_OFFSET = "8px"
const SHADOW_BLUR = "6px"
const SHADOW_SPREAD = "-6px"
const SHADOW_COLOR = "rgba(0, 0, 0, 0.55)"

// Sub-pixel scroll positions (browser zoom, fractional layout) mean
// scrollTop + clientHeight rarely lands on scrollHeight exactly even when
// fully scrolled — a 1px tolerance avoids a shadow that never quite goes away.
const TOLERANCE = 1

function boxShadowFor(el: HTMLElement): string {
  const shadows: string[] = []
  if (el.scrollTop > TOLERANCE) {
    shadows.push(`inset 0 ${SHADOW_OFFSET} ${SHADOW_BLUR} ${SHADOW_SPREAD} ${SHADOW_COLOR}`)
  }
  if (el.scrollTop + el.clientHeight < el.scrollHeight - TOLERANCE) {
    shadows.push(`inset 0 -${SHADOW_OFFSET} ${SHADOW_BLUR} ${SHADOW_SPREAD} ${SHADOW_COLOR}`)
  }
  if (el.scrollLeft > TOLERANCE) {
    shadows.push(`inset ${SHADOW_OFFSET} 0 ${SHADOW_BLUR} ${SHADOW_SPREAD} ${SHADOW_COLOR}`)
  }
  if (el.scrollLeft + el.clientWidth < el.scrollWidth - TOLERANCE) {
    shadows.push(`inset -${SHADOW_OFFSET} 0 ${SHADOW_BLUR} ${SHADOW_SPREAD} ${SHADOW_COLOR}`)
  }
  return shadows.join(", ")
}

/**
 * Attach the returned ref to any element with `overflow: auto`/`scroll` to
 * get a box-shadow on whichever edge(s) still have more content beyond
 * them — none while everything fits, top+bottom (or left+right) once
 * scrolled part way through, and so on. Re-checks on scroll, on the
 * element's own resize, and on DOM/image-load changes to its content, so it
 * needs no dependency list from the caller.
 */
export function useScrollShadow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.boxShadow = boxShadowFor(el)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    update()

    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    // Images inside the container change its scrollable size once they
    // load, well after the mutation that inserted the (still-sizeless) <img>.
    el.addEventListener("load", update, true)

    // jsdom (tests) doesn't implement ResizeObserver.
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    resizeObserver?.observe(el)

    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      el.removeEventListener("load", update, true)
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
    }
  }, [update])

  return ref
}
