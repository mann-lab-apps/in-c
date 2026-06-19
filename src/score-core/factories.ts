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
  TimeSignature,
  Voice,
  VoiceEvent
} from './types'

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
  return {
    value,
    dots
  }
}

export function createNote(input: {
  id: string
  pitch: Pitch
  duration?: Duration
}): Note {
  return {
    type: 'note',
    id: input.id,
    pitch: input.pitch,
    duration: input.duration ?? createDuration('quarter')
  }
}

export function createRest(input: { id: string; duration?: Duration }): Rest {
  return {
    type: 'rest',
    id: input.id,
    duration: input.duration ?? createDuration('quarter')
  }
}

export function createVoice(input?: { id?: string; events?: VoiceEvent[] }): Voice {
  return {
    id: input?.id ?? 'voice-1',
    events: input?.events ?? []
  }
}

export function createMeasure(input?: {
  id?: string
  number?: number
  timeSignature?: TimeSignature
  keySignature?: KeySignature
  clef?: Clef
  voices?: Voice[]
}): Measure {
  return {
    id: input?.id ?? `measure-${input?.number ?? 1}`,
    number: input?.number ?? 1,
    timeSignature: input?.timeSignature ?? commonTime,
    keySignature: input?.keySignature ?? cMajor,
    clef: input?.clef ?? trebleClef,
    voices: input?.voices ?? [createVoice()]
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
