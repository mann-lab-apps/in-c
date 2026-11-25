import { TICKS_PER_QUARTER, measureDurationTicks } from './timing'
import { inspectAlternativeEndingRepeats, collectMeasureNavigation, collectNavigationRepeatSettings, resolveMeasureVoltas, scoreRepeatSource } from './repeats'
import type { Score, Measure, VoltaMark } from './types'

type StaffMeasures = Measure[]

export interface RepeatPlaybackPlanEntry {
  measureIndex: number
  outputBeat: number
  pass: number
  navigationJump?: true
}

export interface RepeatPlaybackPlan {
  entries: RepeatPlaybackPlanEntry[]
  totalBeats: number
  navigationIssue?: string
}

export function createScoreRepeatPlaybackPlan(
  score: Pick<Score, 'parts'>
): RepeatPlaybackPlan | undefined {
  const canonicalStaff = scoreRepeatSource(score)
  if (!canonicalStaff) return undefined
  const measures = canonicalStaff.measures
  return applyNavigation(score, measures, createRepeatPlaybackPlan(measures))
}

function applyNavigation(score: Pick<Score, 'parts'>, measures: StaffMeasures, plan: RepeatPlaybackPlan): RepeatPlaybackPlan {
  const staves = score.parts.flatMap(part => part.staves)
  const marks = measures.flatMap((_, measureIndex) =>
    collectMeasureNavigation(staves.map(staff => staff.measures[measureIndex]))
      .map(mark => ({ ...mark, measureIndex }))
  )
  if (!marks.length) return plan
  const jumps = marks.filter(mark => mark.type === 'dacapo' || mark.type === 'dalsegno')
  const stops = marks.filter(mark => mark.type === 'fine' || mark.type === 'tocoda')
  const unsupported = (navigationIssue: string): RepeatPlaybackPlan => ({ ...plan, navigationIssue })
  if (!jumps.length) {
    return stops.length ? unsupported('되돌아갈 점프 지시가 없어서 Fine 또는 To Coda를 적용하지 않았습니다.') : plan
  }
  if (jumps.length > 1 || stops.length > 1) {
    return unsupported('점프 또는 정지 지시가 여러 개라 한 경로로 확정할 수 없습니다.')
  }
  const afterJump = collectNavigationRepeatSettings(staves, measures)
  if (!afterJump) return unsupported('보표별 점프 뒤 도돌이표 지시가 서로 다릅니다.')

  const target = (type: 'segno' | 'coda', label: string) => {
    const candidates = marks.filter(mark => mark.type === type && mark.label === label)
    return candidates.length === 1 ? candidates[0].measureIndex : undefined
  }
  const [jump] = jumps
  const [stop] = stops
  const returnIndex = jump.type === 'dalsegno' ? target('segno', jump.label) : 0
  if (returnIndex === undefined || returnIndex > jump.measureIndex) {
    return unsupported('돌아갈 세뇨가 없거나 하나로 확정되지 않습니다.')
  }
  const codaIndex = stop?.type === 'tocoda' ? target('coda', stop.label) : undefined
  if (stop?.type === 'tocoda' && (codaIndex === undefined || codaIndex <= stop.measureIndex)) {
    return unsupported('이동할 코다가 없거나 하나로 확정되지 않습니다.')
  }

  // Count visits at the source boundary, including prior ordinary repeats.
  const visits = new Map<number, number>()
  const visit = (index: number) => {
    const count = (visits.get(index) ?? 0) + 1
    visits.set(index, count)
    return count
  }
  const jumpPasses = 'passes' in jump ? jump.passes : undefined
  const departure = plan.entries.findIndex(entry => {
    const count = visit(entry.measureIndex)
    return entry.measureIndex === jump.measureIndex && (jumpPasses ?? [1]).includes(count)
  })
  if (departure < 0) return plan

  let replay: RepeatPlaybackPlanEntry[]
  if (measures.some(measure => measure.volta)) {
    const voltaReplay = codaIndex !== undefined && codaIndex <= jump.measureIndex
      ? undefined
      : replayVoltaRepeat(measures, plan.entries, jump.measureIndex, afterJump)
    if (!voltaReplay) return unsupported('점프와 볼타가 결합된 경로를 확정할 수 없습니다.')
    replay = voltaReplay
  } else {
    replay = createRepeatPlaybackPlan(measures.map((measure, index) => ({
      ...measure,
      repeat: afterJump.get(index)
        ? measure.repeat
        : measure.repeat?.start ? { start: true } : undefined
    }))).entries
  }
  let route = plan.entries.slice(0, departure + 1)
  const returnAt = replay.findIndex(entry => entry.measureIndex === returnIndex)
  if (returnAt < 0) return unsupported('되돌아갈 마디를 재생 순서에서 찾지 못했습니다.')
  const onReturn = replay.slice(returnAt)

  const stopPasses = stop && 'passes' in stop ? stop.passes : undefined
  const stopAt = stop ? onReturn.findIndex(entry => {
    const count = visit(entry.measureIndex)
    return entry.measureIndex === stop.measureIndex && (stopPasses ?? (stop.type === 'tocoda' ? [2] : [count])).includes(count)
  }) : -1
  if (stop && stopAt < 0) return unsupported('되돌아간 뒤 Fine 또는 To Coda에 도달하지 않습니다.')
  const returned = stopAt < 0 ? onReturn : onReturn.slice(0, stopAt + 1)
  route = route.concat({ ...returned[0], navigationJump: true }, returned.slice(1))
  if (codaIndex !== undefined) {
    const codaAt = replay.findIndex(entry => entry.measureIndex === codaIndex)
    if (codaAt < 0) return unsupported('코다의 시작 마디를 재생 순서에서 찾지 못했습니다.')
    route = route.concat({ ...replay[codaAt], navigationJump: true }, replay.slice(codaAt + 1))
  }

  let outputBeat = 0
  const entries = route.map(entry => {
    const occurrence = { ...entry, outputBeat }
    outputBeat += measureDurationTicks(measures[entry.measureIndex]) / TICKS_PER_QUARTER
    return occurrence
  })
  return { entries, totalBeats: outputBeat }
}

// After a return that skips repeats, reuse the last traversal when one
// repeat has an unambiguous final ending.
function replayVoltaRepeat(
  measures: StaffMeasures,
  entries: RepeatPlaybackPlanEntry[],
  departureMeasure: number,
  afterJump: ReadonlyMap<number, boolean>
): RepeatPlaybackPlanEntry[] | undefined {
  const voltas = resolveMeasureVoltas(measures)
  const alternatives = inspectAlternativeEndingRepeats(measures, voltas).groups
  if (alternatives.size === 1) {
    const [[start, group]] = alternatives
    if (group.legacySecondMarkers.length || group.end >= departureMeasure) return undefined
    let priorStart: number | undefined
    const priorEnds = new Set<number>()
    const singlePass = new Set<number>()
    for (const [index, { id, repeat }] of measures.entries()) {
      if (index >= start && index <= group.end) continue
      if (voltas.has(id)) return undefined
      if (!repeat?.start && !repeat?.end) continue
      if (index > group.end) return undefined

      if (repeat.start) {
        if (repeat.end || priorStart !== undefined) return undefined
        priorStart = index
        continue
      }

      const times = repeat.times ?? 2
      if (priorStart === undefined || !Number.isSafeInteger(times) || times < 2 || times > 100) return undefined
      priorEnds.add(index)
      if (!afterJump.get(index)) {
        for (let bar = priorStart; bar <= index; bar += 1) singlePass.add(bar)
      }
      priorStart = undefined
    }

    // Each flag belongs to a closed, independent repeat outside the endings.
    if (priorStart !== undefined || [...afterJump.keys()].some(index => !priorEnds.has(index))) return undefined
    return replayFinalPass(entries, start, group.endingsByPass.length)?.filter(entry =>
      entry.pass === 1 || !singlePass.has(entry.measureIndex))
  }

  if (afterJump.size) return undefined
  const repeatBars = measures.flatMap((measure, index) =>
    measure.repeat?.start || measure.repeat?.end ? [index] : []
  )
  if (repeatBars.length !== 2) return undefined
  const [start, end] = repeatBars
  const startMark = measures[start].repeat
  const endMark = measures[end].repeat
  const repeatCount = endMark?.times ?? 2
  if (!startMark?.start || startMark.end || !endMark?.end || endMark.start ||
      !Number.isSafeInteger(repeatCount) || repeatCount < 2 || repeatCount > 100) return undefined

  const endings = measures.flatMap((measure, index) => measure.volta ? [index] : [])
  const firstStart = endings[0]
  const secondEnd = endings.at(-1)
  const secondStart = end + 1
  if (firstStart <= start || firstStart > end || secondEnd === undefined ||
      secondEnd < secondStart || secondEnd >= departureMeasure) return undefined

  const passes = Array.from({ length: repeatCount }, (_, index) => index + 1)
  const valid = measures.every(({ id, volta }, index) => {
    const covering = voltas.get(id)
    if (index < firstStart || index > secondEnd) return !covering
    const firstEnding = index <= end
    if (!covering || covering.passes?.some(pass => pass > repeatCount)) return false
    const matchesPasses = passes.every(pass => {
      const shouldPlay = firstEnding ? pass < repeatCount : pass === repeatCount
      const playsOnPass = !shouldSkipVoltaMeasure(covering, pass)
      return playsOnPass === shouldPlay
    })
    if (!matchesPasses) return false

    const atStart = index === (firstEnding ? firstStart : secondStart)
    const atEnd = index === (firstEnding ? end : secondEnd)
    return Boolean(volta?.start) === atStart &&
      ((atStart && atEnd) || Boolean(volta?.end) === atEnd)
  })
  return valid ? replayFinalPass(entries, start, repeatCount) : undefined
}

function replayFinalPass(
  entries: RepeatPlaybackPlanEntry[], start: number, repeatCount: number
): RepeatPlaybackPlanEntry[] | undefined {
  const firstPass = entries.findIndex(entry => entry.measureIndex === start && entry.pass === 1)
  const finalPass = entries.findIndex(entry => entry.measureIndex === start && entry.pass === repeatCount)
  if (firstPass < 0 || finalPass <= firstPass) return undefined
  return entries.slice(0, firstPass).concat(entries.slice(finalPass))
}

export function createRepeatPlaybackPlan(measures: StaffMeasures): RepeatPlaybackPlan {
  const voltas = resolveMeasureVoltas(measures)
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
        voltas.get(measure.id),
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

  const nestedRepeats = collectExplicitNestedSections(measures, voltas)
  const alternativeRepeats = inspectAlternativeEndingRepeats(measures, voltas).groups
  for (let measureIndex = 0; measureIndex < measures.length; measureIndex += 1) {
    const alternative = alternativeRepeats.get(measureIndex)
    if (alternative && !alternative.legacySecondMarkers.length) {
      alternative.endingsByPass.forEach(({ start, end }, passIndex) => {
        const pass = passIndex + 1
        for (let index = measureIndex; index < alternative.firstEnding; index += 1) appendMeasure(index, pass)
        for (let index = start; index <= end; index += 1) appendMeasure(index, pass)
      })
      measureIndex = alternative.end
      repeatStartIndex = alternative.end + 1
      repeatPass = alternative.endingsByPass.length
      continue
    }

    const root = nestedRepeats?.roots.get(measureIndex)
    if (nestedRepeats && root) {
      appendNestedMeasures(measureIndex, root.end, nestedRepeats.sections, appendMeasure)
      measureIndex = root.end
      repeatStartIndex = root.end + 1
      repeatPass = root.times
      continue
    }

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

interface RepeatSection {
  end: number
  times: number
}

function appendNestedMeasures(
  start: number,
  end: number,
  sections: ReadonlyMap<number, RepeatSection>,
  appendMeasure: (index: number, pass: number) => void
): void {
  const active: (RepeatSection & { start: number; pass: number })[] = []
  for (let index = start; index <= end;) {
    const section = sections.get(index)
    if (section && active.at(-1)?.start !== index) {
      active.push({ start: index, ...section, pass: 1 })
    }
    const current = active[active.length - 1]
    appendMeasure(index, current.pass)
    if (current.end === index) {
      if (current.pass < current.times) {
        current.pass += 1
        index = current.start
        continue
      }
      active.pop()
    }
    index += 1
  }
}

/** Only closed explicit nested regions with no endings use the new traversal.
 * Include separate legacy repeats in the expansion bound, including an
 * implicit beginning after the previous repeat. */
function collectExplicitNestedSections(
  measures: StaffMeasures,
  voltas: ReadonlyMap<string, VoltaMark>
): { roots: Map<number, RepeatSection>; sections: Map<number, RepeatSection> } | undefined {
  const roots = new Map<number, RepeatSection>()
  const sections = new Map<number, RepeatSection>()
  const open: { start: number; extraMeasures: number }[] = []
  const limit = measures.length * 100
  let total = measures.length
  let implicitStart = 0
  for (const [index, measure] of measures.entries()) {
    if (measure.repeat?.start) open.push({ start: index, extraMeasures: 0 })
    if (!measure.repeat?.end) continue

    const section = open.pop()
    const times = Math.max(2, measure.repeat.times ?? 2)
    if (!Number.isSafeInteger(times) || times > 100) return undefined
    const sourceCount = index - (section?.start ?? implicitStart) + 1
    const expandedCount = (sourceCount + (section?.extraMeasures ?? 0)) * times
    if (expandedCount > limit) return undefined

    const info = { end: index, times }
    if (section) sections.set(section.start, info)
    const extra = expandedCount - sourceCount
    const parent = open.at(-1)
    if (parent) {
      parent.extraMeasures += extra
      continue
    }
    implicitStart = index + 1
    total += extra
    if (total > limit) return undefined

    if (section && section.extraMeasures > 0 &&
      !measures.slice(section.start, index + 1).some(bar => voltas.has(bar.id))) {
      roots.set(section.start, info)
    }
  }
  return roots.size && open.length === 0 ? { roots, sections } : undefined
}

function shouldSkipVoltaMeasure(volta: VoltaMark | undefined, repeatPass: number): boolean {
  if (volta?.passes) return volta.passes.length > 0 && !volta.passes.includes(repeatPass)
  if (volta?.number === 1) return repeatPass !== 1
  return volta?.number === 2 && repeatPass === 1
}
