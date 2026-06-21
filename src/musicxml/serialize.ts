import { XMLBuilder } from 'fast-xml-parser'

import {
  resolveNotePitch,
  shouldDisplayAccidental,
  sortVoiceEvents,
  validateMeasureRhythm,
  voiceEventDurationTicks,
  type Measure,
  type Pitch,
  type Score,
  type Voice,
  type VoiceEvent
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

          return {
            '@_number': measure.number,
            ...(measure.timing.type === 'pickup'
              ? {
                  '@_implicit': 'yes'
                }
              : {}),
            attributes: buildAttributes(measure),
            note: sortVoiceEvents(voice.events).map((event) =>
              buildNote(event, measure, voice)
            )
          }
        })
      }
    }
  }

  return builder.build(document)
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

function buildNote(event: VoiceEvent, measure: Measure, voice: Voice) {
  const dots = Array.from({ length: event.duration.dots }, () => '')
  const isFullMeasureRest = event.type === 'rest' && event.fullMeasure
  const pitch =
    event.type === 'note' ? resolveNotePitch(measure, voice, event) : undefined
  const displaysAccidental =
    event.type === 'note' &&
    shouldDisplayAccidental(measure, voice, event)

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
            : {})
        }),
    duration: isFullMeasureRest
      ? voiceEventDurationTicks(event, measure)
      : durationToTicks(event.duration),
    voice: 1,
    type: event.duration.value,
    ...(dots.length > 0
      ? {
          dot: dots
        }
      : {})
  }
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

  if (measure.clef.sign !== 'G') {
    throw new Error('MVP 내보내기는 높은음자리표(G clef)만 지원합니다.')
  }

  const rhythm = validateMeasureRhythm(measure)

  if (!rhythm.isExact) {
    throw new Error(
      `measure ${measure.number}의 리듬 정합성이 올바르지 않습니다: ${rhythm.status}`
    )
  }
}
