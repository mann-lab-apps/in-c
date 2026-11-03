import VexFlow, { Formatter, Fraction, GhostNote, Stave, type StaveNote, type TickContext, Voice } from 'vexflow'
import { measureDurationTicks, TICKS_PER_QUARTER, voiceEventDurationTicks, type Measure, type VoiceEvent } from '../../../score-core'
import { lyricDisplayText } from './lyric-text'
import type { TimedAnnotationAnchor } from './timed-annotation-position'

export interface SharedStaffLayout {
  stave: Stave
  voices: { events: VoiceEvent[]; notes: StaveNote[] }[]
  measure: Measure
  lyricWidths?: ReadonlyMap<string, number>
  harmonyWidths?: ReadonlyMap<number, number>
  timedAnnotationAnchors?: Map<number, TimedAnnotationAnchor>
}

interface LayoutOnset {
  staff: SharedStaffLayout
  tick: number
  note: StaveNote | GhostNote
  actual: boolean
}

function layoutVoice(meter: Measure['timeSignature'], notes: (StaveNote | GhostNote)[]): Voice {
  return new Voice({ numBeats: meter.beats, beatValue: meter.beatType })
    .setMode(Voice.Mode.SOFT).addTickables(notes)
}

function setRhythmTicks(note: StaveNote | GhostNote, duration: number): void {
  const wanted = new Fraction(duration * VexFlow.RESOLUTION, TICKS_PER_QUARTER * 4).simplify()
  const ratio = wanted.divide(note.getTicks()).simplify()
  note.applyTickMultiplier(ratio.numerator, ratio.denominator)
  // Keep exact rational tuplet onsets without growing denominator/LCM values
  // on each layout pass. Do not round to a visual triplet slot or float beat.
  note.getTicks().simplify()
  note.getTickMultiplier().simplify()
}

// These are layout voices over the actual notes, not a second score or playback
// timeline. Explicit model onsets own horizontal alignment. Ghosts reserve gaps;
// tuplets/dots/full-measure rests use the model duration after VexFlow has built
// beams and tuplets. No notehead-only post-draw translation is involved.
function rhythmicVoices(staff: SharedStaffLayout, meter: Measure['timeSignature'], onsets: LayoutOnset[]): Voice[] {
  return staff.voices.map(({ events, notes }) => {
    const tickables: (StaveNote | GhostNote)[] = []
    let end = 0
    events.forEach((event, index) => {
      if (event.position.tick > end) {
        const gap = new GhostNote('q')
        setRhythmTicks(gap, event.position.tick - end)
        gap.setStave(staff.stave)
        tickables.push(gap)
        onsets.push({ staff, tick: end, note: gap, actual: false })
      }
      const note = notes[index]
      const duration = voiceEventDurationTicks(event, staff.measure)
      setRhythmTicks(note, duration)
      note.setStave(staff.stave)
      tickables.push(note)
      onsets.push({ staff, tick: event.position.tick, note, actual: !(event.type === 'rest' && event.fullMeasure) })
      end = event.position.tick + duration
    })
    // VexFlow requires a common nominal meter even in SOFT mode. This layout
    // timebase does not replace each stave's printed/model time signature.
    return layoutVoice(meter, tickables)
  })
}

// Invisible formatter tickables reserve annotation-only times inside held notes.
// They are never score events, drawn voices, hit targets or playback events.
function annotationVoice(staff: SharedStaffLayout, meter: Measure['timeSignature'], onsets: LayoutOnset[]): Voice | undefined {
  const actual = new Set(onsets.filter(o => o.staff === staff && o.actual).map(o => o.tick))
  const duration = measureDurationTicks(staff.measure)
  const missing = [...(staff.harmonyWidths?.keys() ?? [])].filter(t =>
    Number.isInteger(t) && t >= 0 && t < duration && !actual.has(t))
  if (!missing.length) return undefined
  const boundaries = [...new Set([0, ...missing, duration])].sort((a, b) => a - b)
  const notes = boundaries.slice(0, -1).map((tick, index) => {
    const note = new GhostNote('q')
    setRhythmTicks(note, boundaries[index + 1] - tick)
    note.setStave(staff.stave)
    onsets.push({ staff, tick, note, actual: false })
    return note
  })
  return layoutVoice(meter, notes)
}

function sharedFormatter(staves: SharedStaffLayout[]) {
  const formatter = new Formatter()
  const onsets: LayoutOnset[] = []
  let hasAnnotationVoice = false
  // joinVoices shares modifiers only within a staff. format shares rhythmic
  // contexts across staves, as VexFlow's multi-staff formatting API intends.
  const voices = staves.flatMap(staff => {
    const meter = staves[0].measure.timeSignature
    const group = rhythmicVoices(staff, meter, onsets)
    const annotations = annotationVoice(staff, meter, onsets)
    if (annotations) { group.push(annotations); hasAnnotationVoice = true }
    formatter.joinVoices(group)
    return group
  })
  return { formatter, voices, onsets, hasAnnotationVoice }
}

function sharedConstraints(staves: SharedStaffLayout[]) {
  const { formatter, voices, onsets, hasAnnotationVoice } = sharedFormatter(staves)
  if (!voices.length) return undefined
  formatter.format(voices, 0)
  const ticks = formatter.getTickContexts()!
  // array is insertion order: a later staff may introduce an earlier onset.
  const contexts = ticks.list.map(tick => ticks.map[tick])
  const barLeft = Math.min(...staves.map(staff => staff.stave.getBoundingBox().getX()))
  const start = Math.max(...staves.map(staff => staff.stave.getNoteStartX()))
  const endInset = Math.max(...staves.map(staff => {
    const box = staff.stave.getBoundingBox()
    return box.getX() + box.getW() - staff.stave.getNoteEndX()
  })) + Stave.defaultPadding
  const lyrics = new Map<object, number>()
  const harmonies = new Map<object, { left: number; right: number }>()
  const ownPoints = new Map<SharedStaffLayout, Map<TickContext, TimedAnnotationAnchor>>()
  const globalPoints = new Map<TickContext, TimedAnnotationAnchor>()
  const ghostPoints = new Map<TickContext, TimedAnnotationAnchor>()
  const modelTicks = new Map<TickContext, number>(), contextsByTick = new Map<number, TickContext>()
  const mergePoint = (points: Map<TickContext, TimedAnnotationAnchor>, context: TickContext, point: TimedAnnotationAnchor) => {
    const old = points.get(context)
    points.set(context, { startX: Math.min(old?.startX ?? Infinity, point.startX), centerX: Math.min(old?.centerX ?? Infinity, point.centerX) })
  }
  for (const onset of onsets) {
    const { staff, note, tick } = onset, context = note.getTickContext()
    modelTicks.set(context, tick); contextsByTick.set(tick, context)
    const origin = staff.stave.getNoteStartX() + context.getX()
    if (onset.actual) {
      const head = note as StaveNote
      const point = { startX: head.getNoteHeadBeginX() - origin,
        centerX: (head.getNoteHeadBeginX() + head.getNoteHeadEndX()) / 2 - origin }
      const points = ownPoints.get(staff) ?? new Map<TickContext, TimedAnnotationAnchor>()
      mergePoint(points, context, point); ownPoints.set(staff, points); mergePoint(globalPoints, context, point)
    } else if (note instanceof GhostNote) {
      const x = note.getAbsoluteX() - origin
      ghostPoints.set(context, { startX: x, centerX: x })
    }
  }
  const relativePoint = (staff: SharedStaffLayout, context: TickContext): TimedAnnotationAnchor =>
    ownPoints.get(staff)?.get(context) ?? globalPoints.get(context) ?? ghostPoints.get(context)
      ?? { startX: Stave.defaultPadding, centerX: Stave.defaultPadding }
  for (const staff of staves) for (const voice of staff.voices) voice.events.forEach((event, index) => {
    const note = voice.notes[index], context = note.getTickContext()
    if (event.type === 'note') {
      const width = Math.max(0, ...(event.lyrics ?? []).map(lyric => staff.lyricWidths?.get(lyricDisplayText(lyric)) ?? 0))
      lyrics.set(context, Math.max(lyrics.get(context) ?? 0, width))
    }
  })
  for (const staff of staves) for (const [tick, width] of staff.harmonyWidths ?? []) {
    const context = contextsByTick.get(tick)
    if (!context) continue
    const center = relativePoint(staff, context).centerX
    const old = harmonies.get(context)
    harmonies.set(context, { left: Math.max(old?.left ?? 0, width / 2 - center),
      right: Math.max(old?.right ?? 0, width / 2 + center) })
  }
  const cells = contexts.map(context => {
    const metrics = context.getMetrics(), half = (lyrics.get(context) ?? 0) / 2
    const harmony = harmonies.get(context)
    return { context, noteLeft: metrics.totalLeftPx,
      left: Math.max(metrics.totalLeftPx, half ? half - 4 : 0, harmony?.left ?? 0),
      right: Math.max(metrics.notePx + metrics.totalRightPx, half ? half + 4 : 0, harmony?.right ?? 0),
      half, harmonyLeft: harmony?.left ?? 0 }
  })
  // Lyrics occupy a separate vertical lane. At the first onset their left
  // overhang can use the horizontal space below the clef; it must not reserve
  // the clef width twice. Actual note modifiers still clear every staff prefix.
  const positions: number[] = []
  for (const [index, cell] of cells.entries()) {
    positions.push(index === 0
      ? Math.max(start - barLeft + cell.noteLeft, cell.half ? cell.half - 4 + 2 : 0, cell.harmonyLeft + 2)
      : positions[index - 1] + cells[index - 1].right + cell.left + 8)
  }
  return { cells, positions, barLeft, endInset, hasAnnotationVoice, modelTicks, relativePoint,
    duration: Math.max(...staves.map(s => measureDurationTicks(s.measure)), ...modelTicks.values()),
    width: (positions.at(-1) ?? 0) + (cells.at(-1)?.right ?? 0) + endInset }
}

export function minimumSharedRhythmWidth(staves: SharedStaffLayout[]): number {
  return sharedConstraints(staves)?.width ?? 0
}

export function formatSharedRhythm(staves: SharedStaffLayout[]): void {
  if (!staves.length) return
  staves.forEach(staff => staff.timedAnnotationAnchors?.clear())
  const start = Math.max(...staves.map(staff => staff.stave.getNoteStartX()))
  staves.forEach(staff => staff.stave.setNoteStartX(start))
  const layout = sharedConstraints(staves)
  if (!layout) return
  const { cells, positions, barLeft, width } = layout
  const actualWidth = Math.min(...staves.map(staff => staff.stave.getBoundingBox().getW()))
  const extra = Math.max(0, actualWidth - width)
  const lastTick = cells.at(-1)?.context.getTickID() ?? 0
  cells.forEach((cell, index) => {
    const fraction = layout.hasAnnotationVoice && layout.duration > 0
      ? (layout.modelTicks.get(cell.context) ?? 0) / layout.duration
      : lastTick ? cell.context.getTickID() / lastTick : .5
    // Move the shared tick context before drawing: all noteheads, modifiers,
    // beams, ties, hit paths and playback anchors consume this same placement.
    cell.context.setX(barLeft + positions[index] + extra * fraction - start)
  })
  if (layout.hasAnnotationVoice) for (const staff of staves) for (const cell of cells) {
    const tick = layout.modelTicks.get(cell.context)
    if (tick === undefined) continue
    const point = layout.relativePoint(staff, cell.context), x = start + cell.context.getX()
    staff.timedAnnotationAnchors?.set(tick, { startX: x + point.startX, centerX: x + point.centerX })
  }
}
