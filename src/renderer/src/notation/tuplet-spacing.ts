import {
  durationToTicks,
  sortVoiceEvents,
  type TupletGroup,
  type VoiceEvent
} from '../../../score-core'

export function resolveMixedTupletOnsetShifts(
  events: VoiceEvent[],
  tuplets: TupletGroup[] | undefined,
  eventXs: ReadonlyMap<string, number>
): Map<string, number> {
  const shifts = new Map<string, number>()

  if (!tuplets?.length) {
    return shifts
  }

  const sortedEvents = sortVoiceEvents(events)
  const eventsById = new Map(sortedEvents.map((event) => [event.id, event]))

  tuplets.forEach((group) => {
    const members = group.eventIds
      .map((eventId) => eventsById.get(eventId))
      .filter((event): event is VoiceEvent => Boolean(event))

    if (members.length < 2 || members.length !== group.eventIds.length) {
      return
    }

    const notationTicks = members.map((event) =>
      durationToTicks({
        ...event.duration,
        tuplet: undefined
      })
    )
    const baseTicks = Math.min(...notationTicks)

    if (baseTicks <= 0 || new Set(notationTicks).size <= 1) {
      return
    }

    const groupEventIds = new Set(group.eventIds)
    const groupStartTick = members[0].position.tick
    const groupDurationTicks = members.reduce(
      (sum, event) => sum + durationToTicks(event.duration),
      0
    )
    const groupEndTick = groupStartTick + groupDurationTicks
    const nextEvent = sortedEvents.find(
      (event) =>
        !groupEventIds.has(event.id) && event.position.tick === groupEndTick
    )

    if (!nextEvent) {
      return
    }

    const firstX = eventXs.get(members[0].id)
    const groupEndX = eventXs.get(nextEvent.id)

    if (
      firstX === undefined ||
      groupEndX === undefined ||
      groupEndX <= firstX
    ) {
      return
    }

    const slotWidth = (groupEndX - firstX) / group.actualNotes
    let elapsedBaseTicks = 0

    members.forEach((event, index) => {
      const currentX = eventXs.get(event.id)

      if (currentX !== undefined) {
        const expectedX =
          firstX + (elapsedBaseTicks / baseTicks) * slotWidth
        const shift = expectedX - currentX

        if (Math.abs(shift) > 0.5) {
          shifts.set(event.id, (shifts.get(event.id) ?? 0) + shift)
        }
      }

      elapsedBaseTicks += notationTicks[index]
    })
  })

  return shifts
}
