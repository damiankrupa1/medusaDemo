import { RefObject, useLayoutEffect } from "react"

/**
 * Lifts the `max-width` cap of everything around `ref` while the page is shown.
 *
 * The Medusa dashboard renders every page inside a wrapper with
 * `max-w-[1600px]`, which also caps a full-bleed embed such as the Payload
 * iframe. Instead of matching that class name (it is Medusa's to change), this
 * clears whatever `max-width` the ancestors actually have, and puts it back on
 * unmount so other admin pages keep their layout.
 */
export const useUnconstrainedWidth = (
  ref: RefObject<HTMLElement | null>,
  active: boolean
) => {
  useLayoutEffect(() => {
    const element = ref.current

    if (!active || !element) {
      return
    }

    const lifted: { element: HTMLElement; maxWidth: string }[] = []

    for (
      let parent = element.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      if (window.getComputedStyle(parent).maxWidth !== "none") {
        lifted.push({ element: parent, maxWidth: parent.style.maxWidth })
        parent.style.maxWidth = "none"
      }
    }

    return () => {
      lifted.forEach(({ element: parent, maxWidth }) => {
        parent.style.maxWidth = maxWidth
      })
    }
  }, [ref, active])
}
