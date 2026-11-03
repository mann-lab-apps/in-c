type Bounds = { x: number; y: number; width: number; height: number }
export interface SlurSideObstacle {
  startStaff?: number
  endStaff?: number
  startSystem?: number
  endSystem?: number
  horizontalTextLane?: boolean
  manualSpan?: boolean
  sourceSlurIndex?: number
  scopedManualSlur?: boolean
  bounds: readonly (Bounds | undefined)[]
}
const valid = (b: Bounds | undefined): b is Bounds => Boolean(b &&
  [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.width > 0 && b.height > 0)
const staff = (index: number | undefined): index is number => Number.isInteger(index) && index! >= 0
const overlapsX = (ink: Bounds, bow: Bounds) => ink.x < bow.x + bow.width + 8 && ink.x + ink.width > bow.x - 8

/** Keep local/unknown protection; release only measured, noninterfering distant ink. */
export function protectedInkBlocksSlurSide(
  staffIndex: number | undefined, candidate: readonly (Bounds | undefined)[], obstacles: readonly SlurSideObstacle[],
  systemIndex?: number
): boolean {
  if (!obstacles.length) return false
  if (!staff(staffIndex) || !candidate.length || candidate.some(b => !valid(b))) return true
  return obstacles.some(span => {
    const { startSystem, endSystem } = span
    const knownSystem = staff(systemIndex) && staff(startSystem) && staff(endSystem) && startSystem <= endSystem
    const separateSystem = knownSystem && (systemIndex < startSystem || systemIndex > endSystem)
    if (!staff(span.startStaff) || !staff(span.endStaff) || span.startStaff !== span.endStaff ||
      !span.bounds.length || span.bounds.some(b => !valid(b))) return true
    const contained = span.scopedManualSlur && knownSystem && startSystem === systemIndex && endSystem === systemIndex
    const horizontalLane = span.horizontalTextLane ||
      (span.manualSpan && knownSystem && startSystem === systemIndex && endSystem === systemIndex)
    if (span.startStaff === staffIndex && !separateSystem && !contained && (!horizontalLane || !knownSystem ||
      span.bounds.some(ink => candidate.some(bow => valid(ink) && valid(bow) && overlapsX(ink, bow))))) return true
    return span.bounds.some(ink => candidate.some(bow => valid(ink) && valid(bow) &&
      overlapsX(ink, bow) &&
      ink.y < bow.y + bow.height + 8 && ink.y + ink.height > bow.y - 8))
  })
}
