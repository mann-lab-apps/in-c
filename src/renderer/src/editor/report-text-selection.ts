const readingSurfaces = '.studio-warning-report, .studio-warning-technical, .studio-status__result'

const readingNavigationKeys = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'PageUp', 'PageDown', 'Home', 'End'
])

/** Existing diagnostic reading keys; modifiers remain with the browser owner. */
export function isReportNavigationKey(key: string): boolean {
  return readingNavigationKeys.has(key)
}

function elementFor(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
}

function isReadable(element: Element): boolean {
  if (!element.isConnected || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false
  if (element.checkVisibility?.() === false) return false
  const view = element.ownerDocument.defaultView
  for (let current: Element | null = element; current; current = current.parentElement) {
    const style = view?.getComputedStyle(current)
    if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse' || style?.opacity === '0') return false
  }
  return true
}

/** Browser-selected diagnostic text owns clipboard, selection-delete, navigation,
 * and approved plain-Space reading in a reading context.
 * An explicit score/control destination wins over a lingering DOM selection.
 * This does not turn a diagnostic into an editable field or change score keys.
 */
export function ownsReportTextSelection(target: EventTarget | null): boolean {
  if (!(target instanceof Element) || !isReadable(target)) return false
  const doc = target.ownerDocument
  if (target !== doc.body && !target.closest(readingSurfaces)) return false
  const selection = doc.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0 || selection.toString().length === 0) return false
  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index)
    for (const node of [range.startContainer, range.endContainer]) {
      const element = elementFor(node)
      if (!element || element.ownerDocument !== doc || !element.closest(readingSurfaces) || !isReadable(element)) return false
    }
  }
  return true
}
