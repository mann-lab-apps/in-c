import { XMLBuilder } from 'fast-xml-parser'

import {
  resolveNotePitch,
  shouldDisplayAccidental,
  sortVoiceEvents,
  validateTieRelations,
  validateMeasureRhythm,
  validateVoiceTuplets,
  voiceEventDurationTicks,
  type Measure,
  type Pitch,
  type RhythmFeelMarking,
  type Score,
  type VoiceEvent,
  type Voice,
} from '../score-core'
import {
  clefToMusicXml,
  divisions,
  durationToTicks
} from './shared'

const builder = new XMLBuilder({
  format: true,
  ignoreAttributes: false,
  preserveOrder: true,
  suppressEmptyNode: true
})
const defaultRhythmFeelText = {
  eighth: '♫ = ³♩ ♪',
  '16th': '♬ = ³♪ 𝅘𝅥𝅯'
} as const satisfies Record<RhythmFeelMarking['unit'], string>

export function serializeMusicXml(score: Score): string {
  const tieErrors = validateTieRelations(score)
  const slurBoundaries = createSlurBoundaries(score)

  if (tieErrors.length > 0) {
    throw new Error(`잘못된 타이 관계가 있습니다: ${tieErrors.join(', ')}`)
  }

  score.parts.forEach((part) => {
    validatePartStructure(part)
    part.staves.forEach((staff) => staff.measures.forEach(validateMeasure))
  })

  const document = [
    xmlElement('?xml', {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    }),
    xmlElement('score-partwise', [
      xmlElement('work', {
        'work-title': score.title
      }),
      ...(score.composer
        ? [
            xmlElement('identification', {
              creator: {
                '@_type': 'composer',
                '#text': score.composer
              }
            })
          ]
        : []),
      xmlElement('part-list', {
        'score-part': score.parts.map((part) => ({
          '@_id': part.id,
          'part-name': part.name,
          ...(part.abbreviation
            ? {
                'part-abbreviation': part.abbreviation
              }
            : {})
        }))
      }),
      ...score.parts.map((part) =>
        xmlElement(
          'part',
          buildPartMeasureElements(score, part, slurBoundaries),
          {
            '@_id': part.id
          }
        )
      )
    ], {
      '@_version': '4.0'
    })
  ]

  return builder.build(document)
}

function validatePartStructure(part: Score['parts'][number]): void {
  if (part.staves.length === 0) {
    throw new Error(`part ${part.id}에 staff가 없습니다.`)
  }

  const measureCount = part.staves[0].measures.length

  if (measureCount === 0) {
    throw new Error(`part ${part.id}에 measure가 없습니다.`)
  }

  part.staves.forEach((staff) => {
    if (staff.measures.length !== measureCount) {
      throw new Error(
        `part ${part.id}의 staff ${staff.id} measure 수가 일치하지 않습니다.`
      )
    }
  })
}

export interface MusicXmlExportWarning {
  code: 'unsupported-layout'
  message: string
  path: string
  measureId?: string
}

export interface MusicXmlExportReport {
  warnings: MusicXmlExportWarning[]
}

export function serializeMusicXmlWithReport(score: Score): {
  contents: string
  report: MusicXmlExportReport
} {
  return {
    contents: serializeMusicXml(score),
    report: {
      warnings: collectUnsupportedMusicXmlExportWarnings(score)
    }
  }
}

function collectUnsupportedMusicXmlExportWarnings(
  score: Score
): MusicXmlExportWarning[] {
  const warnings: MusicXmlExportWarning[] = []

  for (const [index, measureId] of (
    score.layout?.systemBreakBeforeMeasureIds ?? []
  ).entries()) {
    warnings.push({
      code: 'unsupported-layout',
      message:
        'manual system break is not exported to MusicXML yet; use PDF export to preserve printed layout.',
      path: `score.layout.systemBreakBeforeMeasureIds[${index}]`,
      measureId
    })
  }

  for (const [index, measureId] of (
    score.layout?.pageBreakBeforeMeasureIds ?? []
  ).entries()) {
    warnings.push({
      code: 'unsupported-layout',
      message:
        'manual page break is not exported to MusicXML yet; use PDF export to preserve printed layout.',
      path: `score.layout.pageBreakBeforeMeasureIds[${index}]`,
      measureId
    })
  }

  if (score.layout?.pageSetup) {
    warnings.push({
      code: 'unsupported-layout',
      message:
        'PDF page setup is not exported to MusicXML yet; MusicXML consumers may use their own page settings.',
      path: 'score.layout.pageSetup'
    })
  }

  return warnings
}

function buildPartMeasureElements(
  score: Score,
  part: Score['parts'][number],
  slurBoundaries: Map<string, { starts?: string[]; stops?: string[] }>
) {
  const primaryStaff = part.staves[0]

  return primaryStaff.measures.map((_measure, measureIndex) =>
    buildMeasureElement(
      score,
      part.staves.map((staff) => staff.measures[measureIndex]),
      slurBoundaries
    )
  )
}

function buildMeasureElement(
  score: Score,
  measures: Measure[],
  slurBoundaries: Map<string, { starts?: string[]; stops?: string[] }>
) {
  const primaryMeasure = measures[0]
  const directions = buildMeasureDirections(score, primaryMeasure)
  const barlines = buildMeasureBarlines(primaryMeasure)
  const harmonies = buildMeasureHarmonies(score, primaryMeasure)

  return xmlElement(
    'measure',
    [
      xmlElement('attributes', buildAttributes(measures)),
      ...directions.map((direction) => xmlElement('direction', direction)),
      ...harmonies.map((harmony) => xmlElement('harmony', harmony)),
      ...buildStaffPlaybackElements(measures, slurBoundaries),
      ...barlines.map((barline) => xmlElement('barline', barline))
    ],
    {
      '@_number': primaryMeasure.number,
      ...(primaryMeasure.timing.type === 'pickup'
        ? {
            '@_implicit': 'yes'
          }
        : {})
    }
  )
}

function buildStaffPlaybackElements(
  measures: Measure[],
  slurBoundaries: Map<string, { starts?: string[]; stops?: string[] }>
) {
  const cursor = {
    currentCursorTicks: 0
  }

  return measures.flatMap((measure, staffIndex) =>
    buildMeasurePlaybackElements(
      measure,
      slurBoundaries,
      measures.length > 1 ? staffIndex + 1 : undefined,
      cursor
    )
  )
}

function buildMeasurePlaybackElements(
  measure: Measure,
  slurBoundaries: Map<string, { starts?: string[]; stops?: string[] }>,
  staffNumber: number | undefined,
  cursor: {
    currentCursorTicks: number
  }
) {
  const tupletBoundariesByVoice = new Map(
    measure.voices.map((voice) => [voice.id, createTupletBoundaries(voice)])
  )

  return sortScoreVoices(measure.voices).flatMap((voice, voiceIndex) => {
    const voiceEvents = sortVoiceEvents(voice.events)
    const voiceElements = voiceEvents.flatMap((event) =>
      buildNoteElements(
        event,
        measure,
        voice,
        readMusicXmlVoiceNumber(voice.id),
        staffNumber,
        tupletBoundariesByVoice.get(voice.id)?.get(event.id),
        slurBoundaries.get(event.id)
      ).map((noteElement) => xmlElement('note', noteElement))
    )
    const voiceEndTick = readVoiceEndTick(measure, voice)
    const prefix =
      (voiceIndex > 0 || staffNumber !== undefined) &&
      cursor.currentCursorTicks > 0
        ? [
            xmlElement('backup', {
              duration: cursor.currentCursorTicks
            })
          ]
        : []

    cursor.currentCursorTicks = voiceEndTick

    return [...prefix, ...voiceElements]
  })
}

function buildMeasureHarmonies(score: Score, measure: Measure) {
  return (score.harmonies ?? [])
    .filter((harmony) => matchesMeasureReference(harmony.measureId, measure))
    .map((harmony) => ({
      ...(harmony.root
        ? {
            root: {
              'root-step': harmony.root.step,
              ...(harmony.root.alter !== undefined
                ? {
                    'root-alter': harmony.root.alter
                  }
                : {})
            }
          }
        : {}),
      kind: {
        '#text': harmony.text,
        '@_text': harmony.text,
        ...(harmony.kind
          ? {
              '@_value': harmony.kind
            }
          : {})
      },
      ...(harmony.bass
        ? {
            bass: {
              'bass-step': harmony.bass.step,
              ...(harmony.bass.alter !== undefined
                ? {
                    'bass-alter': harmony.bass.alter
                  }
                : {})
            }
          }
        : {}),
      ...(harmony.tick > 0
        ? {
            offset: harmony.tick
          }
        : {})
    }))
}

function buildMeasureDirections(score: Score, measure: Measure) {
  const tempoEventDirections = (score.tempoEvents ?? [])
    .filter((event) => matchesMeasureReference(event.measureId, measure))
    .map((event) => buildTempoDirection(event, event.tick))
  const octaveShiftDirections = (score.octaveShifts ?? []).flatMap((shift) => {
    const directions = []

    if (measureHasEvent(measure, shift.startEventId)) {
      directions.push(buildOctaveShiftDirection(shift.type, 'start'))
    }

    if (measureHasEvent(measure, shift.endEventId)) {
      directions.push(buildOctaveShiftDirection(shift.type, 'stop'))
    }

    return directions
  })
  const hairpinDirections = (score.hairpins ?? []).flatMap((hairpin) => {
    const directions = []

    if (measureHasEvent(measure, hairpin.startEventId)) {
      directions.push(buildHairpinDirection(hairpin.type))
    }

    if (measureHasEvent(measure, hairpin.endEventId)) {
      directions.push(buildHairpinDirection('stop'))
    }

    return directions
  })

  return [
    ...(measure.number === 1 && score.tempo
      ? [buildTempoDirection(score.tempo)]
      : []),
    ...(measure.number === 1 && score.rhythmFeel
      ? [buildRhythmFeelDirection(score.rhythmFeel)]
      : []),
    ...tempoEventDirections,
    ...octaveShiftDirections,
    ...(score.rehearsalMarks ?? [])
      .filter((mark) => matchesMeasureReference(mark.measureId, measure))
      .map((mark) => buildRehearsalDirection(mark.text)),
    ...(score.staffTexts ?? [])
      .filter((text) => matchesMeasureReference(text.measureId, measure))
      .map((text) => buildStaffTextDirection(text.text)),
    ...(score.systemTexts ?? [])
      .filter((text) => matchesMeasureReference(text.measureId, measure))
      .map((text) => buildSystemTextDirection(text.text)),
    ...(score.expressionTexts ?? [])
      .filter((text) => matchesMeasureReference(text.measureId, measure))
      .map((text) => buildExpressionTextDirection(text.text, text.tick)),
    ...(score.dynamics ?? [])
      .filter((dynamic) => matchesMeasureReference(dynamic.measureId, measure))
      .map((dynamic) => buildDynamicDirection(dynamic.value)),
    ...hairpinDirections
  ]
}

function matchesMeasureReference(measureId: string, measure: Measure): boolean {
  return measureId === measure.id || measureId === `measure-${measure.number}`
}

function buildRhythmFeelDirection(rhythmFeel: RhythmFeelMarking) {
  return {
    '@_placement': 'above',
    'direction-type': {
      words: rhythmFeel.text ?? defaultRhythmFeelText[rhythmFeel.unit]
    }
  }
}

function buildTempoDirection(
  tempo: NonNullable<Score['tempo']>,
  offsetTicks?: number
) {
  const beatUnit = tempo.beatUnit ?? 'quarter'
  const dots = Math.max(0, tempo.dots ?? 0)

  return {
    '@_placement': 'above',
    ...(tempo.transparent
      ? {
          '@_print-object': 'no'
        }
      : {}),
    'direction-type': {
      ...(tempo.text
        ? {
            words: tempo.text
          }
        : {}),
      metronome: {
        'beat-unit': beatUnit,
        ...(dots > 0
          ? {
              'beat-unit-dot': Array.from({ length: dots }, () => '')
            }
          : {}),
        'per-minute': tempo.bpm
      }
    },
    ...(offsetTicks && offsetTicks > 0
      ? {
          offset: offsetTicks
        }
      : {}),
    sound: {
      '@_tempo': tempo.bpm
    }
  }
}

function buildOctaveShiftDirection(
  type: NonNullable<Score['octaveShifts']>[number]['type'],
  markerType: 'start' | 'stop'
) {
  const isDown = type === '8vb' || type === '15mb'

  return {
    '@_placement': isDown ? 'below' : 'above',
    'direction-type': {
      'octave-shift': {
        '@_type': markerType === 'stop' ? 'stop' : isDown ? 'down' : 'up',
        '@_size': type.startsWith('15') ? 15 : 8
      }
    }
  }
}

function buildRehearsalDirection(text: string) {
  return {
    '@_placement': 'above',
    'direction-type': {
      rehearsal: {
        '#text': text
      }
    }
  }
}

function buildStaffTextDirection(text: string) {
  return {
    '@_placement': 'above',
    'direction-type': {
      words: {
        '#text': text
      }
    }
  }
}

function buildSystemTextDirection(text: string) {
  return {
    '@_placement': 'above',
    '@_system': 'yes',
    'direction-type': {
      words: {
        '#text': text,
        '@_font-weight': 'bold'
      }
    }
  }
}

function buildExpressionTextDirection(text: string, tick: number) {
  return {
    '@_placement': 'below',
    'direction-type': {
      words: {
        '#text': text,
        '@_font-style': 'italic'
      }
    },
    ...(tick > 0
      ? {
          offset: tick
        }
      : {})
  }
}

function buildDynamicDirection(value: string) {
  return {
    '@_placement': 'below',
    'direction-type': {
      dynamics: {
        [value]: ''
      }
    }
  }
}

function buildHairpinDirection(type: string) {
  return {
    '@_placement': 'below',
    'direction-type': {
      wedge: {
        '@_type': type
      }
    }
  }
}

function buildMeasureBarlines(measure: Measure) {
  return [
    ...(measure.repeat?.start || measure.volta?.start
      ? [
          {
            '@_location': 'left',
            ...(measure.volta?.start
              ? {
                  ending: {
                    '@_number': measure.volta.number,
                    '@_type': 'start'
                  }
                }
              : {}),
            ...(measure.repeat?.start
              ? {
                  repeat: {
                    '@_direction': 'forward'
                  }
                }
              : {})
          }
        ]
      : []),
    ...(measure.repeat?.end || measure.volta?.end
      ? [
          {
            '@_location': 'right',
            ...(measure.volta?.end
              ? {
                  ending: {
                    '@_number': measure.volta.number,
                    '@_type': 'stop'
                  }
                }
              : {}),
            ...(measure.repeat?.end
              ? {
                  repeat: {
                    '@_direction': 'backward',
                    ...(measure.repeat.times
                      ? {
                          '@_times': measure.repeat.times
                        }
                      : {})
                  }
                }
              : {})
          }
        ]
      : [])
  ]
}

function measureHasEvent(measure: Measure, eventId: string): boolean {
  return measure.voices.some((voice) =>
    voice.events.some((event) => event.id === eventId)
  )
}

function buildAttributes(measures: Measure[]) {
  const primaryMeasure = measures[0]
  const clefs = measures.map((measure) => clefToMusicXml(measure.clef))

  return {
    divisions,
    key: {
      fifths: primaryMeasure.keySignature.fifths,
      ...(primaryMeasure.keySignature.mode
        ? {
            mode: primaryMeasure.keySignature.mode
          }
        : {})
    },
    time: {
      beats: primaryMeasure.timeSignature.beats,
      'beat-type': primaryMeasure.timeSignature.beatType
    },
    staves: measures.length,
    clef:
      measures.length === 1
        ? buildClefAttributes(clefs[0])
        : clefs.map((clef, index) => ({
            '@_number': index + 1,
            ...buildClefAttributes(clef)
          }))
  }
}

function buildClefAttributes(clef: ReturnType<typeof clefToMusicXml>) {
  return {
    sign: clef.sign,
    line: clef.line,
    ...(clef.octaveChange !== undefined
      ? {
          'clef-octave-change': clef.octaveChange
        }
      : {})
  }
}

function buildNoteElements(
  event: VoiceEvent,
  measure: Measure,
  voice: Voice,
  voiceNumber: number,
  staffNumber: number | undefined,
  tupletBoundary?: {
    start?: boolean
    stop?: boolean
  },
  slurBoundary?: {
    starts?: string[]
    stops?: string[]
  }
): unknown[] {
  if (event.type === 'note') {
    const notePitches = event.pitches?.length
      ? event.pitches
      : [resolveNotePitch(measure, voice, event)]
    const graceNotes = (event.graceNotes ?? []).map((graceNote) =>
      buildGraceNote(graceNote)
    )
    const mainNote = buildNote(
      event,
      measure,
      voice,
      notePitches[0],
      voiceNumber,
      staffNumber,
      false,
      tupletBoundary,
      slurBoundary
    )
    const chordNotes = notePitches.slice(1).map((pitch) =>
      buildNote(event, measure, voice, pitch, voiceNumber, staffNumber, true)
    )

    return [...graceNotes, mainNote, ...chordNotes]
  }

  return [
    buildNote(
      event,
      measure,
      voice,
      undefined,
      voiceNumber,
      staffNumber,
      false,
      tupletBoundary
    )
  ]
}

function readVoiceEndTick(measure: Measure, voice: Voice): number {
  return sortVoiceEvents(voice.events).reduce(
    (endTick, event) =>
      Math.max(
        endTick,
        event.position.tick + voiceEventDurationTicks(event, measure)
      ),
    0
  )
}

function buildGraceNote(graceNote: NonNullable<Extract<VoiceEvent, { type: 'note' }>['graceNotes']>[number]) {
  return {
    grace: graceNote.slash
      ? {
          '@_slash': 'yes'
        }
      : '',
    pitch: {
      step: graceNote.pitch.step,
      ...(graceNote.pitch.alter !== undefined
        ? {
            alter: graceNote.pitch.alter
          }
        : {}),
      octave: graceNote.pitch.octave
    },
    type: 'eighth'
  }
}

function buildNote(
  event: VoiceEvent,
  measure: Measure,
  voice: Voice,
  pitch: Pitch | undefined,
  voiceNumber: number,
  staffNumber: number | undefined,
  isChordTone: boolean,
  tupletBoundary?: {
    start?: boolean
    stop?: boolean
  },
  slurBoundary?: {
    starts?: string[]
    stops?: string[]
  }
) {
  const dots = Array.from({ length: event.duration.dots }, () => '')
  const isFullMeasureRest = event.type === 'rest' && event.fullMeasure
  const displaysAccidental =
    event.type === 'note' &&
    !event.ties?.stop &&
    shouldDisplayAccidental(measure, voice, event)
  const tieTypes =
    event.type === 'note'
      ? [
          ...(event.ties?.stop ? ['stop'] as const : []),
          ...(event.ties?.start ? ['start'] as const : [])
        ]
      : []
  const notationTuplets = [
    ...(tupletBoundary?.start ? ['start'] as const : []),
    ...(tupletBoundary?.stop ? ['stop'] as const : [])
  ]
  const notationSlurs = [
    ...(slurBoundary?.starts ?? []).map((number) => ({
      number,
      type: 'start' as const
    })),
    ...(slurBoundary?.stops ?? []).map((number) => ({
      number,
      type: 'stop' as const
    }))
  ]
  const articulations =
    event.type === 'note' ? event.articulations ?? [] : []
  const articulationNotations = [
    ...articulations,
    ...(event.breathMark === 'breath' ? ['breath-mark'] : []),
    ...(event.breathMark === 'caesura' ? ['caesura'] : [])
  ]
  const ornamentNotations =
    event.type === 'note'
      ? {
          ...(event.tremolo
            ? {
                tremolo: {
                  '@_type': 'single',
                  '#text': event.tremolo.marks
                }
              }
            : {}),
          ...(event.ornaments ?? []).reduce<Record<string, string>>(
            (values, ornament) => ({
              ...values,
              [ornament]: ''
            }),
            {}
          )
        }
      : {}
  const hasOrnaments = Object.keys(ornamentNotations).length > 0
  const hasFermata = Boolean(event.fermata)
  const hasNotations =
    tieTypes.length > 0 ||
    notationTuplets.length > 0 ||
    notationSlurs.length > 0 ||
    articulationNotations.length > 0 ||
    hasOrnaments ||
    hasFermata

  return {
    ...(event.type === 'rest'
      ? {
          rest: isFullMeasureRest
            ? {
                '@_measure': 'yes'
              }
            : ''
        }
      : {
          ...(isChordTone
            ? {
                chord: ''
              }
            : {}),
          pitch: {
            step: pitch!.step,
            ...(pitch!.alter !== 0 ||
            event.pitch.alter === 0 ||
            displaysAccidental
              ? {
                  alter: pitch!.alter
                }
              : {}),
            octave: pitch!.octave
          },
          ...(displaysAccidental
            ? {
                accidental: toMusicXmlAccidental(pitch!.alter!)
              }
            : {}),
          ...(tieTypes.length > 0
            ? {
                tie: tieTypes.map((type) => ({
                  '@_type': type
                }))
              }
            : {})
        }),
    duration: isFullMeasureRest
      ? voiceEventDurationTicks(event, measure)
      : durationToTicks(event.duration),
    voice: voiceNumber,
    type: event.duration.value,
    ...(staffNumber !== undefined
      ? {
          staff: staffNumber
        }
      : {}),
    ...(event.duration.tuplet
      ? {
          'time-modification': {
            'actual-notes': event.duration.tuplet.actualNotes,
            'normal-notes': event.duration.tuplet.normalNotes
          }
        }
      : {}),
    ...(hasNotations
      ? {
          notations: {
            ...(tieTypes.length > 0
              ? {
                  tied: tieTypes.map((type) => ({
                    '@_type': type
                  }))
                }
              : {}),
            ...(notationTuplets.length > 0
              ? {
                  tuplet: notationTuplets.map((type) => ({
                    '@_type': type
                  }))
                }
              : {}),
            ...(notationSlurs.length > 0
              ? {
                  slur: notationSlurs.map(({ number, type }) => ({
                    '@_type': type,
                    '@_number': number
                  }))
                }
              : {}),
            ...(articulationNotations.length > 0
              ? {
                  articulations: Object.fromEntries(
                    articulationNotations.map((articulation) => [articulation, ''])
                  )
                }
              : {}),
            ...(hasOrnaments
              ? {
                  ornaments: ornamentNotations
                }
              : {}),
            ...(hasFermata
              ? {
                  fermata: ''
                }
              : {})
          }
        }
      : {}),
    ...(dots.length > 0
      ? {
          dot: dots
        }
      : {}),
    ...(event.type === 'note' && event.lyrics?.length && !isChordTone
      ? {
          lyric: sortLyricsByNumber(event.lyrics).map((lyric) => ({
            ...(lyric.number !== undefined
              ? {
                  '@_number': lyric.number
                }
              : {}),
            ...(lyric.syllabic
              ? {
                  syllabic: lyric.syllabic
                }
              : {}),
            text: lyric.text,
            ...(lyric.extend
              ? {
                  extend: ''
                }
              : {})
          }))
        }
      : {})
  }
}

function createTupletBoundaries(
  voice: Voice
): Map<string, { start?: boolean; stop?: boolean }> {
  const boundaries = new Map<string, { start?: boolean; stop?: boolean }>()

  for (const group of voice.tuplets ?? []) {
    const firstId = group.eventIds[0]
    const lastId = group.eventIds.at(-1)

    if (!firstId || !lastId) {
      continue
    }

    boundaries.set(firstId, {
      ...boundaries.get(firstId),
      start: true
    })
    boundaries.set(lastId, {
      ...boundaries.get(lastId),
      stop: true
    })
  }

  return boundaries
}

function createSlurBoundaries(
  score: Score
): Map<string, { starts?: string[]; stops?: string[] }> {
  const boundaries = new Map<string, { starts?: string[]; stops?: string[] }>()

  ;(score.slurs ?? []).forEach((slur, index) => {
    const number = String(slur.number ?? index + 1)
    const startBoundary = boundaries.get(slur.startEventId)
    const stopBoundary = boundaries.get(slur.endEventId)

    boundaries.set(slur.startEventId, {
      ...startBoundary,
      starts: [...(startBoundary?.starts ?? []), number]
    })
    boundaries.set(slur.endEventId, {
      ...stopBoundary,
      stops: [...(stopBoundary?.stops ?? []), number]
    })
  })

  return boundaries
}

function toMusicXmlAccidental(
  alter: NonNullable<Pitch['alter']>
): string {
  switch (alter) {
    case -2:
      return 'flat-flat'
    case -1:
      return 'flat'
    case 0:
      return 'natural'
    case 1:
      return 'sharp'
    case 2:
      return 'double-sharp'
  }
}

function sortLyricsByNumber(
  lyrics: NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']>
): NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']> {
  return [...lyrics].sort(
    (left, right) => (left.number ?? 1) - (right.number ?? 1)
  )
}

function validateMeasure(measure: Measure): void {
  const rhythm = validateMeasureRhythm(measure)
  const tupletErrors = measure.voices.flatMap((voice) =>
    validateVoiceTuplets(voice)
  )

  if (!rhythm.isExact) {
    throw new Error(
      `measure ${measure.number}의 리듬 정합성이 올바르지 않습니다: ${rhythm.status}`
    )
  }

  if (tupletErrors.length > 0) {
    throw new Error(
      `measure ${measure.number}의 tuplet 관계가 올바르지 않습니다: ${tupletErrors.join(', ')}`
    )
  }
}

function sortScoreVoices(voices: Voice[]): Voice[] {
  return [...voices].sort(
    (left, right) =>
      readMusicXmlVoiceNumber(left.id) - readMusicXmlVoiceNumber(right.id) ||
      left.id.localeCompare(right.id)
  )
}

function xmlElement(
  name: string,
  value: unknown,
  attributes: Record<string, unknown> = {}
) {
  const content = readXmlElementContent(value)
  const attrs = {
    ...content.attributes,
    ...attributes
  }
  const element: Record<string, unknown> = {
    [name]: content.children
  }

  if (Object.keys(attrs).length > 0) {
    element[':@'] = attrs
  }

  return element
}

function readXmlElementContent(value: unknown): {
  attributes: Record<string, unknown>
  children: unknown[]
} {
  if (value === undefined || value === null || value === '') {
    return {
      attributes: {},
      children: []
    }
  }

  if (Array.isArray(value)) {
    return {
      attributes: {},
      children: value
    }
  }

  if (typeof value !== 'object') {
    return {
      attributes: {},
      children: [
        {
          '#text': value
        }
      ]
    }
  }

  const attributes: Record<string, unknown> = {}
  const children: unknown[] = []

  Object.entries(value as Record<string, unknown>).forEach(([key, childValue]) => {
    if (childValue === undefined || childValue === null) {
      return
    }

    if (key.startsWith('@_')) {
      attributes[key] = childValue
      return
    }

    if (key === '#text') {
      children.push({
        '#text': childValue
      })
      return
    }

    if (Array.isArray(childValue)) {
      childValue.forEach((item) => {
        if (item === undefined || item === null) {
          return
        }

        children.push(xmlElement(key, item))
      })
      return
    }

    children.push(xmlElement(key, childValue))
  })

  return {
    attributes,
    children
  }
}

function readMusicXmlVoiceNumber(voiceId: string): number {
  const match = /^voice-(\d+)$/.exec(voiceId)

  return match ? Number(match[1]) : 1
}
