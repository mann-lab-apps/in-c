export type ScoreId = string
export type PartId = string
export type StaffId = string
export type MeasureId = string
export type VoiceId = string
export type VoiceEventId = string
export type Tick = number

export interface TimePosition {
  tick: Tick
}

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
  position: TimePosition
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
  position: TimePosition
  duration: Duration
  fullMeasure?: boolean
}

export type VoiceEvent = Note | Rest

export interface TupletGroup {
  id: string
  eventIds: VoiceEventId[]
  actualNotes: number
  normalNotes: number
}

export interface Voice {
  id: VoiceId
  events: VoiceEvent[]
  tuplets?: TupletGroup[]
}

export interface Measure {
  id: MeasureId
  number: number
  timing: MeasureTiming
  timeSignature: TimeSignature
  keySignature: KeySignature
  clef: Clef
  voices: Voice[]
}

export type MeasureTiming =
  | {
      type: 'regular'
    }
  | {
      type: 'pickup'
      durationTicks: Tick
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

export interface TempoMarking {
  bpm: number
  text?: string
}

export interface RehearsalMark {
  id: string
  measureId: MeasureId
  text: string
}

export interface StaffText {
  id: string
  measureId: MeasureId
  text: string
}

export type DynamicValue = 'p' | 'mp' | 'mf' | 'f'

export interface DynamicMark {
  id: string
  measureId: MeasureId
  value: DynamicValue
}

export interface Score {
  id: ScoreId
  title: string
  composer?: string
  tempo?: TempoMarking
  rehearsalMarks?: RehearsalMark[]
  staffTexts?: StaffText[]
  dynamics?: DynamicMark[]
  layout?: ScoreLayout
  parts: Part[]
}

export interface ScoreLayout {
  systemBreakBeforeMeasureIds?: MeasureId[]
  pageBreakBeforeMeasureIds?: MeasureId[]
}

export interface VoiceAddress {
  partId: PartId
  staffId: StaffId
  measureId: MeasureId
  voiceId: VoiceId
}

export interface StaffAddress {
  partId: PartId
  staffId: StaffId
}

export type ScoreCommand =
  | {
      type: 'score-metadata.update'
      title: string
      composer?: string
    }
  | {
      type: 'score-tempo.update'
      tempo?: TempoMarking
    }
  | {
      type: 'score-rehearsal-marks.update'
      rehearsalMarks?: RehearsalMark[]
    }
  | {
      type: 'score-staff-texts.update'
      staffTexts?: StaffText[]
    }
  | {
      type: 'score-dynamics.update'
      dynamics?: DynamicMark[]
    }
  | {
      type: 'score-layout.update'
      layout?: ScoreLayout
    }
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
  | {
      type: 'voice-events.replace'
      target: VoiceAddress
      events: VoiceEvent[]
      editedEventId?: VoiceEventId
    }
  | {
      type: 'voice-content.replace'
      target: VoiceAddress
      events: VoiceEvent[]
      tuplets?: TupletGroup[]
      editedEventId?: VoiceEventId
    }
  | {
      type: 'staff-measure.insert'
      target: StaffAddress
      measure: Measure
      index?: number
    }
  | {
      type: 'staff-measure.remove'
      target: StaffAddress
      measureId: MeasureId
    }
  | {
      type: 'staff-measures.replace'
      target: StaffAddress
      measures: Measure[]
    }
  | {
      type: 'score.batch'
      commands: ScoreCommand[]
    }

export interface CommandResult {
  score: Score
  undo: ScoreCommand
}
