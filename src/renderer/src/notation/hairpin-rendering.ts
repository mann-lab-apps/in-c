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
  x1: number
  x2: number
  staffY: number
  isFirst: boolean
  isLast: boolean
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
  end: Point,
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
    const x1 = isFirst ? start.x + 10 : bounds.x1 + 22
    const x2 = isLast ? Math.max(x1 + 24, end.x + 22) : bounds.x2 - 18

    if (x2 > x1 + 8) {
      segments.push({ x1, x2, staffY: bounds.y, isFirst, isLast })
    }
  }

  return segments
}
