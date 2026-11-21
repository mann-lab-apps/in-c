interface MeasureTextFocusOwner {
  family: string
  id: string
  generation: number
  viewKey: string
  focus?: boolean
}

/** History restores selection/data, not an obsolete request to enter a field.
 * Keep the existing behavior for field-origin history and changed selections. */
export function restoreMeasureTextHistoryRequest<T extends MeasureTextFocusOwner>(
  restored: T | undefined, current: T | undefined, origin: Element | null
): (Omit<T, 'focus'> & { focus?: boolean }) | undefined {
  if (!restored || !current || restored.focus === false ||
    restored.family !== current.family || restored.id !== current.id ||
    restored.generation !== current.generation || restored.viewKey !== current.viewKey ||
    !origin?.isConnected || !origin.matches('.notation-event:not(.is-preview)') ||
    !origin.closest('.score-canvas') ||
    !['event', 'part', 'staff', 'measure', 'voice'].every(key => origin.getAttribute(`data-${key}-id`))) return restored
  // A shallow copy preserves the selection references used by App ownership.
  return { ...restored, focus: false }
}
