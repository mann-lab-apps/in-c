export type ScoreId = string
export type PartId = string
export type StaffId = string
export type MeasureId = string
export type VoiceId = string
export type VoiceEventId = string

export type DurationValue =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | '16th'
  | '32nd'
  | '64th'

export interface Duration {
  value: DurationValue
  dots: number
  tuplet?: {
    actualNotes: number
    normalNotes: number
  }
}

export type PitchStep = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'

export interface Pitch {
  step: PitchStep
  octave: number
  alter?: -2 | -1 | 0 | 1 | 2
}

export type ClefSign = 'G' | 'F' | 'C' | 'percussion' | 'tab'

export interface Clef {
  sign: ClefSign
  line: number
  octaveChange?: number
}

export type KeyMode = 'major' | 'minor'

export interface KeySignature {
  fifths: number
  mode?: KeyMode
}

export interface TimeSignature {
  beats: number
  beatType: number
}

export interface Note {
  type: 'note'
  id: VoiceEventId
  pitch: Pitch
  duration: Duration
  ties?: {
    start?: boolean
    stop?: boolean
  }
}

export interface Rest {
  type: 'rest'
  id: VoiceEventId
  duration: Duration
}

export type VoiceEvent = Note | Rest

export interface Voice {
  id: VoiceId
  events: VoiceEvent[]
}

export interface Measure {
  id: MeasureId
  number: number
  timeSignature: TimeSignature
  keySignature: KeySignature
  clef: Clef
  voices: Voice[]
}

export interface Staff {
  id: StaffId
  measures: Measure[]
}

export interface Part {
  id: PartId
  name: string
  abbreviation?: string
  staves: Staff[]
}

export interface Score {
  id: ScoreId
  title: string
  composer?: string
  parts: Part[]
}

export interface VoiceAddress {
  partId: PartId
  staffId: StaffId
  measureId: MeasureId
  voiceId: VoiceId
}

export type ScoreCommand =
  | {
      type: 'voice-event.insert'
      target: VoiceAddress
      event: VoiceEvent
      index?: number
    }
  | {
      type: 'voice-event.remove'
      target: VoiceAddress
      eventId: VoiceEventId
    }
  | {
      type: 'voice-event.replace'
      target: VoiceAddress
      eventId: VoiceEventId
      event: VoiceEvent
    }

export interface CommandResult {
  score: Score
  undo: ScoreCommand
}
