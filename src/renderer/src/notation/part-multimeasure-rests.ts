import { createGlobalMeasureResolver, measureDurationTicks, type Measure, type Score } from '../../../score-core'
import { resolveLayoutForPrimaryStaff } from '../../../project/layout-measure-reference'

function isNeutralTransposition(transposition: Measure['transposition']): boolean {
  return !transposition || (transposition.chromatic === 0 &&
    (transposition.diatonic ?? 0) === 0 && (transposition.octaveChange ?? 0) === 0)
}

function sameTransposition(previous: Measure['transposition'], current: Measure['transposition']): boolean {
  return (isNeutralTransposition(previous) && isNeutralTransposition(current)) ||
    (previous?.chromatic === current?.chromatic && previous?.diatonic === current?.diatonic &&
      (previous?.octaveChange ?? 0) === (current?.octaveChange ?? 0))
}

function sameWrittenContext(previous: Measure, current: Measure): boolean {
  return previous.number + 1 === current.number &&
    previous.timeSignature.beats === current.timeSignature.beats &&
    previous.timeSignature.beatType === current.timeSignature.beatType &&
    previous.keySignature.fifths === current.keySignature.fifths &&
    previous.keySignature.mode === current.keySignature.mode &&
    previous.clef.sign === current.clef.sign &&
    previous.clef.line === current.clef.line &&
    (previous.clef.octaveChange ?? 0) === (current.clef.octaveChange ?? 0) &&
    sameTransposition(previous.transposition, current.transposition)
}

function isPlainMeasureRest(measure: Measure): boolean {
  if (measure.timing.type !== 'regular' || measure.repeat || measure.volta ||
      measure.navigation?.length || !measure.voices.length) return false
  return measure.voices.every(voice => {
    const [rest] = voice.events
    return !voice.tuplets?.length && voice.events.length === 1 &&
      rest.type === 'rest' && rest.fullMeasure === true && rest.position.tick === 0 &&
      !rest.fermata && !rest.breathMark && !rest.duration.tuplet
  })
}

/** A print-only projection from an already selected part. Never use for edits,
 * playback or file exchange, which keep every underlying measure and event. */
export function planPartMultimeasureRests(score: Score): { score: Score; counts: ReadonlyMap<string, number> } | undefined {
  const [part] = score.parts
  if (score.parts.length !== 1 || !part.staves.length) return undefined
  const { staves } = part
  const primary = staves[0].measures
  const durations = primary.map(measureDurationTicks)
  if (!staves.every(staff => staff.measures.length === primary.length &&
      staff.measures.every((measure, index) => measureDurationTicks(measure) === durations[index]))) return undefined
  const resolveMeasure = createGlobalMeasureResolver(score)
  const annotated = new Set([
    ...(score.tempoEvents ?? []), ...(score.pedalEvents ?? []), ...(score.rehearsalMarks ?? []),
    ...(score.staffTexts ?? []), ...(score.systemTexts ?? []), ...(score.expressionTexts ?? []),
    ...(score.harmonies ?? []), ...(score.dynamics ?? [])
  ].map(mark => resolveMeasure(mark.measureId) ?? mark.measureId))
  const layout = resolveLayoutForPrimaryStaff(score)
  const breaks = new Set([
    ...(layout?.systemBreakBeforeMeasureIds ?? []),
    ...(layout?.pageBreakBeforeMeasureIds ?? [])
  ])
  const measureIds = new Set<string>()
  const eventIndices = new Map<string, number>()
  const measureIndices = new Map<string, number>()
  for (const staff of staves) {
    for (const [index, measure] of staff.measures.entries()) {
      if (measureIds.has(measure.id)) return undefined
      measureIds.add(measure.id)
      measureIndices.set(measure.id, index)
      for (const voice of measure.voices) for (const event of voice.events) {
        if (eventIndices.has(event.id)) return undefined
        eventIndices.set(event.id, index)
      }
    }
  }
  const spanDelta = new Array<number>(primary.length + 1).fill(0)
  for (const span of [...(score.slurs ?? []), ...(score.hairpins ?? []), ...(score.octaveShifts ?? [])]) {
    const start = eventIndices.get(span.startEventId)
    const end = 'endTime' in span && span.endTime ? measureIndices.get(span.endTime.measureId) : eventIndices.get(span.endEventId!)
    // An unresolved endpoint cannot define a safe exclusion range.
    if (start === undefined || end === undefined) return undefined
    spanDelta[Math.min(start, end)] += 1
    spanDelta[Math.max(start, end) + 1] -= 1
  }
  const retainedIndices: number[] = []
  const counts = new Map<string, number>()
  let runStart: number | undefined
  const activeVoltas = new Set<number>()
  let activeSpans = 0
  const flush = (end: number) => {
    if (runStart === undefined) return
    retainedIndices.push(runStart)
    const length = end - runStart
    if (length > 1) {
      for (const staff of staves) counts.set(staff.measures[runStart].id, length)
    }
    runStart = undefined
  }
  for (const [index, measure] of primary.entries()) {
    const column = staves.map(staff => staff.measures[index])
    activeSpans += spanDelta[index]
    column.forEach((bar, staffIndex) => { if (bar.volta?.start) activeVoltas.add(staffIndex) })
    if (activeVoltas.size || activeSpans > 0 || column.some(bar => annotated.has(bar.id) || !isPlainMeasureRest(bar))) {
      flush(index)
      retainedIndices.push(index)
    } else {
      if (runStart !== undefined && (breaks.has(measure.id) ||
          column.some((bar, staffIndex) => !sameWrittenContext(staves[staffIndex].measures[index - 1], bar)))) {
        flush(index)
      }
      runStart ??= index
    }
    column.forEach((bar, staffIndex) => { if (bar.volta?.end) activeVoltas.delete(staffIndex) })
  }
  flush(primary.length)
  if (!counts.size) return undefined
  return {
    score: { ...score, parts: [{ ...part, staves: staves.map(staff => ({
      ...staff, measures: retainedIndices.map(index => staff.measures[index])
    })) }] },
    counts
  }
}
