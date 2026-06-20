import {
  buildRhythmEditCommand,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createRest,
  createVoice,
  durationToTicks,
  measureDurationTicks,
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
          pitch: {
            step: step!,
            octave: event.type === 'note' ? event.pitch.octave : 4,
            alter: state.accidental
          }
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

  const nextTick = state.tick + durationToTicks(state.duration)
  const measureTicks = measureDurationTicks(location.measure)

  if (nextTick < measureTicks) {
    return {
      command: editCommand,
      eventId: event.id,
      nextState: {
        ...state,
        tick: nextTick
      }
    }
  }

  if (nextTick > measureTicks) {
    return undefined
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
      target: {
        ...state.target,
        measureId: newMeasure.id
      },
      tick: 0
    }
  }
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
