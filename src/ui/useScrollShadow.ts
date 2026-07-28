import { useCallback, useEffect, useState } from "react"

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
 *
 * Returns a callback ref rather than a plain `useRef` object: some callers
 * (e.g. the review page) mount the ref'd element only after an initial
 * loading/empty-state render, on a component instance that itself never
 * remounts. A `useRef`-backed effect only runs once, against whatever
 * `ref.current` was at that first commit (often still `null`), and never
 * revisits it — so the element that eventually appears would never get its
 * listeners attached. Backing the ref with state instead means the attach
 * effect depends on the actual DOM node, and re-runs whenever it changes.
 */
export function useScrollShadow<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)

  const update = useCallback(() => {
    if (!el) return
    el.style.boxShadow = boxShadowFor(el)
  }, [el])

  useEffect(() => {
    if (!el) return

    update()

    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    // Images inside the container change its scrollable size once they
    // load, well after the mutation that inserted the (still-sizeless) <img>.
    el.addEventListener("load", update, true)
    // A disclosure (e.g. the review prompt's "show meaning/images" expander)
    // grows the scrollable area via a CSS grid-template-rows transition
    // triggered by a class toggle, not by inserting/removing nodes — the
    // `attributes` mutation below fires the moment that class flips, before
    // the transition has actually resized anything, so it needs this to
    // catch the real, settled size once the animation finishes.
    el.addEventListener("transitionend", update)

    // jsdom (tests) doesn't implement ResizeObserver.
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    resizeObserver?.observe(el)

    // `attributes: true` catches class/style-driven layout changes (like the
    // disclosure above) that don't add or remove any nodes — without it,
    // toggling a class deep in the subtree is invisible to this observer.
    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    })

    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      el.removeEventListener("load", update, true)
      el.removeEventListener("transitionend", update)
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
    }
  }, [el, update])

  return setEl
}
