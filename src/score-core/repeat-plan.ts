import { TICKS_PER_QUARTER, measureDurationTicks } from './timing'
import { scoreRepeatSource } from './repeats'
import type { Score, Measure } from './types'

type StaffMeasures = Measure[]

export interface RepeatPlaybackPlanEntry {
  measureIndex: number
  outputBeat: number
  pass: number
}

export interface RepeatPlaybackPlan {
  entries: RepeatPlaybackPlanEntry[]
  totalBeats: number
}

export function createScoreRepeatPlaybackPlan(
  score: Score
): RepeatPlaybackPlan | undefined {
  const canonicalStaff = scoreRepeatSource(score)
  return canonicalStaff
    ? createRepeatPlaybackPlan(canonicalStaff.measures)
    : undefined
}

export function createRepeatPlaybackPlan(measures: StaffMeasures): RepeatPlaybackPlan {
  const voltaNumberByMeasureId = createMeasureVoltaNumberMap(measures)
  const entries: RepeatPlaybackPlanEntry[] = []
  let repeatStartIndex = 0
  let outputBeat = 0
  let repeatPass = 1

  const appendMeasure = (measureIndex: number, pass: number) => {
    const measure = measures[measureIndex]

    if (!measure) {
      return
    }

    if (
      shouldSkipVoltaMeasure(
        voltaNumberByMeasureId.get(measure.id),
        pass
      )
    ) {
      return
    }

    entries.push({
      measureIndex,
      outputBeat,
      pass
    })
    outputBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  for (let measureIndex = 0; measureIndex < measures.length; measureIndex += 1) {
    const measure = measures[measureIndex]

    if (measure.repeat?.start) {
      repeatStartIndex = measureIndex
      repeatPass = 1
    }

    appendMeasure(measureIndex, repeatPass)

    if (!measure.repeat?.end) {
      continue
    }

    const repeatCount = Math.max(2, measure.repeat.times ?? 2)

    for (let repeatIndex = 1; repeatIndex < repeatCount; repeatIndex += 1) {
      const repeatedPass = repeatIndex + 1

      for (
        let repeatedMeasureIndex = repeatStartIndex;
        repeatedMeasureIndex <= measureIndex;
        repeatedMeasureIndex += 1
      ) {
        appendMeasure(repeatedMeasureIndex, repeatedPass)
      }
    }

    repeatStartIndex = measureIndex + 1
    repeatPass = repeatCount
  }

  return {
    entries,
    totalBeats: outputBeat
  }
}

function shouldSkipVoltaMeasure(
  voltaNumber: 1 | 2 | undefined,
  repeatPass: number
): boolean {
  if (!voltaNumber) {
    return false
  }

  if (voltaNumber === 1) {
    return repeatPass !== 1
  }

  return repeatPass === 1
}

function createMeasureVoltaNumberMap(
  measures: StaffMeasures
): Map<string, 1 | 2> {
  const voltaNumbers = new Map<string, 1 | 2>()
  let activeVoltaNumber: 1 | 2 | undefined

  for (let index = 0; index < measures.length; index += 1) {
    const measure = measures[index]

    if (measure.volta?.start) {
      activeVoltaNumber = hasLaterVoltaEnd(measures, index, measure.volta.number)
        ? measure.volta.number
        : undefined
    }

    const voltaNumber = measure.volta?.number ?? activeVoltaNumber

    if (voltaNumber) {
      voltaNumbers.set(measure.id, voltaNumber)
    }

    if (measure.volta?.end) {
      activeVoltaNumber = undefined
    }
  }

  return voltaNumbers
}

function hasLaterVoltaEnd(
  measures: StaffMeasures,
  startIndex: number,
  number: 1 | 2
): boolean {
  for (let index = startIndex + 1; index < measures.length; index += 1) {
    if (measures[index].volta?.number === number && measures[index].volta?.end) {
      return true
    }
  }

  return false
}
