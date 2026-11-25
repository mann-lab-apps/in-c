import type { Hairpin, Measure, Score, VoiceEvent } from './types'
import { durationToTicks, measureDurationTicks, voiceEventDurationTicks } from './timing'

// Internal editing rules, shared by core rhythm and renderer range adapters.
// This module is deliberately not re-exported by the public core barrel.
export function collectSpanEndpointIds(score: Score): ReadonlySet<string> {
  return new Set([...(score.hairpins ?? []), ...(score.slurs ?? []), ...(score.octaveShifts ?? [])]
    .flatMap(span => span.endEventId === undefined ? [span.startEventId] : [span.startEventId, span.endEventId]))
}

export function isOctaveEndpoint(score: Score, eventId: string): boolean {
  return Boolean(score.octaveShifts?.some(span => span.startEventId === eventId || span.endEventId === eventId))
}

export function isRestBoundary(event: VoiceEvent, spanEndpointIds: ReadonlySet<string>): boolean {
  return event.type === 'rest' && Boolean(event.fermata || event.breathMark || spanEndpointIds.has(event.id))
}

export function inspectSpanEndpointChanges(score: Score, before: readonly VoiceEvent[], after: readonly VoiceEvent[]) {
  const afterIds = new Set(after.map(event => event.id))
  const afterNoteIds = new Set(after.filter(event => event.type === 'note').map(event => event.id))
  const removedIds = new Set(before.filter(event => !afterIds.has(event.id)).map(event => event.id))
  const invalidatedNoteIds = new Set(before.filter(event => event.type === 'note' && !afterNoteIds.has(event.id)).map(event => event.id))
  const slurs = score.slurs?.filter(span => !invalidatedNoteIds.has(span.startEventId) && !invalidatedNoteIds.has(span.endEventId))
  return {
    blockedByOctaveEndpoint: Boolean(score.octaveShifts?.some(span => invalidatedNoteIds.has(span.startEventId) || invalidatedNoteIds.has(span.endEventId))),
    blockedBySpanAnchor: Boolean(score.hairpins?.some(span => removedIds.has(span.startEventId) || (span.endEventId !== undefined && removedIds.has(span.endEventId)))),
    slursChanged: slurs?.length !== score.slurs?.length,
    slurs
  }
}

// A positive MusicXML wedge with simultaneous anchors in different voices
// can only reach the ending note through its release. Limit the inference to
// untied notes ending at the barline, where there is no competing note onset.
export function hairpinEndsAtMeasureBoundary(measure: Measure, start: VoiceEvent, end: VoiceEvent): boolean {
  return end.type === 'note' && !end.ties?.start && !end.ties?.stop &&
    start.position.tick === end.position.tick &&
    end.position.tick + durationToTicks(end.duration) === measureDurationTicks(measure)
}

type HairpinEventLocation = { measure: Measure; voiceId: string; event: VoiceEvent }

export function hairpinEndTick(
  endAnchor: Hairpin['endAnchor'],
  start: HairpinEventLocation,
  end: HairpinEventLocation
): number {
  const { event, measure } = end
  if (endAnchor === 'release') return event.position.tick + voiceEventDurationTicks(event, measure)
  if (endAnchor === undefined && start.measure === measure && start.voiceId !== end.voiceId &&
    hairpinEndsAtMeasureBoundary(measure, start.event, event)) return measureDurationTicks(measure)
  return event.position.tick
}
