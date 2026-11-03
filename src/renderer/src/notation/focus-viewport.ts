const restoring = new WeakSet<Element>()

export function isRestoringNotationFocus(target: Element | null): boolean {
  return target !== null && restoring.has(target)
}

export function isSameNotationFocus(origin: Element | null, active: Element | null): boolean {
  if (!origin || !active) return false
  const keys = origin.matches('.notation-event') && active.matches('.notation-event')
    ? ['data-event-id', 'data-part-id', 'data-staff-id', 'data-measure-id', 'data-voice-id']
    : origin.matches('.notation-span-target') && active.matches('.notation-span-target')
      ? ['data-span-id', 'data-span-kind']
      :origin.matches('.notation-rehearsal-mark')&&active.matches('.notation-rehearsal-mark')?['data-rehearsal-id']:origin.matches('.notation-system-text-target')&&active.matches('.notation-system-text-target')?['data-system-text-id']:origin.matches('.notation-staff-text-target')&&active.matches('.notation-staff-text-target')?['data-staff-text-id']:origin.matches('.notation-dynamic-target')&&active.matches('.notation-dynamic-target')?['data-dynamic-id']:origin.matches('.notation-harmony-target')&&active.matches('.notation-harmony-target')?['data-harmony-id']:origin.matches('.notation-expression-text-target')&&active.matches('.notation-expression-text-target')?['data-expression-text-id']:[]
  return keys.length > 0 && keys.every(key => Boolean(origin.getAttribute(key)) && origin.getAttribute(key) === active.getAttribute(key))
}

/** Replacing SVG nodes restores keyboard ownership, not a new user focus intent. */
export function restoreNotationFocus(target: HTMLElement | SVGElement, anchor: Element,
  previousBox: DOMRect, canvas: HTMLElement | null, restoreViewport = true, automatic = true): void {
  if (automatic) restoring.add(target)
  try { target.focus({preventScroll: true}) } finally { if (automatic) restoring.delete(target) }
  if (!restoreViewport) return
  const box = (anchor.matches('.notation-rehearsal-mark,.notation-system-text-target,.notation-staff-text-target,.notation-expression-text-target,.notation-harmony-target,.notation-dynamic-target')
    ? anchor.querySelector('rect') : anchor)?.getBoundingClientRect() ?? anchor.getBoundingClientRect()
  const top = Math.max(16, Math.min(previousBox.top, window.innerHeight - box.height - 16))
  window.scrollBy(0, box.top - top)
  if (canvas) {
    const bounds = canvas.getBoundingClientRect()
    const left = Math.max(bounds.left + 16, Math.min(previousBox.left, bounds.right - box.width - 16))
    canvas.scrollLeft += box.left - left
  }
}
