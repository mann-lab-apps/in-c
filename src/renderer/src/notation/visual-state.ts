import type { VoiceAddress } from '../../../score-core'

export type NotationEventTone = 'default' | 'selected' | 'playback'

export function resolveNotationEventTone(
  eventId: string,
  selectedEventIds: Set<string>,
  selectedEventId?: string,
  isPlaybackEvent = false,
  eventAddress?: VoiceAddress,
  selectedEventAddress?: VoiceAddress
): NotationEventTone {
  const matchesSelectedEventId =
    selectedEventIds.has(eventId) || eventId === selectedEventId
  const matchesSelectedAddress =
    !selectedEventAddress ||
    !eventAddress ||
    sameVoiceAddress(eventAddress, selectedEventAddress)

  if (matchesSelectedEventId && matchesSelectedAddress) {
    return 'selected'
  }

  if (isPlaybackEvent) {
    return 'playback'
  }

  return 'default'
}

function sameVoiceAddress(left: VoiceAddress, right: VoiceAddress): boolean {
  return (
    left.partId === right.partId &&
    left.staffId === right.staffId &&
    left.measureId === right.measureId &&
    left.voiceId === right.voiceId
  )
}

export function sameVoiceLane(left: VoiceAddress, right: VoiceAddress): boolean {
  return (
    left.partId === right.partId &&
    left.staffId === right.staffId &&
    left.voiceId === right.voiceId
  )
}
