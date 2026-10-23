import { measureDurationTicks } from './timing'
import type { Score, Staff } from './types'

export interface RepeatMeasureVisit { measureIndex: number; pass: number }

export class RepeatExpansionError extends Error {
  constructor() { super('Repeat expansion limit exceeded; reduce nested repeat counts or depth.') }
}

export function findVoltaEndIndex(measures: Staff['measures'], startIndex: number): number | undefined {
  const start = measures[startIndex]?.volta
  if (!start?.start) return undefined
  for (let index = startIndex; index < measures.length; index++) {
    const mark = measures[index]!.volta
    if (index > startIndex && mark?.start) return undefined
    if (mark?.end) return mark.number === start.number ? index : undefined
  }
  return undefined
}

export function projectRepeatMarksToStaff(source: Staff, target: Staff): Staff {
  if (source.measures.length !== target.measures.length) return target
  const indices = new Map(source.measures.map((measure, index) => [measure.id, index]))
  return { ...target, measures: target.measures.map((measure, index) => {
    const original = source.measures[index]!
    const displayIndex = original.volta?.displayEndMeasureId ? indices.get(original.volta.displayEndMeasureId) : undefined
    const volta = original.volta && displayIndex !== undefined
      ? { ...original.volta, displayEndMeasureId: target.measures[displayIndex]!.id }
      : original.volta
    return { ...measure, repeat: original.repeat, volta }
  }) }
}

export function createRepeatMeasureTraversal(measures: Staff['measures']): RepeatMeasureVisit[] {
  const endings = new Map<number, 1 | 2>()
  let activeEnding: 1 | 2 | undefined
  measures.forEach((measure, index) => {
    if (measure.volta?.start) {
      activeEnding = measures.slice(index + 1).some(next => next.volta?.number === measure.volta!.number && next.volta.end)
        ? measure.volta.number : undefined
    }
    const number = measure.volta?.number ?? activeEnding
    if (number) endings.set(index, number)
    if (measure.volta?.end) activeEnding = undefined
  })
  const visits: RepeatMeasureVisit[] = []
  const starts: number[] = []
  const regions = new Map<number, Array<{ end: number; count: number }>>()
  let implicitStart = 0
  measures.forEach((measure, index) => {
    if (measure.repeat?.start) starts.push(index)
    if (!measure.repeat?.end) return
    const start = starts.pop() ?? implicitStart
    const entries = regions.get(start) ?? []
    entries.unshift({ end: index, count: Math.max(2, measure.repeat.times ?? 2) })
    regions.set(start, entries)
    implicitStart = index + 1
  })
  const repeatEnds = new Set([...regions.values()].flatMap(entries => entries.map(entry => entry.end)))
  const endingOwners = new Map<number, { repeatEnd: number; endingEnd: number }>()
  let firstEndingOwner: number | undefined
  // A bracket belongs to its enclosing repeat, not necessarily the innermost loop.
  for (let index = 0; index < measures.length; index++) {
    const end = findVoltaEndIndex(measures, index)
    if (end === undefined) continue
    const number = measures[index]!.volta!.number
    const owner = number === 1 ? (repeatEnds.has(end) ? end : undefined) : firstEndingOwner
    if (number === 1) firstEndingOwner = owner
    if (owner !== undefined) for (let covered = index; covered <= end; covered++) {
      endingOwners.set(covered, { repeatEnd: owner, endingEnd: end })
    }
    index = end
  }
  const activePasses = new Map<number, number>()
  const completedPasses = new Map<number, number>()
  const endingPass = (index: number, fallback: number) => {
    const owner = endingOwners.get(index)
    return owner ? activePasses.get(owner.repeatEnd) ?? completedPasses.get(owner.repeatEnd) ?? fallback : fallback
  }
  const skipEnding = (index: number, pass: number) =>
    endings.get(index) === 1 && pass !== 1 || endings.get(index) === 2 && pass === 1
  const append = (measureIndex: number, repeatPass: number) => {
    repeatPass = endingPass(measureIndex, repeatPass)
    if (skipEnding(measureIndex, repeatPass)) return
    if (visits.length >= 100_000) throw new RepeatExpansionError()
    visits.push({ measureIndex, pass: repeatPass })
  }
  let traversalSteps = 0
  const expand = (start: number, end: number, pass: number, enclosingEnd?: number, depth = 0) => {
    if (depth > 32) throw new RepeatExpansionError()
    let followingPass: number | undefined
    for (let index = start; index <= end; index++) {
      // Skipped endings consume work too, even when they append no playback visit.
      if (++traversalSteps > 1_000_000) throw new RepeatExpansionError()
      const region = regions.get(index)?.find(region => region.end <= end && region.end !== enclosingEnd)
      if (region) {
        const owner = endingOwners.get(index)
        if (owner && owner.repeatEnd !== region.end && owner.endingEnd >= region.end && skipEnding(index, endingPass(index, pass))) {
          index = region.end
          continue
        }
        for (let repeatedPass = 1; repeatedPass <= region.count; repeatedPass++) {
          activePasses.set(region.end, repeatedPass)
          expand(index, region.end, repeatedPass, region.end, depth + 1)
        }
        activePasses.delete(region.end)
        completedPasses.set(region.end, region.count)
        followingPass = region.count
        index = region.end
      } else {
        // Keep the completed pass even when editing inserts a gap before ending 2.
        append(index, endings.get(index) === 2 ? followingPass ?? pass : pass)
      }
    }
  }
  expand(0, measures.length - 1, 1)
  return visits
}

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
