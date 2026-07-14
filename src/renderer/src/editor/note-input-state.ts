import {
  applyScoreCommand,
  buildRhythmEditCommand,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createRest,
  createTimePosition,
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
  type TupletGroup,
  type VoiceAddress,
  type VoiceEvent
} from '../../../score-core'

export type NoteInputMode = 'note' | 'rest'

export interface NoteInputState {
  target: VoiceAddress
  tick: Tick
  duration: Duration
  mode: NoteInputMode
  accidental?: Pitch['alter']
  tupletInput?: {
    id: string
    actualNotes: number
    normalNotes: number
    members: Array<{
      mode: NoteInputMode
      step?: PitchStep
      accidental?: Pitch['alter']
    }>
  }
}

export interface SequentialInputResult {
  command: ScoreCommand
  eventId: string
  nextState: NoteInputState
  pending?: boolean
}

export function createNoteInputState(input: {
  target: VoiceAddress
  tick: Tick
  duration: Duration
  mode: NoteInputMode
  accidental?: Pitch['alter']
  tupletInput?: NoteInputState['tupletInput']
}): NoteInputState {
  return {
    target: input.target,
    tick: input.tick,
    duration: input.duration,
    mode: input.mode,
    accidental: input.accidental,
    tupletInput: input.tupletInput
  }
}

export function beginTupletInput(
  state: NoteInputState,
  id: string,
  actualNotes = 3,
  normalNotes = 2
): NoteInputState | undefined {
  if (
    state.tupletInput ||
    state.duration.dots > 0 ||
    actualNotes <= 1 ||
    normalNotes <= 0
  ) {
    return undefined
  }

  return {
    ...state,
    duration: {
      ...state.duration,
      tuplet: {
        actualNotes,
        normalNotes
      }
    },
    tupletInput: {
      id,
      actualNotes,
      normalNotes,
      members: []
    }
  }
}

export function cancelTupletInput(state: NoteInputState): NoteInputState {
  const { tuplet: _tuplet, ...duration } = state.duration

  return {
    ...state,
    duration,
    tupletInput: undefined
  }
}

export function createTupletInputPreviewScore(
  score: Score,
  state: NoteInputState
): Score {
  const tupletInput = state.tupletInput

  if (!tupletInput || tupletInput.members.length === 0) {
    return score
  }

  const location = locateInputVoice(score, state.target)

  if (!location) {
    return score
  }

  const event = location.voice.events.find(
    (candidate) => candidate.position.tick === state.tick
  )
  const memberTicks = durationToTicks(state.duration)
  const groupEndTick = state.tick + memberTicks * tupletInput.actualNotes

  if (
    !event ||
    event.type !== 'rest' ||
    groupEndTick > measureDurationTicks(location.measure)
  ) {
    return score
  }

  const groupDuration = decomposeDurationTicks(
    memberTicks * tupletInput.actualNotes
  )

  if (!groupDuration || groupDuration.length !== 1) {
    return score
  }

  const spanCommand = buildRhythmEditCommand(score, {
    target: state.target,
    eventId: event.id,
    event: createRest({
      id: event.id,
      position: event.position,
      duration: groupDuration[0]
    }),
    createId: previewIdSequence(tupletInput.id, 'span-rest')
  })

  if (!spanCommand || spanCommand.type !== 'voice-events.replace') {
    return score
  }

  let workingEvents = spanCommand.events.filter(
    (candidate) => candidate.id !== event.id
  )
  let workingScore = replaceWorkingVoiceEvents(
    score,
    state.target,
    workingEvents
  )
  const eventIds: string[] = []

  for (let index = 0; index < tupletInput.actualNotes; index += 1) {
    const member = tupletInput.members[index]
    const position = createTimePosition(state.tick + memberTicks * index)
    const eventId = `preview-${tupletInput.id}-${index + 1}`
    const currentLocation = locateInputVoice(workingScore, state.target)

    if (!currentLocation) {
      return score
    }

    const previewEvent =
      member?.mode === 'note' && member.step
        ? createNote({
            id: eventId,
            position,
            duration: state.duration,
            pitch: createInputPitch(
              currentLocation,
              member.step,
              position.tick,
              member.accidental
            )
          })
        : createRest({
            id: eventId,
            position,
            duration: state.duration
          })

    eventIds.push(eventId)
    workingEvents = sortVoiceEvents([...workingEvents, previewEvent])
    workingScore = replaceWorkingVoiceEvents(
      workingScore,
      state.target,
      workingEvents
    )
  }

  return replaceWorkingVoiceContent(score, state.target, {
    events: sortVoiceEvents([...workingEvents]),
    tuplets: [
      ...(location.voice.tuplets ?? []),
      {
        id: `preview-${tupletInput.id}`,
        eventIds,
        actualNotes: tupletInput.actualNotes,
        normalNotes: tupletInput.normalNotes
      }
    ]
  })
}

export function buildSequentialInput(
  score: Score,
  state: NoteInputState,
  step: PitchStep | undefined,
  createId: (kind: 'event' | 'measure') => string
): SequentialInputResult | undefined {
  if (state.tupletInput) {
    return buildTupletSequentialInput(score, state, step, createId)
  }

  const location = locateInputVoice(score, state.target)

  if (!location) {
    return undefined
  }

  const event = location.voice.events.find(
    (candidate) => candidate.position.tick === state.tick
  )
  const measureTicks = measureDurationTicks(location.measure)

  if (!event && state.tick === measureTicks) {
    return buildSequentialInputAfterMeasureEnd(
      score,
      state,
      step,
      createId,
      location
    )
  }

  if (!event || (state.mode === 'note' && !step)) {
    return undefined
  }

  const nextTick = state.tick + durationToTicks(state.duration)

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

function buildTupletSequentialInput(
  score: Score,
  state: NoteInputState,
  step: PitchStep | undefined,
  createId: (kind: 'event' | 'measure') => string
): SequentialInputResult | undefined {
  const tupletInput = state.tupletInput!

  if (state.mode === 'note' && !step) {
    return undefined
  }

  const member = {
    mode: state.mode,
    step,
    accidental: state.accidental
  }
  const members = [...tupletInput.members, member]
  const location = locateInputVoice(score, state.target)

  if (!location) {
    return undefined
  }

  const event = location?.voice.events.find(
    (candidate) => candidate.position.tick === state.tick
  )

  if (!event && state.tick === measureDurationTicks(location.measure)) {
    return buildSequentialInputAfterMeasureEnd(
      score,
      state,
      step,
      createId,
      location
    )
  }

  const memberTicks = durationToTicks(state.duration)
  const groupEndTick = state.tick + memberTicks * tupletInput.actualNotes

  if (
    !event ||
    event.type !== 'rest' ||
    groupEndTick > measureDurationTicks(location.measure)
  ) {
    return undefined
  }

  if (members.length < tupletInput.actualNotes) {
    return {
      command: {
        type: 'score.batch',
        commands: []
      },
      eventId: event.id,
      pending: true,
      nextState: {
        ...state,
        accidental: undefined,
        tupletInput: {
          ...tupletInput,
          members
        }
      }
    }
  }

  if (members.length > tupletInput.actualNotes) {
    return undefined
  }

  const groupDuration = decomposeDurationTicks(
    memberTicks * tupletInput.actualNotes
  )

  if (!groupDuration || groupDuration.length !== 1) {
    return undefined
  }

  const spanCommand = buildRhythmEditCommand(score, {
    target: state.target,
    eventId: event.id,
    event: createRest({
      id: event.id,
      position: event.position,
      duration: groupDuration[0]
    }),
    createId: () => createId('event')
  })

  if (!spanCommand || spanCommand.type !== 'voice-events.replace') {
    return undefined
  }

  let workingEvents = spanCommand.events.filter(
    (candidate) => candidate.id !== event.id
  )
  let workingScore = replaceWorkingVoiceEvents(
    score,
    state.target,
    workingEvents
  )
  let tick = state.tick
  const eventIds: string[] = []

  members.forEach((stagedMember, memberIndex) => {
    const currentLocation = locateInputVoice(workingScore, state.target)

    if (!currentLocation) {
      return
    }

    const eventId = memberIndex === 0 ? event.id : createId('event')
    const replacement =
      stagedMember.mode === 'rest'
        ? createRest({
            id: eventId,
            position: createTimePosition(tick),
            duration: state.duration
          })
        : createNote({
            id: eventId,
            position: createTimePosition(tick),
            duration: state.duration,
            pitch: createInputPitch(
              currentLocation,
              stagedMember.step!,
              tick,
              stagedMember.accidental
            )
          })
    workingEvents = sortVoiceEvents([...workingEvents, replacement])
    workingScore = replaceWorkingVoiceEvents(
      workingScore,
      state.target,
      workingEvents
    )
    eventIds.push(eventId)
    tick += memberTicks
  })

  const finalLocation = locateInputVoice(workingScore, state.target)

  if (
    !finalLocation ||
    eventIds.length !== tupletInput.actualNotes
  ) {
    return undefined
  }

  const lastEventId = eventIds.at(-1)

  if (!lastEventId) {
    return undefined
  }

  const contentCommand: ScoreCommand = {
    type: 'voice-content.replace',
    target: state.target,
    events: finalLocation.voice.events,
    tuplets: [
      ...(location.voice.tuplets ?? []),
      {
        id: tupletInput.id,
        eventIds,
        actualNotes: tupletInput.actualNotes,
        normalNotes: tupletInput.normalNotes
      }
    ],
    editedEventId: lastEventId
  }
  const nextDuration = cancelTupletInput(state).duration

  if (groupEndTick < measureDurationTicks(location.measure)) {
    return {
      command: contentCommand,
      eventId: lastEventId,
      nextState: {
        ...state,
        accidental: undefined,
        duration: nextDuration,
        tupletInput: undefined,
        tick: groupEndTick
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
      command: contentCommand,
      eventId: lastEventId,
      nextState: {
        ...state,
        accidental: undefined,
        duration: nextDuration,
        tupletInput: undefined,
        target: {
          ...state.target,
          measureId: nextMeasure.id,
          voiceId: nextVoice.id
        },
        tick: 0
      }
    }
  }

  const next = ensureNextInputMeasure(
    score,
    state.target,
    location,
    createId
  )

  if (!next?.command) {
    return undefined
  }

  return {
    command: {
      type: 'score.batch',
      commands: [contentCommand, next.command]
    },
    eventId: lastEventId,
    nextState: {
      ...state,
      accidental: undefined,
      duration: nextDuration,
      tupletInput: undefined,
      target: {
        ...state.target,
        measureId: next.measureId
      },
      tick: 0
    }
  }
}

function replaceWorkingVoiceEvents(
  score: Score,
  target: VoiceAddress,
  events: NonNullable<
    Extract<ScoreCommand, { type: 'voice-events.replace' }>['events']
  >
): Score {
  return {
    ...score,
    parts: score.parts.map((part) =>
      part.id !== target.partId
        ? part
        : {
            ...part,
            staves: part.staves.map((staff) =>
              staff.id !== target.staffId
                ? staff
                : {
                    ...staff,
                    measures: staff.measures.map((measure) =>
                      measure.id !== target.measureId
                        ? measure
                        : {
                            ...measure,
                            voices: measure.voices.map((voice) =>
                              voice.id !== target.voiceId
                                ? voice
                                : {
                                    ...voice,
                                    events
                                  }
                            )
                          }
                    )
                  }
            )
          }
    )
  }
}

function replaceWorkingVoiceContent(
  score: Score,
  target: VoiceAddress,
  content: {
    events: VoiceEvent[]
    tuplets: TupletGroup[]
  }
): Score {
  return {
    ...score,
    parts: score.parts.map((part) =>
      part.id !== target.partId
        ? part
        : {
            ...part,
            staves: part.staves.map((staff) =>
              staff.id !== target.staffId
                ? staff
                : {
                    ...staff,
                    measures: staff.measures.map((measure) =>
                      measure.id !== target.measureId
                        ? measure
                        : {
                            ...measure,
                            voices: measure.voices.map((voice) =>
                              voice.id !== target.voiceId
                                ? voice
                                : {
                                    ...voice,
                                    events: content.events,
                                    tuplets: content.tuplets
                                  }
                            )
                          }
                    )
                  }
            )
          }
    )
  }
}

function previewIdSequence(prefix: string, kind: string): () => string {
  let index = 0

  return () => `preview-${prefix}-${kind}-${++index}`
}

function buildSequentialInputAfterMeasureEnd(
  score: Score,
  state: NoteInputState,
  step: PitchStep | undefined,
  createId: (kind: 'event' | 'measure') => string,
  location: NonNullable<ReturnType<typeof locateInputVoice>>
): SequentialInputResult | undefined {
  const next = ensureNextInputMeasure(score, state.target, location, createId)

  if (!next) {
    return undefined
  }

  const workingScore = next.command
    ? applyScoreCommand(score, next.command).score
    : score
  const nextState: NoteInputState = {
    ...state,
    target: {
      ...state.target,
      measureId: next.measureId,
      voiceId: next.voiceId
    },
    tick: 0
  }
  const input = buildSequentialInput(workingScore, nextState, step, createId)

  if (!input) {
    return undefined
  }

  return {
    ...input,
    command: combineCommands(next.command, input.command)
  }
}

function combineCommands(
  ...commands: Array<ScoreCommand | undefined>
): ScoreCommand {
  const effectiveCommands = commands.filter(hasCommandEffects)

  if (effectiveCommands.length === 0) {
    return {
      type: 'score.batch',
      commands: []
    }
  }

  return effectiveCommands.length === 1
    ? effectiveCommands[0]!
    : {
        type: 'score.batch',
        commands: effectiveCommands
      }
}

function hasCommandEffects(
  command: ScoreCommand | undefined
): command is ScoreCommand {
  return Boolean(
    command &&
      (command.type !== 'score.batch' ||
        command.commands.some(hasCommandEffects))
  )
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
  voiceId: string
} | undefined {
  const nextMeasure = location.staff.measures[location.measureIndex + 1]

  if (nextMeasure) {
    const nextVoice =
      nextMeasure.voices.find((voice) => voice.id === target.voiceId) ??
      nextMeasure.voices[0]

    return nextVoice
      ? {
          measureId: nextMeasure.id,
          voiceId: nextVoice.id
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
    voiceId: target.voiceId,
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
