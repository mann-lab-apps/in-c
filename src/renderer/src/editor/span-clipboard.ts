import { measureDurationTicks, isSpanSegmentAddressValid, type Hairpin, type Score, type ScoreCommand, type SpanEngraving } from '../../../score-core'
import { locateEvent, type EditorSelection } from './editor-state'
import { findSpan, type SpanReference } from './span-editing'

type SpanSegmentEngraving = NonNullable<SpanEngraving['segments']>[number]

export interface SpanClipboard {
  kind: SpanReference['kind']
  hairpinType?: Hairpin['type']
  durationTicks: number
  engraving?: Omit<SpanEngraving, 'segments'>
  segments: { startMeasureOffset: number; endMeasureOffset: number; geometry: SpanSegmentEngraving['geometry'] }[]
  excludedSegmentCount: number
}

function staffTimeline(score: Score, eventId: string) {
  const location = locateEvent(score, eventId)
  if (!location) return undefined
  const staff = score.parts.find(part => part.id === location.address.partId)!.staves.find(staff => staff.id === location.address.staffId)!
  let tick = 0
  const starts = staff.measures.map(measure => {
    const start = tick
    tick += measureDurationTicks(measure)
    return start
  })
  const measureIndex = staff.measures.findIndex(measure => measure.id === location.measure.id)
  return { location, staff, starts, measureIndex, tick: starts[measureIndex] + location.event.position.tick }
}

export function buildSpanClipboard(score: Score, reference: SpanReference): SpanClipboard | undefined {
  const span = findSpan(score, reference)
  if (!span) return undefined
  const start = staffTimeline(score, span.startEventId), end = staffTimeline(score, span.endEventId)
  if (!start || !end || start.location.address.partId !== end.location.address.partId ||
    start.location.address.staffId !== end.location.address.staffId || start.location.address.voiceId !== end.location.address.voiceId ||
    start.tick >= end.tick || (reference.kind === 'slur' && (start.location.event.type !== 'note' || end.location.event.type !== 'note'))) return undefined
  const { segments = [], ...engraving } = span.engraving ?? {}
  const copiedSegments: SpanClipboard['segments'] = []
  for (const segment of segments) {
    const first = start.staff.measures.findIndex(measure => measure.id === segment.startMeasureId)
    const last = start.staff.measures.findIndex(measure => measure.id === segment.endMeasureId)
    if (!isSpanSegmentAddressValid(score, span, segment) || first < start.measureIndex || last > end.measureIndex) continue
    copiedSegments.push({ startMeasureOffset: first - start.measureIndex, endMeasureOffset: last - start.measureIndex, geometry: segment.geometry })
  }
  return structuredClone({ kind: reference.kind, hairpinType: 'type' in span ? span.type : undefined,
    durationTicks: end.tick - start.tick, engraving: Object.keys(engraving).length ? engraving : undefined,
    segments: copiedSegments, excludedSegmentCount: segments.length - copiedSegments.length })
}

export function buildSpanPaste(score: Score, selection: EditorSelection, clipboard: SpanClipboard, createId: () => string):
  { command: ScoreCommand; excludedSegmentCount: number } | undefined {
  if (selection.type !== 'event') return undefined
  const addressed = locateEvent(score, selection.eventId, selection.address)
  const start = addressed && staffTimeline(score, addressed.event.id)
  if (!start || (clipboard.kind === 'slur' && start.location.event.type !== 'note')) return undefined
  const targetTick = start.tick + clipboard.durationTicks
  const candidates = start.staff.measures.flatMap((measure, index) => measure.voices
    .filter(voice => voice.id === start.location.address.voiceId)
    .flatMap(voice => voice.events.filter(event => start.starts[index] + event.position.tick === targetTick &&
      (clipboard.kind === 'hairpin' || event.type === 'note')).map(event => ({ event, measureIndex: index }))))
  // A chord can have multiple notes at the same onset. Do not guess its endpoint.
  if (candidates.length !== 1) return undefined
  const end = candidates[0], id = createId()
  if ([...(score.slurs ?? []), ...(score.hairpins ?? [])].some(span => span.id === id)) return undefined
  const segments: SpanSegmentEngraving[] = []
  for (const segment of clipboard.segments) {
    const firstIndex = start.measureIndex + segment.startMeasureOffset, lastIndex = start.measureIndex + segment.endMeasureOffset
    if (firstIndex < start.measureIndex || lastIndex > end.measureIndex || lastIndex < firstIndex) continue
    segments.push({ partId: start.location.address.partId, staffId: start.staff.id,
      startMeasureId: start.staff.measures[firstIndex].id, endMeasureId: start.staff.measures[lastIndex].id,
      geometry: structuredClone(segment.geometry) })
  }
  const engraving = clipboard.engraving || segments.length
    ? { ...structuredClone(clipboard.engraving), ...(segments.length ? { segments } : {}) } : undefined
  const span = { id, startEventId: start.location.event.id, endEventId: end.event.id, ...(engraving ? { engraving } : {}) }
  const command: ScoreCommand = clipboard.kind === 'slur'
    ? { type: 'score-slurs.update', slurs: [...(score.slurs ?? []), span] }
    : { type: 'score-hairpins.update', hairpins: [...(score.hairpins ?? []), { ...span, type: clipboard.hairpinType! }] }
  return { command, excludedSegmentCount: clipboard.excludedSegmentCount + clipboard.segments.length - segments.length }
}
