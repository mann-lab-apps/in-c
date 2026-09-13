interface Bounds { x: number; y: number; width: number; height: number }

export function resolveSpanViewport(width: number, height: number, manualBounds: Bounds[]): Bounds {
  let left = 0
  let top = 0
  let right = width
  let bottom = height
  for (const bounds of manualBounds) {
    left = Math.min(left, bounds.x - 8)
    top = Math.min(top, bounds.y - 8)
    right = Math.max(right, bounds.x + bounds.width + 8)
    bottom = Math.max(bottom, bounds.y + bounds.height + 8)
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}
