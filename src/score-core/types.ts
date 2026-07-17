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

export interface LyricSyllable {
  number?: number
  syllabic?: 'single' | 'begin' | 'middle' | 'end'
  text: string
  extend?: boolean
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

export type Articulation = 'staccato' | 'accent'
export type BreathMark = 'breath' | 'caesura'

export interface TremoloMark {
  type: 'single'
  marks: 1 | 2 | 3
}

export type Ornament = 'trill' | 'mordent' | 'turn'

export interface GraceNote {
  pitch: Pitch
  slash?: boolean
}

export interface Note {
  type: 'note'
  id: VoiceEventId
  position: TimePosition
  pitch: Pitch
  pitches?: Pitch[]
  duration: Duration
  ties?: {
    start?: boolean
    stop?: boolean
  }
  articulations?: Articulation[]
  fermata?: boolean
  breathMark?: BreathMark
  tremolo?: TremoloMark
  lyrics?: LyricSyllable[]
  graceNotes?: GraceNote[]
  ornaments?: Ornament[]
}

export interface Rest {
  type: 'rest'
  id: VoiceEventId
  position: TimePosition
  duration: Duration
  fullMeasure?: boolean
  fermata?: boolean
  breathMark?: BreathMark
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
  repeat?: RepeatMark
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
  beatUnit?: DurationValue
  dots?: number
  text?: string
  transparent?: boolean
}

export interface TempoEvent extends TempoMarking {
  id: string
  measureId: MeasureId
  tick: Tick
}

export type OctaveShiftType = '8va' | '8vb' | '15ma' | '15mb'

export interface OctaveShift {
  id: string
  startEventId: VoiceEventId
  endEventId: VoiceEventId
  type: OctaveShiftType
}

export interface RepeatMark {
  start?: boolean
  end?: boolean
  times?: number
}

export interface HarmonyMark {
  id: string
  measureId: MeasureId
  tick: Tick
  text: string
  root?: {
    step: PitchStep
    alter?: -2 | -1 | 0 | 1 | 2
  }
  kind?: string
  bass?: {
    step: PitchStep
    alter?: -2 | -1 | 0 | 1 | 2
  }
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

export type HairpinType = 'crescendo' | 'diminuendo'

export interface Hairpin {
  id: string
  startEventId: VoiceEventId
  endEventId: VoiceEventId
  type: HairpinType
}

export interface Slur {
  id: string
  startEventId: VoiceEventId
  endEventId: VoiceEventId
  number?: number
}

export interface Score {
  id: ScoreId
  title: string
  composer?: string
  tempo?: TempoMarking
  tempoEvents?: TempoEvent[]
  octaveShifts?: OctaveShift[]
  harmonies?: HarmonyMark[]
  rehearsalMarks?: RehearsalMark[]
  staffTexts?: StaffText[]
  dynamics?: DynamicMark[]
  hairpins?: Hairpin[]
  slurs?: Slur[]
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
      type: 'score-tempo-events.update'
      tempoEvents?: TempoEvent[]
    }
  | {
      type: 'score-octave-shifts.update'
      octaveShifts?: OctaveShift[]
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
      type: 'score-hairpins.update'
      hairpins?: Hairpin[]
    }
  | {
      type: 'score-slurs.update'
      slurs?: Slur[]
    }
  | {
      type: 'score-harmonies.update'
      harmonies?: HarmonyMark[]
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
