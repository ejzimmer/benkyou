import { useMemo } from "react"
import { useScrollShadow } from "./useScrollShadow"
import { useFocusTrap } from "./useFocusTrap"
import { mergeRefs } from "./mergeRefs"

/** Ref for a modal panel: applies the scroll-fade shadow and traps keyboard
 *  focus inside it, both attached to the same DOM node. */
export function useModalPanelRef<T extends HTMLElement>() {
  const scrollShadowRef = useScrollShadow<T>()
  const focusTrapRef = useFocusTrap<T>()
  return useMemo(
    () => mergeRefs(scrollShadowRef, focusTrapRef),
    [scrollShadowRef, focusTrapRef],
  )
}
