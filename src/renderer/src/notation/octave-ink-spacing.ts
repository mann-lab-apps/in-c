import { resolveStaffInkSpacing, type StaffInk } from './staff-ink-spacing'

const valid = (ink: StaffInk) => [ink.x, ink.y, ink.width, ink.height, ink.staffIndex, ink.systemIndex].every(Number.isFinite) &&
  ink.width > 0 && ink.height > 0 && Number.isInteger(ink.staffIndex) && ink.staffIndex >= 0 && Number.isInteger(ink.systemIndex) && ink.systemIndex >= 0

/** Move only the automatic octave segment away from its staff's painted ink. */
export function resolveOctaveInkShift(pieces: readonly StaffInk[], obstacles: readonly StaffInk[], below: boolean): number {
  let deficit = 0
  for (const piece of pieces) for (const obstacle of obstacles) {
    if (!valid(piece) || !valid(obstacle) || piece.staffIndex !== obstacle.staffIndex || piece.systemIndex !== obstacle.systemIndex ||
      Math.min(piece.x + piece.width, obstacle.x + obstacle.width) <= Math.max(piece.x, obstacle.x)) continue
    deficit = Math.max(deficit, below
      ? obstacle.y + obstacle.height + 8 - piece.y
      : piece.y + piece.height + 8 - obstacle.y)
  }
  if (deficit <= 0.05) return 0
  const shift = Math.ceil((deficit + 0.01) * 100) / 100
  return below ? shift : -shift
}

/** Both directions are measured in the same frame; never add competing gap plans twice. */
export function resolveOctaveStaffSpacing(octaves: readonly StaffInk[], neighbors: readonly StaffInk[], existing: ReadonlyMap<number, number>): ReadonlyMap<number, number> {
  const below = resolveStaffInkSpacing(octaves, neighbors, existing)
  const above = resolveStaffInkSpacing(neighbors, octaves, existing)
  if (below === existing) return above
  if (above === existing) return below
  const result = new Map(below)
  for (const [key, value] of above) result.set(key, Math.max(result.get(key) ?? 0, value))
  return result
}
