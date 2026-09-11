export interface RangeSelectionPoint {
  eventId: string
  noteHeadBeginX?: number
  noteHeadBottomY?: number
  noteHeadEndX?: number
  noteHeadTopY?: number
  staffIndex: number
  systemIndex: number
  x: number
  y: number
}

export interface RangeSelectionBand {
  height: number
  staffIndex: number
  systemIndex: number
  width: number
  x: number
  y: number
}

const HORIZONTAL_PADDING = 14
const VERTICAL_PADDING = 14
const MIN_BAND_HEIGHT = 64
const MIN_BAND_WIDTH = 28

export function resolveRangeSelectionBands(
  points: RangeSelectionPoint[]
): RangeSelectionBand[] {
  const groupedPoints = new Map<string, RangeSelectionPoint[]>()

  for (const point of points) {
    const key = `${point.systemIndex}:${point.staffIndex}`
    groupedPoints.set(key, [...(groupedPoints.get(key) ?? []), point])
  }

  return [...groupedPoints.values()]
    .map((group) => createRangeSelectionBand(group))
    .sort(
      (left, right) =>
        left.systemIndex - right.systemIndex ||
        left.staffIndex - right.staffIndex ||
        left.x - right.x
    )
}

function createRangeSelectionBand(
  points: RangeSelectionPoint[]
): RangeSelectionBand {
  const sorted = [...points].sort((left, right) => left.x - right.x)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const x1 = Math.min(
    ...sorted.map((point) => point.noteHeadBeginX ?? point.x)
  )
  const x2 = Math.max(
    ...sorted.map((point) => point.noteHeadEndX ?? point.x + MIN_BAND_WIDTH)
  )
  const y1 = Math.min(
    ...sorted.map((point) => point.noteHeadTopY ?? point.y + 8)
  )
  const y2 = Math.max(
    ...sorted.map((point) => point.noteHeadBottomY ?? point.y + 58)
  )
  const paddedX = x1 - HORIZONTAL_PADDING
  const paddedY = y1 - VERTICAL_PADDING

  return {
    height: Math.max(MIN_BAND_HEIGHT, y2 - y1 + VERTICAL_PADDING * 2),
    staffIndex: first.staffIndex,
    systemIndex: first.systemIndex,
    width: Math.max(MIN_BAND_WIDTH, x2 - x1 + HORIZONTAL_PADDING * 2),
    x: paddedX,
    y: paddedY
  }
}
