import { TICKS_PER_QUARTER, type Hairpin, type HairpinTimeEnd, type Score, type ScoreCommand, type Slur, type SpanEngraving } from '../../../score-core'
import { hairpinEndTick } from '../../../score-core/span-references'
import { spanEngravingSchema } from '../../../project/schema'
import { hasManualSpanEngraving } from '../../../project/span-engraving'
import { locateEvent, locateMeasure } from './editor-state'

export interface SpanReference {
  kind: 'slur' | 'hairpin'
  id: string
}

export function findSpan(score: Score, reference: SpanReference) {
  return reference.kind === 'slur'
    ? score.slurs?.find(span => span.id === reference.id)
    : score.hairpins?.find(span => span.id === reference.id)
}

export function listSpans(score: Score, partId?: string): SpanReference[] {
  return [
    ...(score.slurs ?? []).map(span => ({ kind: 'slur' as const, id: span.id })),
    ...(score.hairpins ?? []).map(span => ({ kind: 'hairpin' as const, id: span.id }))
  ].filter(reference => !partId || locateEvent(score, findSpan(score, reference)!.startEventId)?.address.partId === partId)
}

export function spanEndpointOptions(score: Score, reference: SpanReference) {
  const span = findSpan(score, reference)
  const start = span && locateEvent(score, span.startEventId)
  const staff = score.parts.find(part => part.id === start?.address.partId)?.staves
    .find(candidate => candidate.id === start?.address.staffId)
  return (staff?.measures ?? []).flatMap((measure, measureIndex) =>
    measure.voices.flatMap((voice, voiceIndex) => voice.events
      .filter(event => reference.kind === 'hairpin' || event.type === 'note')
      .map(event => {
        const voiceNumber = Number(/^voice-(\d+)$/.exec(voice.id)?.[1] ?? voiceIndex + 1)
        return {
        id: event.id,
        measureIndex,
        tick: event.position.tick,
          measure,
          voiceId: voice.id,
          event,
        voiceNumber,
        label: `${measure.number}마디 · 성부 ${voiceNumber} · ${voice.events.indexOf(event) + 1}번째 · ${event.type === 'rest' ? '쉼표' : `${event.pitch.step}${event.pitch.alter === 1 ? '#' : event.pitch.alter === -1 ? 'b' : ''}${event.pitch.octave}`}`
      }})))
    .sort((a, b) => a.measureIndex - b.measureIndex || a.tick - b.tick)
}

type SpanEndpointPosition = { measureIndex: number; tick: number }

export function spanEndpointOrderIsValid(
  start: SpanEndpointPosition | undefined,
  end: SpanEndpointPosition | undefined
): boolean {
  return Boolean(start && end && !(start.measureIndex > end.measureIndex ||
    (start.measureIndex === end.measureIndex && start.tick >= end.tick)))
}

type EndpointOption = ReturnType<typeof spanEndpointOptions>[number]

export function selectedSpanEndTick(span: Hairpin | Slur, start: EndpointOption, end: EndpointOption): number {
  if (!('type' in span) || end.id !== span.endEventId ||
    (span.endAnchor === undefined && start.id !== span.startEventId)) return end.tick
  return hairpinEndTick(span.endAnchor, start, end)
}

export function spanEndpointsAreOrdered(span: Hairpin | Slur, start: EndpointOption, end: EndpointOption): boolean {
  return spanEndpointOrderIsValid(start, { ...end, tick: selectedSpanEndTick(span, start, end) })
}

export function describeHairpinTimeEnd(score: Score, end: HairpinTimeEnd): string {
  const measure = locateMeasure(score, end.measureId)?.measure
  const voiceNumber = /^voice-(\d+)$/.exec(end.voiceId)?.[1] ??
    ((measure?.voices.findIndex(voice => voice.id === end.voiceId) ?? -1) + 1)
  return `${measure?.number ?? '?'}마디 · 성부 ${voiceNumber} · 마디 시작 기준 ${end.tick / TICKS_PER_QUARTER}박`
}

export function buildSpanEndpointCommand(
  score: Score,
  reference: SpanReference,
  patch: Partial<{ startEventId: string; endEventId: string }>
): ScoreCommand {
  const span = findSpan(score, reference)
  if (!span) throw new Error('선택한 표기 객체가 없습니다.')
  if ('endTime' in span && span.endTime) throw new Error('가져온 헤어핀의 시간 끝점 연결은 변경할 수 없습니다.')
  const next = { ...span, ...patch }
  const candidates = spanEndpointOptions(score, reference)
  const start = candidates.find(event => event.id === next.startEventId)
  const end = candidates.find(event => event.id === next.endEventId)
  if (!start || !end) throw new Error('같은 파트·보표의 지원되는 끝점을 선택해 주세요.')
  if (!spanEndpointsAreOrdered(span, start, end)) {
    throw new Error('끝점은 시작점보다 뒤에 있어야 합니다.')
  }
  return reference.kind === 'slur'
    ? { type: 'score-slurs.update', slurs: score.slurs?.map(item => item.id === reference.id ? { ...item, ...patch } : item) }
    : { type: 'score-hairpins.update', hairpins: score.hairpins?.map(item => {
      if (item.id !== reference.id || item.endTime) return item
      const updated = { ...item, ...patch }
      if (item.endAnchor !== undefined && end.id !== item.endEventId) {
        if (end.event.type === 'note' && start.voiceId !== end.voiceId) updated.endAnchor = 'onset'
        else delete updated.endAnchor
      }
      return updated
    }) }
}

export function buildSpanDeleteCommand(score: Score, reference: SpanReference): ScoreCommand | undefined {
  if (!findSpan(score, reference)) return undefined
  if (reference.kind === 'slur') {
    const slurs = score.slurs?.filter(span => span.id !== reference.id)
    return { type: 'score-slurs.update', slurs: slurs?.length ? slurs : undefined }
  }
  const hairpins = score.hairpins?.filter(span => span.id !== reference.id)
  return { type: 'score-hairpins.update', hairpins: hairpins?.length ? hairpins : undefined }
}

export function buildSpanEngravingCommand(score: Score, reference: SpanReference, engraving?: SpanEngraving): ScoreCommand {
  if (!findSpan(score, reference)) throw new Error('선택한 표기 객체가 없습니다.')
  const parsed = engraving === undefined ? undefined : spanEngravingSchema.parse(engraving)
  const validated = hasManualSpanEngraving(parsed) ? parsed : undefined
  return reference.kind === 'slur'
    ? { type: 'score-slurs.update', slurs: score.slurs?.map(item => item.id === reference.id ? { ...item, engraving: validated } : item) }
    : { type: 'score-hairpins.update', hairpins: score.hairpins?.map(item => item.id === reference.id ? { ...item, engraving: validated } : item) }
}
