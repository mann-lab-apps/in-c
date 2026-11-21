import type { SpanEngraving } from '../../../score-core'
import { hasManualSpanEngraving } from '../../../project/span-engraving'
import { planManualSpanTranslation, type BeginManualSpanDrag, type SpanDragReference } from '../editor/manual-span-drag'
import { resolveSpanPointerOwner } from './span-pointer-owner'

type Matrix = Pick<DOMMatrix, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>
const finiteMatrix = (matrix: Matrix) => [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].every(Number.isFinite)
const sameMatrix = (a: Matrix, b: Matrix) => (['a', 'b', 'c', 'd', 'e', 'f'] as const).every(key => Math.abs(a[key] - b[key]) < .001)
/** Transient SVG preview only. App owns an immutable transaction for the actual command. */
export function attachManualSpanPointerDrag(container: HTMLElement, options: { reference?: SpanDragReference; engraving?: SpanEngraving; begin?: BeginManualSpanDrag; printLayout?: boolean }) {
  const { reference, engraving, begin } = options, doc = container.ownerDocument, view = doc.defaultView!
  if (options.printLayout || !reference || !engraving || !hasManualSpanEngraving(engraving) || !begin) return () => {}
  const groups = () => [...container.querySelectorAll<SVGElement>('.notation-span-target.is-selected')].filter(node => node.dataset.spanId === reference.id && node.dataset.spanKind === reference.kind)
  const marked = groups().map(node => ({ node, before: node.getAttribute('data-span-draggable') }))
  for (const { node } of marked) node.setAttribute('data-span-draggable', 'true')
  let cancelCurrent: (() => void) | undefined, disposeClick: (() => void) | undefined
  const pointerDown = (event: PointerEvent) => {
    cancelCurrent?.(); disposeClick?.()
    if (event.button !== 0 || event.isPrimary === false || event.pointerType && event.pointerType !== 'mouse' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    const target = event.target instanceof Element ? event.target.closest<SVGElement>('.notation-span-target') : null
    if (!target || !groups().includes(target) || !target.isConnected || !Number.isFinite(event.pointerId)) return
    const painted = resolveSpanPointerOwner(target, event.clientX, event.clientY)
    if (painted && (painted.id !== reference.id || painted.kind !== reference.kind)) return
    const svg = target.ownerSVGElement, nodes = groups()
    if (!svg || nodes.some(node => node.parentNode !== svg || node.ownerSVGElement !== svg)) return
    let matrix: DOMMatrix, inverse: DOMMatrix
    try { matrix = svg.getScreenCTM()!; inverse = matrix.inverse(); if (!finiteMatrix(matrix) || !finiteMatrix(inverse)) return } catch { return }
    const transaction = begin(reference, engraving)
    if (!transaction) return
    event.preventDefault(); event.stopPropagation(); target.focus({ preventScroll: true })
    const initial = { x: event.clientX, y: event.clientY }, pointerId = event.pointerId
    const original = nodes.map(node => ({ node, transform: node.getAttribute('transform') }))
    let moved = false, ended = false, last = initial
    let plan: ReturnType<typeof planManualSpanTranslation> = { status: 'no-change' }
    const connected = () => container.isConnected && target.isConnected && nodes.every(node => node.isConnected)
    const restore = () => { for (const { node, transform } of original) { if (transform === null) node.removeAttribute('transform'); else node.setAttribute('transform', transform); node.removeAttribute('data-span-dragging'); node.removeAttribute('data-span-drag-invalid') } }
    const suppressOwnClick = () => {
      disposeClick?.()
      let timer: ReturnType<typeof setTimeout>
      const click = (next: MouseEvent) => {
        const group = next.target instanceof Element ? next.target.closest<SVGElement>('.notation-span-target') : null
        if (next.detail > 0 && group?.dataset.spanId === reference.id && group.dataset.spanKind === reference.kind && Math.abs(next.clientX - last.x) <= 3 && Math.abs(next.clientY - last.y) <= 3) { next.preventDefault(); next.stopImmediatePropagation(); disposeClick?.() }
      }
      disposeClick = () => { view.removeEventListener('click', click, true); clearTimeout(timer); disposeClick = undefined }
      view.addEventListener('click', click, true); timer = setTimeout(() => disposeClick?.(), 500)
    }
    const finish = (commit: boolean) => {
      if (ended) return
      ended = true; cancelCurrent = undefined
      view.removeEventListener('pointermove', move, true); view.removeEventListener('pointerup', up, true); view.removeEventListener('pointercancel', cancelPointer, true)
      view.removeEventListener('focusin', leaveFocus, true);
      view.removeEventListener('keydown', key, true); view.removeEventListener('blur', cancel); view.removeEventListener('compositionstart', cancel, true)
      view.removeEventListener('wheel', wheel, true); view.removeEventListener('scroll', cancel, true); view.removeEventListener('resize', cancel)
      target.removeEventListener('lostpointercapture', lostCapture); restore()
      try { if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId) } catch { /* Detached capture is already cancelled. */ }
      if (moved) suppressOwnClick()
      if (commit && moved && connected()) {
        if (plan.status === 'valid') transaction.commit(plan.engraving)
        else if (plan.status === 'out-of-range') transaction.reject('range')
      }
    }
    const cancel = () => finish(false)
    const leaveFocus = (next: FocusEvent) => { if (!(next.target instanceof Node) || !target.contains(next.target)) cancel() }
    const lostCapture = (next: Event) => { if ((next as PointerEvent).pointerId === pointerId && !target.hasPointerCapture?.(pointerId)) cancel() }
    const cancelPointer = (next: PointerEvent) => { if (next.pointerId === pointerId) cancel() }
    const key = (next: KeyboardEvent) => {
      if (next.isComposing || next.keyCode === 229 || next.key === 'Process') { cancel(); return }
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(next.key)) { cancel(); return }
      if (next.key === 'Escape') { next.preventDefault(); next.stopImmediatePropagation() }
      cancel()
    }
    const wheel = (next: WheelEvent) => { if (next.deltaX !== 0 || next.deltaY !== 0 || next.deltaZ !== 0) cancel() }
    const update = (next: PointerEvent) => {
      if (!connected()) { cancel(); return false }
      try { const current = svg.getScreenCTM(); if (!current || !sameMatrix(matrix, current)) { cancel(); return false } } catch { cancel(); return false }
      last = { x: next.clientX, y: next.clientY }
      if (!moved && Math.hypot(last.x - initial.x, last.y - initial.y) < 3) return true
      moved = true
      const dx = last.x - initial.x, dy = last.y - initial.y
      plan = planManualSpanTranslation(engraving, (inverse.a * dx + inverse.c * dy) / 10, (inverse.b * dx + inverse.d * dy) / 10)
      for (const { node, transform } of original) {
        node.setAttribute('data-span-dragging', 'true')
        if (plan.status === 'valid') { node.setAttribute('transform', `translate(${plan.deltaX * 10} ${plan.deltaY * 10})${transform ? ' ' + transform : ''}`); node.removeAttribute('data-span-drag-invalid') }
        else { if (transform === null) node.removeAttribute('transform'); else node.setAttribute('transform', transform); node.toggleAttribute('data-span-drag-invalid', plan.status === 'out-of-range') }
      }
      return true
    }
    const move = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; if (!(next.buttons & 1) || next.ctrlKey || next.metaKey || next.altKey || next.shiftKey) { cancel(); return } next.preventDefault(); update(next) }
    const up = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; if (next.ctrlKey || next.metaKey || next.altKey || next.shiftKey) { cancel(); return } next.preventDefault(); if (update(next)) finish(true) }
    cancelCurrent = cancel
    view.addEventListener('pointermove', move, true); view.addEventListener('pointerup', up, true); view.addEventListener('pointercancel', cancelPointer, true)
    view.addEventListener('focusin', leaveFocus, true);
    view.addEventListener('keydown', key, true); view.addEventListener('blur', cancel); view.addEventListener('compositionstart', cancel, true)
    view.addEventListener('wheel', wheel, { capture: true, passive: true }); view.addEventListener('scroll', cancel, true); view.addEventListener('resize', cancel)
    target.addEventListener('lostpointercapture', lostCapture)
    try { target.setPointerCapture?.(pointerId) } catch { cancel() }
  }
  container.addEventListener('pointerdown', pointerDown)
  return () => {
    cancelCurrent?.(); disposeClick?.(); container.removeEventListener('pointerdown', pointerDown)
    for (const { node, before } of marked) { if (before === null) node.removeAttribute('data-span-draggable'); else node.setAttribute('data-span-draggable', before) }
  }
}
