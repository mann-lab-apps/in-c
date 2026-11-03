import type { SystemInk } from './system-ink-spacing'

export interface SystemMusicFrame {
  /** Actual first-staff origin,after existing pitch/page placement. */
  y: number
  /** Current system height plus the layout's pitch/lyric reservation. */
  reservedHeight: number
  /** Pitch reservation is independent of the system height;lyric reserve is not. */
  pitchBelow: number
}

/** Reserve lower painted music in the system/page packer,not just the SVG. */
export function resolveSystemMusicMinimum(
  ink: readonly SystemInk[], frames: ReadonlyMap<number,SystemMusicFrame>, existingMinimum: number
): number {
  let minimum=existingMinimum
  for (const b of ink) {
    const frame=frames.get(b.systemIndex)
    if (!frame || !Number.isInteger(b.systemIndex) || b.systemIndex<0 ||
      ![b.x,b.y,b.width,b.height,frame.y,frame.reservedHeight,frame.pitchBelow].every(Number.isFinite) ||
      b.width<=0 || b.height<=0 || frame.reservedHeight<0 || frame.pitchBelow<0) continue
    const needed=b.y+b.height-frame.y+8
    // Ignore binary floating-point noise at an exact hundredth boundary.
    if (needed>frame.reservedHeight+.05) minimum=Math.max(minimum,Math.ceil((needed-frame.pitchBelow)*100-1e-6)/100)
  }
  return minimum
}
