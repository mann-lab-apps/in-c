import {
  TICKS_PER_QUARTER,
  durationToTicks,
  sortVoiceEvents,
  voiceEventDurationTicks,
  type Measure,
  type Tick,
  type Voice
} from '../../../score-core'

export interface BeamGroup {
  eventIds: string[]
}

export function createBeamGroups(
  measure: Measure,
  voice: Voice
): BeamGroup[] {
  const groupTicks = beatGroupDurationTicks(measure)
  const groups: BeamGroup[] = []
  let candidates: string[] = []
  let candidateEndTick: Tick | undefined
  let beatGroupIndex = -1

  const flush = () => {
    if (candidates.length >= 2) {
      groups.push({
        eventIds: candidates
      })
    }

    candidates = []
    candidateEndTick = undefined
  }

  for (const event of sortVoiceEvents(voice.events)) {
    const startTick = event.position.tick
    const endTick = startTick + voiceEventDurationTicks(event, measure)
    const currentBeatGroup = Math.floor(startTick / groupTicks)
    const groupEndTick = (currentBeatGroup + 1) * groupTicks
    const isBeamable =
      event.type === 'note' &&
      durationToTicks(event.duration) <= TICKS_PER_QUARTER / 2 &&
      endTick <= groupEndTick
    const isContinuous =
      candidateEndTick === undefined || candidateEndTick === startTick

    if (
      !isBeamable ||
      currentBeatGroup !== beatGroupIndex ||
      !isContinuous
    ) {
      flush()
    }

    if (!isBeamable) {
      beatGroupIndex = currentBeatGroup
      continue
    }

    beatGroupIndex = currentBeatGroup
    candidates.push(event.id)
    candidateEndTick = endTick
  }

  flush()
  return groups
}

export function beatGroupDurationTicks(measure: Measure): Tick {
  const { beats, beatType } = measure.timeSignature

  if (beatType === 8 && beats > 3 && beats % 3 === 0) {
    return (TICKS_PER_QUARTER * 3) / 2
  }

  return TICKS_PER_QUARTER * (4 / beatType)
}
