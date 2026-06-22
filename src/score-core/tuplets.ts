import { durationToTicks, sortVoiceEvents } from './timing'
import type { TupletGroup, Voice } from './types'

export function validateVoiceTuplets(voice: Voice): string[] {
  const events = sortVoiceEvents(voice.events)
  const eventsById = new Map(events.map((event) => [event.id, event]))
  const claimedEventIds = new Set<string>()
  const errors: string[] = []

  for (const group of voice.tuplets ?? []) {
    if (
      !Number.isInteger(group.actualNotes) ||
      !Number.isInteger(group.normalNotes) ||
      group.actualNotes <= 0 ||
      group.normalNotes <= 0 ||
      group.eventIds.length !== group.actualNotes
    ) {
      errors.push(`Invalid tuplet ratio or member count: ${group.id}`)
      continue
    }

    const members = group.eventIds.map((eventId) => eventsById.get(eventId))

    if (members.some((event) => !event)) {
      errors.push(`Tuplet member not found: ${group.id}`)
      continue
    }

    let expectedTick = members[0]!.position.tick

    for (const event of members) {
      const ratio = event!.duration.tuplet

      if (
        claimedEventIds.has(event!.id) ||
        event!.position.tick !== expectedTick ||
        ratio?.actualNotes !== group.actualNotes ||
        ratio.normalNotes !== group.normalNotes
      ) {
        errors.push(`Invalid tuplet member sequence: ${group.id}`)
        break
      }

      claimedEventIds.add(event!.id)
      expectedTick += durationToTicks(event!.duration)
    }
  }

  for (const event of events) {
    if (event.duration.tuplet && !claimedEventIds.has(event.id)) {
      errors.push(`Tuplet duration has no complete group: ${event.id}`)
    }
  }

  return errors
}

export function findTupletGroup(
  voice: Voice,
  eventId: string
): TupletGroup | undefined {
  return voice.tuplets?.find((group) => group.eventIds.includes(eventId))
}
