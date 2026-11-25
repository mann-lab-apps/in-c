interface Point {
  x: number
  y: number
}

interface SystemBounds {
  x1: number
  x2: number
  y: number
}

interface HairpinSegment {
  systemIndex: number
  x1: number
  x2: number
  staffY: number
  isFirst: boolean
  isLast: boolean
}

export function resolveHairpinStemClearance(
  laneOffset: number,
  stemBottomOffsets: Iterable<number>
): number {
  // Reserve the 10px wedge opening plus an 8px gap from every voice's stem.
  return Math.max(laneOffset, ...Array.from(stemBottomOffsets, bottom => bottom + 18))
}

export function resolveHairpinOpenings(
  type: string,
  isFirst: boolean,
  isLast: boolean
): { left: number; right: number } {
  return {
    left: type === 'diminuendo' ? 10 : isFirst ? 0 : 8,
    right: type === 'crescendo' ? 10 : isLast ? 0 : 8
  }
}

export function resolveHairpinSegments(
  start: Point,
  end: Point & { exactEnd?: boolean },
  startSystem: number,
  endSystem: number,
  boundsBySystemIndex: Map<number, SystemBounds>
): HairpinSegment[] {
  const segments: HairpinSegment[] = []
  const firstSystem = Math.min(startSystem, endSystem)
  const lastSystem = Math.max(startSystem, endSystem)

  for (let systemIndex = firstSystem; systemIndex <= lastSystem; systemIndex += 1) {
    const bounds = boundsBySystemIndex.get(systemIndex)

    if (!bounds) {
      continue
    }

    const isFirst = systemIndex === startSystem
    const isLast = systemIndex === endSystem
    const insetStart = isFirst ? start.x + 10 : bounds.x1 + 22
    const closingX = end.exactEnd ? end.x : Math.max(insetStart + 24, end.x + 22)
    const x2 = isLast ? closingX : bounds.x2 - 18
    // A short exact ending can still fit if the opening uses less of its
    // usual inset. Keep the supplied ending and the opening at or after the note.
    const x1 = isFirst && isLast && end.exactEnd
      ? Math.min(insetStart, Math.max(start.x, x2 - 9))
      : insetStart

    if (x2 > x1 + 8) {
      segments.push({ systemIndex, x1, x2, staffY: bounds.y, isFirst, isLast })
    }
  }

  return segments
}
