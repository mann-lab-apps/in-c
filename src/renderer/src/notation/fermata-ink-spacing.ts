import type { SystemInk } from './system-ink-spacing'

type InkBounds = Pick<SystemInk, 'x' | 'y' | 'width' | 'height'>
const valid = (ink: InkBounds) => [ink.x, ink.y, ink.width, ink.height].every(Number.isFinite) && ink.width > 0 && ink.height > 0

/** Associate a mark with its painted staff, while clearing real owned music ink. */
export function resolveFermataInkOffset(fermata: InkBounds, obstacles: readonly InkBounds[], staffTop?: number): number {
  if (!valid(fermata)) return 0
  const bottom = fermata.y + fermata.height
  // Without a measured staff boundary retain the conservative old baseline.
  let offset = Number.isFinite(staffTop) ? staffTop! - 8 - bottom : 0
  for (const note of obstacles) {
    if (!valid(note) || Math.min(fermata.x + fermata.width, note.x + note.width) <= Math.max(fermata.x, note.x)) continue
    offset = Math.min(offset, note.y - 8 - bottom)
  }
  return Math.abs(offset) > 0.05 ? Math.floor(offset * 100) / 100 : 0
}
