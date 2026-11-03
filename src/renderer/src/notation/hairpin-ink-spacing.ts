import type { StaffInk } from './staff-ink-spacing'

export interface AutomaticHairpinInk extends StaffInk {
  id: string
  offsetY: number
  plannedOffsetY: number
}

// These bounds come from visible painted SVG, not the transparent span target.
export function resolveHairpinInkMinimums(music: readonly StaffInk[], spans: readonly AutomaticHairpinInk[], existing: ReadonlyMap<string, number>): ReadonlyMap<string, number> {
  const required = new Map<string, number>()
  for (const span of spans) {
    if (![span.x,span.y,span.width,span.height,span.offsetY,span.plannedOffsetY].every(Number.isFinite) || span.width<=0 || span.height<=0) continue
    let deficit = 0
    for (const note of music) {
      if (![note.x,note.y,note.width,note.height].every(Number.isFinite) || note.width<=0 || note.height<=0 || note.staffIndex!==span.staffIndex || note.systemIndex!==span.systemIndex ||
        Math.min(note.x+note.width,span.x+span.width)<=Math.max(note.x,span.x)) continue
      deficit = Math.max(deficit, note.y + note.height + 8 - span.y)
    }
    const minimum = deficit > 0.05 ? Math.ceil((span.offsetY + deficit + 0.01) * 100) / 100 : span.offsetY
    // The final draw's stem-derived offset also belongs in the next annotation
    // plan, even when music itself is clear: expression text must follow it.
    if (minimum > span.plannedOffsetY + 0.05 && minimum > (existing.get(span.id) ?? 0) + 0.05) required.set(span.id, Math.max(required.get(span.id) ?? 0, minimum))
  }
  if (!required.size) return existing
  const next = new Map(existing)
  for (const [id, value] of required) next.set(id, value)
  return next
}
