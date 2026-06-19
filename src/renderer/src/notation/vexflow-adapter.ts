import type { Clef, Duration, Pitch } from '../../../score-core'

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
  const accidental = pitch.alter === undefined ? '' : accidentalValues[pitch.alter]
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
