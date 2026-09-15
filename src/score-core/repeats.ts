import { measureDurationTicks } from './timing'
import type { Score, Staff } from './types'

// Aligned staves share the first marked staff's repeat/volta sequence.
export function scoreRepeatSource(score: Score): Staff | undefined {
  const staves = score.parts.flatMap(part => part.staves)
  const source = staves.find(staff => staff.measures.some(measure =>
    measure.repeat?.start || measure.repeat?.end || measure.volta
  ))
  if (!source) return undefined
  const durations = source.measures.map(measureDurationTicks)
  return staves.every(staff =>
    staff.measures.length === durations.length &&
    staff.measures.every((measure, index) => measureDurationTicks(measure) === durations[index])
  ) ? source : undefined
}
