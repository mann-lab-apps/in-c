import { measureDurationTicks } from './timing'
import type { Measure, NavigationMark, Score, Staff, VoltaMark } from './types'

// The first staff with repeat barlines owns the repeat sequence. A navigation
// mark on any aligned staff also needs a common measure/tempo reference.
export function scoreRepeatSource(score: Pick<Score, 'parts'>): Staff | undefined {
  const staves = score.parts.flatMap(part => part.staves)
  const source = staves.find(staff => staff.measures.some(measure =>
    measure.repeat?.start || measure.repeat?.end || measure.volta
  )) ?? staves.find(staff => staff.measures.some(measure => measure.navigation?.length))
  if (!source) return undefined
  const durations = source.measures.map(measureDurationTicks)
  return staves.every(staff =>
    staff.measures.length === durations.length &&
    staff.measures.every((measure, index) => measureDurationTicks(measure) === durations[index])
  ) ? source : undefined
}

export function collectMeasureNavigation(measures: readonly Measure[]): NavigationMark[] {
  const unique = new Map<string, NavigationMark>()
  for (const measure of measures) {
    for (const mark of measure.navigation ?? []) {
      const label = 'label' in mark ? mark.label : undefined
      const passes = 'passes' in mark && mark.passes
        ? [...new Set(mark.passes)].sort((a, b) => a - b)
        : undefined
      const normalized = passes ? { ...mark, passes } : mark
      const key = JSON.stringify([mark.type, label, passes])
      const visible = ('symbol' in mark && mark.symbol) || ('display' in mark && mark.display)
      if (!unique.has(key) || visible) unique.set(key, normalized)
    }
  }
  return [...unique.keys()].sort().map(key => unique.get(key)!)
}

// Only explicit settings override the default. Contradictory settings cannot
// be reduced to a single flag for the common repeat end.
export function collectNavigationRepeatSettings(
  staves: readonly Staff[], measures: readonly Measure[]
): Map<number, boolean> | undefined {
  const settings = new Map<number, boolean>()
  for (const staff of staves) {
    for (const [index, measure] of staff.measures.entries()) {
      const flag = measure.repeat?.end ? measure.repeat.afterJump : undefined
      if (flag === undefined) continue
      const existing = settings.get(index)
      if (!measures[index]?.repeat?.end || (existing !== undefined && existing !== flag)) {
        return undefined
      }
      settings.set(index, flag)
    }
  }
  return settings
}

export function voltaNumberText(volta: VoltaMark): string {
  return volta.passes ? volta.passes.join(',') : String(volta.number)
}

export function sameVoltaPasses(left?: VoltaMark, right?: VoltaMark): boolean {
  if (!left || !right) return false
  if (!left.passes || !right.passes) return left.number === right.number
  const leftPasses = new Set(left.passes)
  const rightPasses = new Set(right.passes)
  return leftPasses.size === rightPasses.size && [...leftPasses].every(pass => rightPasses.has(pass))
}

/** Retain singleton behavior for a start whose matching endpoint is absent. */
export function resolveMeasureVoltas(measures: readonly Measure[]): Map<string, VoltaMark> {
  const result = new Map<string, VoltaMark>()
  let active: VoltaMark | undefined
  for (const [index, measure] of measures.entries()) {
    const volta = measure.volta
    if (volta?.start) {
      active = undefined
      for (let end = index + 1; end < measures.length; end += 1) {
        const candidate = measures[end].volta
        if (candidate?.end && sameVoltaPasses(volta, candidate)) {
          active = volta
          break
        }
      }
    }
    const covering = volta ?? active
    if (covering) result.set(measure.id, covering)
    if (volta?.end) active = undefined
  }
  return result
}

export function locateCoveredVolta(
  measures: readonly Measure[], index: number, mark: VoltaMark, covered: ReadonlyMap<string, VoltaMark>
): [number, number] {
  let start = index
  let end = index
  // In an ending's interior the resolved mark comes from its start. At the
  // terminating measure it comes from that endpoint, which has its own object.
  while (start > 0 && !measures[start].volta?.start) {
    const previous = measures[start - 1]
    const previousMark = covered.get(previous.id)
    if (previous.volta?.end || !previousMark?.start || !sameVoltaPasses(previousMark, mark)) break
    start -= 1
  }
  if (!measures[start].volta?.start) return [index, index]

  while (end + 1 < measures.length && !measures[end].volta?.end) {
    const next = measures[end + 1]
    if (next.volta?.start || !sameVoltaPasses(covered.get(next.id), mark)) break
    end += 1
  }
  return [start, end]
}

export function findSimpleRepeatForVolta(
  measures: readonly Measure[], first: number, last: number
): { end: number; count: number } | undefined {
  let depth = 0, start = 0
  let nested = false, hasSeenRepeatEnd = false
  let preceding: { end: number; count: number } | undefined

  for (const [index, bar] of measures.entries()) {
    const repeat = bar.repeat
    if (repeat?.start) {
      if (!depth) {
        if (index > last) return preceding
        start = index
        nested = false
      } else {
        nested = true
      }
      depth += 1
    }
    if (!repeat?.end) continue
    if (!depth && hasSeenRepeatEnd) {
      // Only the first implicit repeat is known to begin with pass 1.
      if (index >= first) return undefined
      preceding = undefined
      continue
    }
    hasSeenRepeatEnd = true
    if (depth) depth -= 1
    if (depth) continue
    const current = { end: index, count: Math.max(2, repeat.times ?? 2) }
    if (index < first) {
      preceding = nested ? undefined : current
    } else {
      return !nested && start <= first && index >= last ? current : undefined
    }
  }
  return depth ? undefined : preceding
}

interface EndingRange {
  start: number
  end: number
}

interface AlternativeEndingRepeat {
  firstEnding: number
  end: number
  endingsByPass: EndingRange[]
  legacySecondMarkers: Measure[]
}

type EndingBranch = EndingRange & { mark: VoltaMark }

export function inspectAlternativeEndingRepeats(
  measures: readonly Measure[], knownCoverage?: ReadonlyMap<string, VoltaMark>
): { groups: Map<number, AlternativeEndingRepeat>; unresolvedEnds: Set<number> } {
  const groups = new Map<number, AlternativeEndingRepeat>()
  const unresolvedEnds = new Set<number>()
  if (measures.filter(measure => measure.repeat?.end && measure.volta?.end).length < 2) {
    return { groups, unresolvedEnds }
  }

  const covered = knownCoverage ?? resolveMeasureVoltas(measures)
  let depth = 0
  for (let index = 0; index < measures.length; index += 1) {
    const { repeat } = measures[index]
    if (repeat?.start) {
      if (!depth && !repeat.end && !covered.has(measures[index].id)) {
        const branches = readEndingBranches(measures, covered, index)
        const returns = branches.filter(({ end }) => measures[end].repeat?.end)
        if (returns.length >= 2) {
          const group = resolveEndingPasses(measures, branches, returns)
          if (group) {
            groups.set(index, group)
            index = group.end
            continue
          }
          unresolvedEnds.add(returns.at(-1)!.end)
        }
      }
      depth += 1
    }
    if (repeat?.end && depth) depth -= 1
  }
  return { groups, unresolvedEnds }
}

// Require contiguous, closed brackets and no repeat starts within the branches.
function readEndingBranches(
  measures: readonly Measure[], covered: ReadonlyMap<string, VoltaMark>, start: number
): EndingBranch[] {
  let firstEnding = start + 1
  while (firstEnding < measures.length && !covered.has(measures[firstEnding].id)) {
    const { repeat } = measures[firstEnding]
    if (repeat?.start || repeat?.end) return []
    firstEnding += 1
  }

  const branches: EndingBranch[] = []
  for (let index = firstEnding; index < measures.length;) {
    const mark = measures[index].volta
    if (!mark?.start) break
    const [, end] = locateCoveredVolta(measures, index, mark, covered)
    const closing = measures[end]
    if (!closing.volta?.end || !sameVoltaPasses(mark, closing.volta)) break
    let cursor = index
    for (; cursor <= end; cursor += 1) {
      const bar = measures[cursor]
      if (bar.repeat?.start || (cursor !== end && (bar.repeat?.end || (cursor !== index && bar.volta)))) break
    }
    if (cursor <= end) break
    branches.push({ start: index, end, mark })
    if (!closing.repeat?.end) break
    index = end + 1
  }
  return branches
}

// The final ending closes the set of passes without another repeat back.
function resolveEndingPasses(
  measures: readonly Measure[], branches: EndingBranch[], returns: EndingBranch[]
): AlternativeEndingRepeat | undefined {
  if (branches.length !== returns.length + 1) return undefined
  const final = branches.at(-1)!
  const following = measures[final.end + 1]
  if (following?.volta && !following.repeat?.start) return undefined

  const endingsByPass: EndingRange[] = []
  const legacySecondMarkers: Measure[] = []
  let totalPasses = 1
  for (const { start, end, mark } of branches) {
    const passes = new Set(mark.passes ?? [mark.number])
    const repeat = measures[end].repeat
    if (repeat?.end) {
      const count = repeat.times ?? 2
      if (repeat.afterJump !== undefined || !Number.isSafeInteger(count) ||
          count < 2 || totalPasses + count - 1 > 100 || passes.size !== count - 1) return undefined
      totalPasses += count - 1
    } else if (passes.size !== 1 || !passes.has(totalPasses)) {
      return undefined
    }

    const range = { start, end }
    for (const pass of passes) {
      if (!Number.isSafeInteger(pass) || pass < 1 || pass > 100 || endingsByPass[pass - 1]) return undefined
      endingsByPass[pass - 1] = range
    }
    if (mark.number === 2) {
      legacySecondMarkers.push(measures[start])
      if (start !== end) legacySecondMarkers.push(measures[end])
    }
  }
  if (endingsByPass.length !== totalPasses ||
      Array.from({ length: totalPasses }, (_, pass) => pass).some(pass => !endingsByPass[pass])) return undefined
  return { firstEnding: branches[0].start, end: final.end, endingsByPass, legacySecondMarkers }
}
