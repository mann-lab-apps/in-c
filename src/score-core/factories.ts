import type {
  Clef,
  Duration,
  DurationValue,
  KeySignature,
  Measure,
  Note,
  Part,
  Pitch,
  Rest,
  Score,
  Staff,
  TimePosition,
  TimeSignature,
  TupletGroup,
  Voice,
  VoiceEvent
} from './types'
import {
  MAX_AUGMENTATION_DOTS,
  createTimePosition,
  sortVoiceEvents
} from './timing'

export const trebleClef: Clef = {
  sign: 'G',
  line: 2
}

export const cMajor: KeySignature = {
  fifths: 0,
  mode: 'major'
}

export const commonTime: TimeSignature = {
  beats: 4,
  beatType: 4
}

export function createDuration(value: DurationValue, dots = 0): Duration {
  if (
    !Number.isInteger(dots) ||
    dots < 0 ||
    dots > MAX_AUGMENTATION_DOTS
  ) {
    throw new Error(
      `Duration dots must be an integer from 0 to ${MAX_AUGMENTATION_DOTS}: ${dots}`
    )
  }

  return {
    value,
    dots
  }
}

export function createNote(input: {
  id: string
  position?: TimePosition
  pitch: Pitch
  duration?: Duration
  ties?: Note['ties']
}): Note {
  return {
    type: 'note',
    id: input.id,
    position: input.position ?? createTimePosition(0),
    pitch: input.pitch,
    duration: input.duration ?? createDuration('quarter'),
    ties: input.ties
  }
}

export function createRest(input: {
  id: string
  position?: TimePosition
  duration?: Duration
  fullMeasure?: boolean
}): Rest {
  return {
    type: 'rest',
    id: input.id,
    position: input.position ?? createTimePosition(0),
    duration: input.duration ?? createDuration('quarter'),
    fullMeasure: input.fullMeasure
  }
}

export function createFullMeasureRest(input: {
  id: string
  position?: TimePosition
}): Rest {
  return createRest({
    id: input.id,
    position: input.position,
    duration: createDuration('whole'),
    fullMeasure: true
  })
}

export function createVoice(input?: {
  id?: string
  events?: VoiceEvent[]
  tuplets?: TupletGroup[]
}): Voice {
  return {
    id: input?.id ?? 'voice-1',
    events: sortVoiceEvents(input?.events ?? []),
    tuplets: input?.tuplets
  }
}

export function createMeasure(input?: {
  id?: string
  number?: number
  timeSignature?: TimeSignature
  keySignature?: KeySignature
  clef?: Clef
  voices?: Voice[]
  timing?: Measure['timing']
}): Measure {
  const number = input?.number ?? 1
  const id = input?.id ?? `measure-${number}`

  return {
    id,
    number,
    timing: input?.timing ?? { type: 'regular' },
    timeSignature: input?.timeSignature ?? commonTime,
    keySignature: input?.keySignature ?? cMajor,
    clef: input?.clef ?? trebleClef,
    voices:
      input?.voices ??
      [
        createVoice({
          events: [
            createFullMeasureRest({
              id: `${id}-full-measure-rest`
            })
          ]
        })
      ]
  }
}

export function createStaff(input?: { id?: string; measures?: Measure[] }): Staff {
  return {
    id: input?.id ?? 'staff-1',
    measures: input?.measures ?? [createMeasure()]
  }
}

export function createPart(input?: {
  id?: string
  name?: string
  abbreviation?: string
  staves?: Staff[]
}): Part {
  return {
    id: input?.id ?? 'part-1',
    name: input?.name ?? 'Piano',
    abbreviation: input?.abbreviation,
    staves: input?.staves ?? [createStaff()]
  }
}

export function createScore(input?: {
  id?: string
  title?: string
  composer?: string
  parts?: Part[]
}): Score {
  return {
    id: input?.id ?? 'score-1',
    title: input?.title ?? 'Untitled score',
    composer: input?.composer,
    parts: input?.parts ?? [createPart()]
  }
}
