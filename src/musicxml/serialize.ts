import { XMLBuilder } from 'fast-xml-parser'

import type { Measure, Score, VoiceEvent } from '../score-core'
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
        measure: staff.measures.map((measure) => ({
          '@_number': measure.number,
          attributes: buildAttributes(measure),
          note: measure.voices[0].events.map(buildNote)
        }))
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

function buildNote(event: VoiceEvent) {
  const dots = Array.from({ length: event.duration.dots }, () => '')

  return {
    ...(event.type === 'rest'
      ? {
          rest: ''
        }
      : {
          pitch: {
            step: event.pitch.step,
            ...(event.pitch.alter !== undefined
              ? {
                  alter: event.pitch.alter
                }
              : {}),
            octave: event.pitch.octave
          }
        }),
    duration: durationToTicks(event.duration),
    voice: 1,
    type: event.duration.value,
    ...(dots.length > 0
      ? {
          dot: dots
        }
      : {})
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
}
