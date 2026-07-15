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
  suppressEmptyNode: true
})

export function serializeMusicXml(score: Score): string {
  if (score.parts.length !== 1 || score.parts[0].staves.length !== 1) {
    throw new Error('MVP 내보내기는 단일 part와 단일 staff만 지원합니다.')
  }

  const part = score.parts[0]
  const staff = part.staves[0]
  const tieErrors = validateTieRelations(score)
  const slurBoundaries = createSlurBoundaries(score)

  if (tieErrors.length > 0) {
    throw new Error(`잘못된 타이 관계가 있습니다: ${tieErrors.join(', ')}`)
  }

  staff.measures.forEach(validateMeasure)

  const document = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    },
    'score-partwise': {
      '@_version': '4.0',
      work: {
        'work-title': score.title
      },
      ...(score.composer
        ? {
            identification: {
              creator: {
                '@_type': 'composer',
                '#text': score.composer
              }
            }
          }
        : {}),
      'part-list': {
        'score-part': {
          '@_id': part.id,
          'part-name': part.name,
          ...(part.abbreviation
            ? {
                'part-abbreviation': part.abbreviation
              }
            : {})
        }
      },
      part: {
        '@_id': part.id,
        measure: staff.measures.map((measure) => {
          const voice = measure.voices[0]
          const tupletBoundaries = createTupletBoundaries(voice)
          const directions = buildMeasureDirections(score, measure)
          const barlines = buildRepeatBarlines(measure)
          const harmonies = buildMeasureHarmonies(score, measure)

          return {
            '@_number': measure.number,
            ...(measure.timing.type === 'pickup'
              ? {
                  '@_implicit': 'yes'
                }
              : {}),
            attributes: buildAttributes(measure),
            ...(directions.length > 0
              ? {
                  direction: directions
                }
              : {}),
            ...(harmonies.length > 0
              ? {
                  harmony: harmonies
                }
              : {}),
            note: sortVoiceEvents(voice.events).flatMap((event) =>
              buildNoteElements(
                event,
                measure,
                voice,
                tupletBoundaries.get(event.id),
                slurBoundaries.get(event.id)
              )
            ),
            ...(barlines.length > 0
              ? {
                  barline: barlines
                }
              : {})
          }
        })
      }
    }
  }

  return builder.build(document)
}

function buildMeasureHarmonies(score: Score, measure: Measure) {
  return (score.harmonies ?? [])
    .filter((harmony) => harmony.measureId === measure.id)
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
    .filter((event) => event.measureId === measure.id)
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
    ...tempoEventDirections,
    ...octaveShiftDirections,
    ...(score.rehearsalMarks ?? [])
      .filter((mark) => mark.measureId === measure.id)
      .map((mark) => buildRehearsalDirection(mark.text)),
    ...(score.staffTexts ?? [])
      .filter((text) => text.measureId === measure.id)
      .map((text) => buildStaffTextDirection(text.text)),
    ...(score.dynamics ?? [])
      .filter((dynamic) => dynamic.measureId === measure.id)
      .map((dynamic) => buildDynamicDirection(dynamic.value)),
    ...hairpinDirections
  ]
}

function buildTempoDirection(
  tempo: NonNullable<Score['tempo']>,
  offsetTicks?: number
) {
  const beatUnit = tempo.beatUnit ?? 'quarter'
  const dots = Math.max(0, tempo.dots ?? 0)

  return {
    '@_placement': 'above',
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
  const isDown = type.endsWith('vb')

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

function buildRepeatBarlines(measure: Measure) {
  return [
    ...(measure.repeat?.start
      ? [
          {
            '@_location': 'left',
            repeat: {
              '@_direction': 'forward'
            }
          }
        ]
      : []),
    ...(measure.repeat?.end
      ? [
          {
            '@_location': 'right',
            repeat: {
              '@_direction': 'backward',
              ...(measure.repeat.times
                ? {
                    '@_times': measure.repeat.times
                  }
                : {})
            }
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

function buildAttributes(measure: Measure) {
  const clef = clefToMusicXml(measure.clef)

  return {
    divisions,
    key: {
      fifths: measure.keySignature.fifths,
      ...(measure.keySignature.mode
        ? {
            mode: measure.keySignature.mode
          }
        : {})
    },
    time: {
      beats: measure.timeSignature.beats,
      'beat-type': measure.timeSignature.beatType
    },
    staves: 1,
    clef: {
      sign: clef.sign,
      line: clef.line,
      ...(clef.octaveChange !== undefined
        ? {
            'clef-octave-change': clef.octaveChange
          }
        : {})
    }
  }
}

function buildNoteElements(
  event: VoiceEvent,
  measure: Measure,
  voice: Voice,
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
      false,
      tupletBoundary,
      slurBoundary
    )
    const chordNotes = notePitches.slice(1).map((pitch) =>
      buildNote(event, measure, voice, pitch, true)
    )

    return [...graceNotes, mainNote, ...chordNotes]
  }

  return [buildNote(event, measure, voice, undefined, false, tupletBoundary)]
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
    voice: 1,
    type: event.duration.value,
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
          lyric: event.lyrics.map((lyric) => ({
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

function validateMeasure(measure: Measure): void {
  if (measure.voices.length !== 1) {
    throw new Error(
      `MVP 내보내기는 measure ${measure.number}의 단일 voice만 지원합니다.`
    )
  }

  const rhythm = validateMeasureRhythm(measure)
  const tupletErrors = validateVoiceTuplets(measure.voices[0])

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
