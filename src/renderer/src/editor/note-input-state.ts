import {
  applyScoreCommand,
  buildRhythmEditCommand,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createRest,
  createVoice,
  decomposeDurationTicks,
  durationToTicks,
  effectiveAlterAt,
  measureDurationTicks,
  nearestPitch,
  resolveNotePitch,
  sortVoiceEvents,
  type Duration,
  type Pitch,
  type PitchStep,
  type Score,
  type ScoreCommand,
  type Tick,
  type VoiceAddress
} from '../../../score-core'

export type NoteInputMode = 'note' | 'rest'

export interface NoteInputState {
  target: VoiceAddress
  tick: Tick
  duration: Duration
  mode: NoteInputMode
  accidental?: Pitch['alter']
}

export interface SequentialInputResult {
  command: ScoreCommand
  eventId: string
  nextState: NoteInputState
}

export function createNoteInputState(input: {
  target: VoiceAddress
  tick: Tick
  duration: Duration
  mode: NoteInputMode
  accidental?: Pitch['alter']
}): NoteInputState {
  return {
    target: input.target,
    tick: input.tick,
    duration: input.duration,
    mode: input.mode,
    accidental: input.accidental
  }
}

export function buildSequentialInput(
  score: Score,
  state: NoteInputState,
  step: PitchStep | undefined,
  createId: (kind: 'event' | 'measure') => string
): SequentialInputResult | undefined {
  const location = locateInputVoice(score, state.target)

  if (!location) {
    return undefined
  }

  const event = location.voice.events.find(
    (candidate) => candidate.position.tick === state.tick
  )

  if (!event || (state.mode === 'note' && !step)) {
    return undefined
  }

  const nextTick = state.tick + durationToTicks(state.duration)
  const measureTicks = measureDurationTicks(location.measure)

  if (nextTick > measureTicks) {
    return state.mode === 'note'
      ? buildTiedSequentialInput(
          score,
          state,
          step!,
          createId,
          location,
          event.id
        )
      : undefined
  }

  const replacement =
    state.mode === 'rest'
      ? createRest({
          id: event.id,
          position: event.position,
          duration: state.duration
        })
      : createNote({
          id: event.id,
          position: event.position,
          duration: state.duration,
          pitch: createInputPitch(
            location,
            step!,
            state.tick,
            state.accidental
          )
        })
  const editCommand = buildRhythmEditCommand(score, {
    target: state.target,
    eventId: event.id,
    event: replacement,
    createId: () => createId('event')
  })

  if (!editCommand) {
    return undefined
  }

  if (nextTick < measureTicks) {
    return {
      command: editCommand,
      eventId: event.id,
      nextState: {
        ...state,
        accidental: undefined,
        tick: nextTick
      }
    }
  }

  const nextMeasure = location.staff.measures[location.measureIndex + 1]

  if (nextMeasure) {
    const nextVoice =
      nextMeasure.voices.find((voice) => voice.id === state.target.voiceId) ??
      nextMeasure.voices[0]

    if (!nextVoice) {
      return undefined
    }

    return {
      command: editCommand,
      eventId: event.id,
      nextState: {
        ...state,
        accidental: undefined,
        target: {
          ...state.target,
          measureId: nextMeasure.id,
          voiceId: nextVoice.id
        },
        tick: 0
      }
    }
  }

  const newMeasureId = createId('measure')
  const newMeasure = createMeasure({
    id: newMeasureId,
    number: location.measure.number + 1,
    clef: { ...location.measure.clef },
    keySignature: { ...location.measure.keySignature },
    timeSignature: { ...location.measure.timeSignature },
    voices: [
      createVoice({
        id: state.target.voiceId,
        events: [
          createFullMeasureRest({
            id: createId('event')
          })
        ]
      })
    ]
  })

  return {
    command: {
      type: 'score.batch',
      commands: [
        editCommand,
        {
          type: 'staff-measure.insert',
          target: {
            partId: state.target.partId,
            staffId: state.target.staffId
          },
          measure: newMeasure
        }
      ]
    },
    eventId: event.id,
    nextState: {
      ...state,
      accidental: undefined,
      target: {
        ...state.target,
        measureId: newMeasure.id
      },
      tick: 0
    }
  }
}

function buildTiedSequentialInput(
  score: Score,
  state: NoteInputState,
  step: PitchStep,
  createId: (kind: 'event' | 'measure') => string,
  initialLocation: NonNullable<ReturnType<typeof locateInputVoice>>,
  firstEventId: string
): SequentialInputResult | undefined {
  const pitch = createInputPitch(
    initialLocation,
    step,
    state.tick,
    state.accidental
  )
  const commands: ScoreCommand[] = []
  let workingScore = score
  let remainingTicks = durationToTicks(state.duration)
  let measureId = state.target.measureId
  let tick = state.tick
  let isFirstSegment = true

  while (remainingTicks > 0) {
    let location = locateInputVoice(workingScore, {
      ...state.target,
      measureId
    })

    if (!location) {
      return undefined
    }

    const availableTicks = measureDurationTicks(location.measure) - tick

    if (availableTicks <= 0) {
      const next = ensureNextInputMeasure(
        workingScore,
        state.target,
        location,
        createId
      )

      if (!next) {
        return undefined
      }

      if (next.command) {
        commands.push(next.command)
        workingScore = applyScoreCommand(workingScore, next.command).score
      }

      measureId = next.measureId
      tick = 0
      continue
    }

    const spanTicks = Math.min(remainingTicks, availableTicks)
    const durations = decomposeDurationTicks(spanTicks)

    if (!durations) {
      return undefined
    }

    for (const duration of durations) {
      location = locateInputVoice(workingScore, {
        ...state.target,
        measureId
      })
      const event = location?.voice.events.find(
        (candidate) => candidate.position.tick === tick
      )

      if (!location || !event) {
        return undefined
      }

      const segmentTicks = durationToTicks(duration)
      const hasPrevious = !isFirstSegment
      const hasNext = remainingTicks > segmentTicks
      const note = createNote({
        id: event.id,
        position: event.position,
        duration,
        pitch,
        ties:
          hasPrevious || hasNext
            ? {
                stop: hasPrevious || undefined,
                start: hasNext || undefined
              }
            : undefined
      })
      const command = buildRhythmEditCommand(workingScore, {
        target: {
          ...state.target,
          measureId
        },
        eventId: event.id,
        event: note,
        createId: () => createId('event')
      })

      if (!command) {
        return undefined
      }

      commands.push(command)
      workingScore = applyScoreCommand(workingScore, command).score
      remainingTicks -= segmentTicks
      tick += segmentTicks
      isFirstSegment = false
    }
  }

  let finalLocation = locateInputVoice(workingScore, {
    ...state.target,
    measureId
  })

  if (!finalLocation) {
    return undefined
  }

  if (tick === measureDurationTicks(finalLocation.measure)) {
    const next = ensureNextInputMeasure(
      workingScore,
      state.target,
      finalLocation,
      createId
    )

    if (!next) {
      return undefined
    }

    if (next.command) {
      commands.push(next.command)
      workingScore = applyScoreCommand(workingScore, next.command).score
    }

    measureId = next.measureId
    tick = 0
    finalLocation = locateInputVoice(workingScore, {
      ...state.target,
      measureId
    })

    if (!finalLocation) {
      return undefined
    }
  }

  return {
    command: {
      type: 'score.batch',
      commands
    },
    eventId: firstEventId,
    nextState: {
      ...state,
      accidental: undefined,
      target: {
        ...state.target,
        measureId,
        voiceId: finalLocation.voice.id
      },
      tick
    }
  }
}

function ensureNextInputMeasure(
  score: Score,
  target: VoiceAddress,
  location: NonNullable<ReturnType<typeof locateInputVoice>>,
  createId: (kind: 'event' | 'measure') => string
): {
  command?: ScoreCommand
  measureId: string
} | undefined {
  const nextMeasure = location.staff.measures[location.measureIndex + 1]

  if (nextMeasure) {
    const nextVoice =
      nextMeasure.voices.find((voice) => voice.id === target.voiceId) ??
      nextMeasure.voices[0]

    return nextVoice
      ? {
          measureId: nextMeasure.id
        }
      : undefined
  }

  const measureId = createId('measure')
  const measure = createMeasure({
    id: measureId,
    number: location.measure.number + 1,
    clef: { ...location.measure.clef },
    keySignature: { ...location.measure.keySignature },
    timeSignature: { ...location.measure.timeSignature },
    voices: [
      createVoice({
        id: target.voiceId,
        events: [
          createFullMeasureRest({
            id: createId('event')
          })
        ]
      })
    ]
  })

  return {
    measureId,
    command: {
      type: 'staff-measure.insert',
      target: {
        partId: target.partId,
        staffId: target.staffId
      },
      measure
    }
  }
}

function createInputPitch(
  location: NonNullable<ReturnType<typeof locateInputVoice>>,
  step: PitchStep,
  tick: Tick,
  accidental?: Pitch['alter']
): Pitch {
  const reference = findPreviousPitch(location, tick)
  const octave = nearestPitch({
    step,
    alter: 0,
    reference
  }).octave
  const alter = effectiveAlterAt({
    measure: location.measure,
    voice: location.voice,
    step,
    octave,
    tick,
    override: accidental
  })

  return {
    step,
    octave,
    alter
  }
}

function findPreviousPitch(
  location: NonNullable<ReturnType<typeof locateInputVoice>>,
  tick: Tick
): Pitch | undefined {
  const currentMeasureNote = sortVoiceEvents(location.voice.events)
    .filter(
      (event) =>
        event.type === 'note' &&
        event.position.tick < tick
    )
    .at(-1)

  if (currentMeasureNote?.type === 'note') {
    return resolveNotePitch(
      location.measure,
      location.voice,
      currentMeasureNote
    )
  }

  for (
    let measureIndex = location.measureIndex - 1;
    measureIndex >= 0;
    measureIndex -= 1
  ) {
    const voice =
      location.staff.measures[measureIndex].voices.find(
        (candidate) => candidate.id === location.voice.id
      ) ?? location.staff.measures[measureIndex].voices[0]
    const note = sortVoiceEvents(voice?.events ?? [])
      .filter((event) => event.type === 'note')
      .at(-1)

    if (note?.type === 'note') {
      return resolveNotePitch(
        location.staff.measures[measureIndex],
        voice!,
        note
      )
    }
  }

  return undefined
}

function locateInputVoice(score: Score, target: VoiceAddress) {
  const part = score.parts.find((candidate) => candidate.id === target.partId)
  const staff = part?.staves.find(
    (candidate) => candidate.id === target.staffId
  )
  const measureIndex =
    staff?.measures.findIndex(
      (candidate) => candidate.id === target.measureId
    ) ?? -1
  const measure = measureIndex >= 0 ? staff?.measures[measureIndex] : undefined
  const voice = measure?.voices.find(
    (candidate) => candidate.id === target.voiceId
  )

  return staff && measure && voice
    ? {
        staff,
        measure,
        measureIndex,
        voice
      }
    : undefined
}
