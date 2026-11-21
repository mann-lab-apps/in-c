import type { Stave, StaveNote } from 'vexflow'
export interface RestInkBounds { x: number; y: number; width: number; height: number }
const valid = (r: RestInkBounds) => [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0

export function resolveRestHeadShift(rest: RestInkBounds, heads: readonly RestInkBounds[], direction: -1 | 1, padding: number): number {
  if (!valid(rest) || !Number.isFinite(padding) || padding < 0) return 0
  const candidates = heads.filter(head => valid(head) && Math.min(rest.x + rest.width, head.x + head.width) > Math.max(rest.x, head.x))
  let shift = 0
  // Outward movement is monotonic: each pass clears at least one more head.
  for (let pass = 0; pass <= candidates.length; pass++) {
    const before = shift
    for (const head of candidates) {
      if (rest.y + shift >= head.y + head.height + padding || rest.y + rest.height + shift + padding <= head.y) continue
      shift = direction > 0 ? Math.max(shift, head.y + head.height + padding - rest.y) : Math.min(shift, head.y - padding - rest.y - rest.height)
    }
    if (Math.abs(shift - before) < .000001) break
  }
  return direction > 0 ? Math.ceil(shift * 1e6) / 1e6 : Math.floor(shift * 1e6) / 1e6
}

/** Render objects only. Preserve clear layouts, pitches, score data and hit ownership. */
export function clearSameStaffRestHeadCollisions(voices: readonly { voiceId: string; notes: readonly StaveNote[] }[], stave: Stave): number {
  if (voices.length < 2) return 0
  const notes = voices.flatMap(voice => voice.notes.filter(note => note.renderOptions.draw !== false).map(note => ({ note, voiceId: voice.voiceId })))
  notes.forEach(({ note }) => note.setStave(stave))
  const ink = (note: StaveNote): RestInkBounds[] => note.noteHeads.flatMap(head => {
    // Use the same public placement that StaveNote.draw applies to each head.
    head.setX(note.getNoteHeadBeginX())
    const metrics = head.getTextMetrics()
    const bounds = { x: head.getAbsoluteX() + head.getXShift() - metrics.actualBoundingBoxLeft,
      y: stave.getYForNote(head.getLine()) + head.getYShift() - metrics.actualBoundingBoxAscent,
      width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent }
    return valid(bounds) ? [bounds] : []
  })
  const heads = notes.filter(({ note }) => !note.isRest()).map(({ note, voiceId }) => ({ voiceId, bounds: ink(note) }))
  const spacing = stave.getSpacingBetweenLines(), padding = spacing / 2
  let moved = 0
  for (const { note, voiceId } of notes) {
    if (!note.isRest()) continue
    const obstacles = heads.filter(head => head.voiceId !== voiceId).flatMap(head => head.bounds)
    const direction = note.getStemDirection() > 0 ? -1 : 1
    for (let pass = 0; pass < 3; pass++) {
      const bounds = ink(note)[0]
      if (!bounds) break
      const shift = resolveRestHeadShift(bounds, obstacles, direction, padding)
      if (Math.abs(shift) < .001) break
      note.setKeyLine(0, note.getKeyLine(0) - shift / spacing)
      if (pass === 0) moved++
    }
  }
  return moved
}
