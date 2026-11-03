/** Renderer-only ownership shared by input and playback following. */
function isInternalViewportScroll(event: WheelEvent | TouchEvent, canvas: HTMLElement, deltaY?: number): boolean {
  for (let node = event.target instanceof Element ? event.target : null;
    node && node !== canvas && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (node.clientHeight > 0 && /(auto|scroll)/.test(style.overflowY)) {
      // A contained scrollport also blocks vertical chaining when its content
      // fits exactly (for example, a short settings popover).
      const contained = /^(contain|none)$/.test(style.overscrollBehaviorY)
      if (deltaY && contained) return true
      if (node.scrollHeight <= node.clientHeight) continue
      // A vertical gesture at an auto boundary continues to an outer
      // scrollport/document. Unknown direction retains the existing policy.
      if (!deltaY) return true
      // Extents are integers, but scrollTop can end on a fraction. A reported
      // subpixel remainder can already be the native bottom boundary. Keep a
      // full pixel of room internal instead of treating it as an edge.
      const bottomRoom = node.scrollHeight - node.clientHeight - node.scrollTop
      if ((deltaY < 0 && node.scrollTop > 0) ||
        (deltaY > 0 && bottomRoom >= 1)) return true
    }
  }
  return false
}

// One tracker per listener owner: sharing mutable gesture state across App
// and playback would make the second listener see a spurious zero delta.
export function createViewportScrollTracker() {
  let previous: {id: number; y: number} | undefined
  let touchOwner: boolean | undefined
  const touchStart = (event: TouchEvent) => {
    const point = event.touches.length === 1 ? event.touches[0] : undefined
    previous = point ? {id: point.identifier, y: point.clientY} : undefined
    touchOwner = undefined
  }
  return {
    touchStart,
    isInternalScroll(event: WheelEvent | TouchEvent, canvas: HTMLElement): boolean {
      if (event instanceof WheelEvent) return isInternalViewportScroll(event, canvas, event.deltaY)
      const point = event.touches.length === 1 ? event.touches[0] : undefined
      if (!point) {
        previous = undefined; touchOwner = undefined
        return isInternalViewportScroll(event, canvas)
      }
      const delta = previous?.id === point.identifier ? previous.y - point.clientY : undefined
      previous = {id: point.identifier, y: point.clientY}
      // Chromium latches a touch gesture to the scrollport that consumes its
      // first movement, including later movement/inertia at that port's edge.
      // A new gesture at the boundary can instead chain to the document.
      if (touchOwner !== undefined) return touchOwner
      if (!delta) return isInternalViewportScroll(event, canvas)
      touchOwner = isInternalViewportScroll(event, canvas, delta)
      return touchOwner
    }
  }
}

/** A native scrollbar press owns the viewport immediately, including a
 * stationary overlay-thumb click. HTML hits inside the actual body paint box
 * distinguish overlay UI from body/content clicks; do not guess an OS width.
 * Classic gutter presses retain their existing immediate ownership policy. */
export function observeDocumentScrollbarIntent(onIntent: () => void): () => void {
  const down = (event: PointerEvent) => {
    const root = document.documentElement
    if (event.target !== root || event.button !== 0) return
    if (event.clientX >= root.clientWidth) { onIntent(); return }
    const body = document.body.getBoundingClientRect()
    const insideBody = body.width > 0 && body.height > 0 &&
      event.clientX >= body.left && event.clientX < body.right &&
      event.clientY >= body.top && event.clientY < body.bottom
    const scrollable = root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth
    if (insideBody && scrollable) onIntent()
  }
  window.addEventListener('pointerdown', down, {capture: true, passive: true})
  return () => window.removeEventListener('pointerdown', down, true)
}
