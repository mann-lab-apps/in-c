import type { VoiceAddress } from '../../../score-core'

export type NotationEventTone = 'default' | 'selected' | 'playback'
export type SameStaffVoiceLane = 'neutral' | 'upper' | 'upper-secondary' | 'lower' | 'lower-secondary'

export interface SameStaffVoicePresentation {
  lane: SameStaffVoiceLane
  restYOffset: number
  stemDirection?: 1 | -1
}

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

export function resolveSameStaffVoicePresentation(
  voiceId: string,
  activeVoiceCount: number
): SameStaffVoicePresentation {
  if (activeVoiceCount <= 1) {
    return {
      lane: 'neutral',
      restYOffset: 0
    }
  }

  const voiceNumber = parseVoiceNumber(voiceId)

  switch (voiceNumber) {
    case 2:
      return {
        lane: 'lower',
        restYOffset: 10,
        stemDirection: -1
      }
    case 3:
      return {
        lane: 'upper-secondary',
        restYOffset: -18,
        stemDirection: 1
      }
    case 4:
      return {
        lane: 'lower-secondary',
        restYOffset: 18,
        stemDirection: -1
      }
    case 1:
    default:
      return {
        lane: 'upper',
        restYOffset: -10,
        stemDirection: 1
      }
  }
}

function parseVoiceNumber(voiceId: string): number {
  const match = voiceId.match(/(\d+)$/)

  return match ? Number(match[1]) : 1
}
