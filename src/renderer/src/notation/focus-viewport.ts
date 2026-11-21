import type {Score} from '../../../score-core'
import {hasManualSpanEngraving} from '../../../project/span-engraving'

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
  const same = keys.length > 0 && keys.every(key => Boolean(origin.getAttribute(key)) && origin.getAttribute(key) === active.getAttribute(key))
  return same && (!origin.matches('.notation-span-target') ||
    origin.getAttribute('data-system-index') === active.getAttribute('data-system-index'))
}

/** Keep the painted piece that owned focus; a different selection starts normally. */
export function resolveSpanFocusTarget(container: ParentNode,
  reference: {kind: 'slur' | 'hairpin'; id: string}, previous: Element | null): SVGElement | undefined {
  const candidates = [...container.querySelectorAll<SVGElement>('.notation-span-target')]
    .filter(node => node.dataset.spanId === reference.id && node.dataset.spanKind === reference.kind)
  const system = previous?.getAttribute('data-system-index')
  if (system !== null && system !== undefined && previous?.matches('.notation-span-target') &&
    previous.getAttribute('data-span-id') === reference.id && previous.getAttribute('data-span-kind') === reference.kind) {
    return candidates.find(node => node.dataset.systemIndex === system) ?? candidates[0]
  }
  return candidates[0]
}

/** Tab focus is independent of selection until an explicit activation. */
export function resolveUnchangedSpanFocusTarget(container: ParentNode,
  previous: Element | null, selectionChanged: boolean): SVGElement | undefined {
  if (selectionChanged || !previous?.matches('.notation-span-target')) return undefined
  const id = previous.getAttribute('data-span-id'), kind = previous.getAttribute('data-span-kind')
  if (!id || (kind !== 'slur' && kind !== 'hairpin')) return undefined
  return resolveSpanFocusTarget(container, {id, kind}, previous)
}

/** Preserve a tabbed note only while the caller's active span selection is stable. */
export function resolveTabNoteFocusTarget(container: ParentNode,
  previous: Element | null, spanSelectionStable: boolean): SVGElement | undefined {
  if (!spanSelectionStable || !previous?.matches('.notation-event')) return undefined
  return [...container.querySelectorAll<SVGElement>('.notation-event:not(.is-preview)')]
    .find(node => isSameNotationFocus(previous, node))
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

/** Only a manual offset changed: restore the SVG keyboard target, not its old screen position.
 * Compare model values because part/page projections can clone unchanged arrays.
 * Musical edits, endpoints, shape changes and reset-to-auto keep normal focus following.
 */
export function isSpanOffsetOnlyChange(previous: Score | undefined, next: Score, reference: {kind: 'slur' | 'hairpin'; id: string}): boolean {
  if (!previous || previous === next || previous.id !== next.id) return false
  const family = reference.kind === 'slur' ? 'slurs' : 'hairpins'
  const before = previous[family]?.find(span => span.id === reference.id)
  const after = next[family]?.find(span => span.id === reference.id)
  if (!before || !after || !hasManualSpanEngraving(before.engraving) || !hasManualSpanEngraving(after.engraving)) return false
  if (before.engraving?.height !== after.engraving?.height || before.engraving?.placement !== after.engraving?.placement) return false
  if (before.engraving?.offsetX === after.engraving?.offsetX && before.engraving?.offsetY === after.engraving?.offsetY) return false
  const rest = (score: Score) => ({...score, [family]: score[family]?.map(span => span.id === reference.id ? {...span, engraving: undefined} : span)})
  return JSON.stringify(rest(previous)) === JSON.stringify(rest(next))
}
