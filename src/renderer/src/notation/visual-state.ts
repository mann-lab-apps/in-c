export type NotationEventTone = 'default' | 'selected' | 'playback'

export function resolveNotationEventTone(
  eventId: string,
  selectedEventIds: Set<string>,
  selectedEventId?: string,
  playbackEventId?: string
): NotationEventTone {
  if (selectedEventIds.has(eventId) || eventId === selectedEventId) {
    return 'selected'
  }

  if (eventId === playbackEventId) {
    return 'playback'
  }

  return 'default'
}
