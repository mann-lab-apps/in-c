import {
  collectTiePairs,
  createFullMeasureRest,
  createMeasure,
  createVoice,
  type Measure,
  type Part,
  type Score,
  type ScoreCommand,
  type StaffAddress
} from '../../../score-core'
import { getSelectionFocusEventId, type EditorSelection } from './editor-state'
import type { NoteInputState } from './note-input-state'

export interface MeasureEditResult {
  command: ScoreCommand
  inputState?: NoteInputState
  selection: EditorSelection
}

export function buildInsertMeasureAfter(
  score: Score,
  measureId: string,
  createId: (kind: 'event' | 'measure') => string,
  inputState?: NoteInputState
): MeasureEditResult | undefined {
  return buildInsertMeasure(score, measureId, 'after', createId, inputState)
}

export function buildInsertMeasureBefore(
  score: Score,
  measureId: string,
  createId: (kind: 'event' | 'measure') => string,
  inputState?: NoteInputState
): MeasureEditResult | undefined {
  return buildInsertMeasure(score, measureId, 'before', createId, inputState)
}

function buildInsertMeasure(
  score: Score,
  measureId: string,
  placement: 'before' | 'after',
  createId: (kind: 'event' | 'measure') => string,
  inputState?: NoteInputState
): MeasureEditResult | undefined {
  const location = locateMeasureForEdit(score, measureId)

  if (!location || !hasAlignedMeasures(score)) {
    return undefined
  }

  const insertionIndex =
    placement === 'before' ? location.measureIndex : location.measureIndex + 1
  const makeMeasure = (source: Measure, voices: Measure['voices']) => createMeasure({
    id: createId('measure'),
    number: insertionIndex + 1,
    clef: { ...source.clef },
    transposition: source.transposition,
    keySignature: { ...source.keySignature },
    timeSignature: { ...source.timeSignature },
    voices: voices.map((voice) =>
      createVoice({
        id: voice.id,
        events: [
          createFullMeasureRest({
            id: createId('event')
          })
        ]
      })
    )
  })
  let newMeasure: Measure | undefined
  const parts = score.parts.map(part => ({ ...part, staves: part.staves.map(staff => {
    // Attributes follow the music before the insertion, not a later signature change.
    const source = staff.measures[Math.max(0, insertionIndex - 1)]!
    const inserted = makeMeasure(source, staff.measures[location.measureIndex]!.voices)
    if (part.id === location.staffAddress.partId && staff.id === location.staffAddress.staffId) newMeasure = inserted
    const measures = [...staff.measures]
    measures.splice(insertionIndex, 0, inserted)
    return { ...staff, measures: measures.map((measure, index) => ({ ...measure, number: index + 1 })) }
  }) }))
  if (!newMeasure) return undefined
  const firstVoice = newMeasure.voices.find(voice =>
    inputState?.target.partId === location.staffAddress.partId &&
    inputState.target.staffId === location.staffAddress.staffId && voice.id === inputState.target.voiceId
  ) ?? newMeasure.voices[0]
  const firstEvent = firstVoice?.events[0]

  if (!firstVoice || !firstEvent) {
    return undefined
  }

  return {
    command: buildStructuralCommand(score, parts),
    selection: {
      type: 'event',
      eventId: firstEvent.id,
      address: { ...location.staffAddress, measureId: newMeasure.id, voiceId: firstVoice.id }
    },
    inputState: inputState
      ? {
          ...inputState,
          target: {
            ...location.staffAddress,
            measureId: newMeasure.id,
            voiceId: firstVoice.id
          },
          tick: 0
        }
      : undefined
  }
}

export function buildRemoveMeasure(
  score: Score,
  measureId: string,
  inputState?: NoteInputState
): MeasureEditResult | undefined {
  const location = locateMeasureForEdit(score, measureId)

  if (!location || !hasAlignedMeasures(score) || location.staff.measures.length <= 1) {
    return undefined
  }

  const fallbackMeasure =
    location.staff.measures[location.measureIndex + 1] ??
    location.staff.measures[location.measureIndex - 1]
  const fallbackVoice = fallbackMeasure?.voices.find(voice =>
    inputState?.target.partId === location.staffAddress.partId &&
    inputState.target.staffId === location.staffAddress.staffId && voice.id === inputState.target.voiceId
  ) ?? fallbackMeasure?.voices[0]

  if (!fallbackMeasure || !fallbackVoice) {
    return undefined
  }

  return {
    command: buildStructuralCommand(score, score.parts.map(part => ({ ...part, staves: part.staves.map(staff => ({
      ...staff, measures: removeMeasureKeepingVoltaRange(staff.measures, location.measureIndex)
    })) }))),
    selection: {
      type: 'measure',
      measureId: fallbackMeasure.id,
      address: { ...location.staffAddress, measureId: fallbackMeasure.id, voiceId: fallbackVoice.id }
    },
    inputState: inputState
      ? {
          ...inputState,
          target: {
            ...location.staffAddress,
            measureId: fallbackMeasure.id,
            voiceId: fallbackVoice.id
          },
          tick: 0
        }
      : undefined
  }
}

function removeMeasureKeepingVoltaRange(measures: Measure[], removedIndex: number): Measure[] {
  const remaining = measures.filter((_, index) => index !== removedIndex)
    .map((measure, index) => ({ ...measure, number: index + 1 }))
  let startIndex: number | undefined
  for (const [index, measure] of measures.entries()) {
    if (measure.volta?.start) startIndex = index
    if (startIndex === undefined || !measure.volta?.end) continue
    const start = measures[startIndex]!
    if (start.volta?.number === measure.volta.number &&
      (removedIndex === startIndex || removedIndex === index)) {
      const surviving = measures.slice(startIndex, index + 1)
        .filter(item => item.id !== measures[removedIndex]!.id)
      const first = remaining.find(item => item.id === surviving[0]?.id)
      const last = remaining.find(item => item.id === surviving.at(-1)?.id)
      if (first && last) {
        first.volta = { ...first.volta, number: measure.volta.number, start: true }
        last.volta = { ...last.volta, number: measure.volta.number, end: true }
      }
    }
    startIndex = undefined
  }
  return remaining
}

function hasAlignedMeasures(score: Score): boolean {
  const count = score.parts[0]?.staves[0]?.measures.length
  return Boolean(count && score.parts.every(part => part.staves.every(staff => staff.measures.length === count)))
}

function buildStructuralCommand(score: Score, nextParts: Part[]): ScoreCommand {
  const oldPairs = collectTiePairs(score)
  const newPairs = collectTiePairs({ ...score, parts: nextParts })
  const nextTargets = new Map(newPairs.map(pair => [pair.fromEventId, pair.toEventId]))
  const brokenPairs = oldPairs.filter(pair => nextTargets.get(pair.fromEventId) !== pair.toEventId)
  const brokenStarts = new Set(brokenPairs.map(pair => pair.fromEventId))
  const brokenStops = new Set(brokenPairs.map(pair => pair.toEventId))
  const parts = nextParts.map(part => ({ ...part, staves: part.staves.map(staff => ({ ...staff,
    measures: staff.measures.map(measure => ({ ...measure, voices: measure.voices.map(voice => ({ ...voice,
      events: voice.events.map(event => {
        if (event.type !== 'note' || (!brokenStarts.has(event.id) && !brokenStops.has(event.id))) return event
        const start = brokenStarts.has(event.id) ? undefined : event.ties?.start
        const stop = brokenStops.has(event.id) ? undefined : event.ties?.stop
        return { ...event, ties: start || stop ? { start, stop } : undefined }
      })
    })) }))
  })) }))
  const oldMeasureIds = new Set(score.parts.flatMap(part => part.staves.flatMap(staff => staff.measures.map(measure => measure.id))))
  const measureIds = new Set(parts.flatMap(part => part.staves.flatMap(staff => staff.measures.map(measure => measure.id))))
  const eventIds = new Set(parts.flatMap(part => part.staves.flatMap(staff => staff.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events.map(event => event.id))))))
  const primary = parts[0]!.staves[0]!.measures
  // Imported system directions can use ordinal aliases instead of concrete measure IDs.
  const aliases = new Map<string, string | undefined>(score.parts[0]!.staves[0]!.measures.map(measure => {
    const index = primary.findIndex(next => next.id === measure.id)
    return [`measure-${measure.number}`, index < 0 ? undefined : `measure-${index + 1}`] as const
  }))
  const reference = (id: string): string | undefined => oldMeasureIds.has(id)
    ? measureIds.has(id) ? id : undefined
    : aliases.has(id) ? aliases.get(id) : id
  const markings = <T extends { measureId: string }>(items: T[] | undefined) => items?.flatMap(item => {
    const measureId = reference(item.measureId)
    return measureId ? [{ ...item, measureId }] : []
  })
  const spans = <T extends { startEventId: string; endEventId: string }>(items: T[] | undefined) => items?.filter(item => eventIds.has(item.startEventId) && eventIds.has(item.endEventId))
  const commands: ScoreCommand[] = [{ type: 'score-parts.replace', parts }]
  if (score.tempoEvents) commands.push({ type: 'score-tempo-events.update', tempoEvents: markings(score.tempoEvents) })
  if (score.dynamics) commands.push({ type: 'score-dynamics.update', dynamics: markings(score.dynamics) })
  if (score.harmonies) commands.push({ type: 'score-harmonies.update', harmonies: markings(score.harmonies) })
  if (score.rehearsalMarks) commands.push({ type: 'score-rehearsal-marks.update', rehearsalMarks: markings(score.rehearsalMarks) })
  if (score.staffTexts) commands.push({ type: 'score-staff-texts.update', staffTexts: markings(score.staffTexts) })
  if (score.systemTexts) commands.push({ type: 'score-system-texts.update', systemTexts: markings(score.systemTexts) })
  if (score.expressionTexts) commands.push({ type: 'score-expression-texts.update', expressionTexts: markings(score.expressionTexts) })
  if (score.hairpins) commands.push({ type: 'score-hairpins.update', hairpins: spans(score.hairpins) })
  if (score.slurs) commands.push({ type: 'score-slurs.update', slurs: spans(score.slurs) })
  if (score.octaveShifts) commands.push({ type: 'score-octave-shifts.update', octaveShifts: spans(score.octaveShifts) })
  if (score.layout) {
    const layout = { ...score.layout }
    for (const key of ['systemBreakBeforeMeasureIds', 'pageBreakBeforeMeasureIds'] as const) {
      if (layout[key]) layout[key] = layout[key].flatMap(id => reference(id) ?? [])
    }
    commands.push({ type: 'score-layout.update', layout })
  }
  return { type: 'score.batch', commands }
}

export function resolveActiveMeasureId(
  score: Score,
  selection: EditorSelection,
  inputState?: NoteInputState
): string | undefined {
  if (inputState) {
    return inputState.target.measureId
  }

  if (selection.type === 'measure') {
    return selection.measureId
  }

  const eventId = getSelectionFocusEventId(selection)

  if (!eventId) {
    return undefined
  }

  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (const measure of staff.measures) {
        if (
          measure.voices.some((voice) =>
            voice.events.some((event) => event.id === eventId)
          )
        ) {
          return measure.id
        }
      }
    }
  }

  return undefined
}

function locateMeasureForEdit(score: Score, measureId: string) {
  for (const part of score.parts) {
    for (const staff of part.staves) {
      const measureIndex = staff.measures.findIndex(
        (measure) => measure.id === measureId
      )

      if (measureIndex !== -1) {
        return {
          staff,
          staffAddress: {
            partId: part.id,
            staffId: staff.id
          } satisfies StaffAddress,
          measure: staff.measures[measureIndex],
          measureIndex
        }
      }
    }
  }

  return undefined
}
