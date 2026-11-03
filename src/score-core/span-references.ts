import type { Score, VoiceEvent } from './types'

// Internal editing rules, shared by core rhythm and renderer range adapters.
// This module is deliberately not re-exported by the public core barrel.
export function collectSpanEndpointIds(score: Score): ReadonlySet<string> {
  return new Set([...(score.hairpins ?? []), ...(score.slurs ?? []), ...(score.octaveShifts ?? [])]
    .flatMap(span => [span.startEventId, span.endEventId]))
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
    blockedBySpanAnchor: Boolean(score.hairpins?.some(span => removedIds.has(span.startEventId) || removedIds.has(span.endEventId))),
    slursChanged: slurs?.length !== score.slurs?.length,
    slurs
  }
}
