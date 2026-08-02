import type { Ref, RefCallback } from "react"

/** Combines multiple refs (callback or object) into one callback ref, for
 *  attaching two independent ref-based hooks to the same DOM node. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === "function") ref(node)
      else (ref as { current: T | null }).current = node
    }
  }
}
