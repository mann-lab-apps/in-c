import type {
  Clef,
  Duration,
  KeySignature,
  Pitch
} from '../../../score-core'

const durationValues: Record<Duration['value'], string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  '16th': '16',
  '32nd': '32',
  '64th': '64'
}

const accidentalValues: Record<NonNullable<Pitch['alter']>, string> = {
  [-2]: 'bb',
  [-1]: 'b',
  [0]: 'n',
  [1]: '#',
  [2]: '##'
}

export function toVexFlowDuration(duration: Duration, isRest = false): string {
  const baseDuration = durationValues[duration.value]
  return isRest ? `${baseDuration}r` : baseDuration
}

export function toVexFlowKey(pitch: Pitch): string {
  const accidental =
    pitch.alter === undefined || pitch.alter === 0
      ? ''
      : accidentalValues[pitch.alter]
  return `${pitch.step.toLowerCase()}${accidental}/${pitch.octave}`
}

export function toVexFlowAccidental(pitch: Pitch): string | undefined {
  return pitch.alter === undefined ? undefined : accidentalValues[pitch.alter]
}

export function toVexFlowClef(clef: Clef): string {
  switch (clef.sign) {
    case 'G':
      return 'treble'
    case 'F':
      return 'bass'
    case 'C':
      return clef.line >= 4 ? 'tenor' : 'alto'
    case 'percussion':
      return 'percussion'
    case 'tab':
      return 'treble'
  }
}

const majorKeys = [
  'Cb',
  'Gb',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#'
]

const minorKeys = [
  'Abm',
  'Ebm',
  'Bbm',
  'Fm',
  'Cm',
  'Gm',
  'Dm',
  'Am',
  'Em',
  'Bm',
  'F#m',
  'C#m',
  'G#m',
  'D#m',
  'A#m'
]

export function toVexFlowKeySignature(keySignature: KeySignature): string {
  const index = Math.max(-7, Math.min(7, keySignature.fifths)) + 7
  return keySignature.mode === 'minor' ? minorKeys[index] : majorKeys[index]
}
