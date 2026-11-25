import { Clef as VexFlowClef, VexFlow, type Stave } from 'vexflow'
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

export function toVexFlowKey(pitch: Pitch, clef?: Clef): string {
  const accidental =
    pitch.alter === undefined || pitch.alter === 0
      ? ''
      : accidentalValues[pitch.alter]
  return `${pitch.step.toLowerCase()}${accidental}/${pitch.octave - clefDisplayOctave(clef)}`
}

export function toVexFlowAccidental(pitch: Pitch): string | undefined {
  return pitch.alter === undefined ? undefined : accidentalValues[pitch.alter]
}

const clefNamesByLine: Partial<Record<Clef['sign'], Partial<Record<number, string>>>> = {
  G: { 1: 'french', 2: 'treble' },
  F: { 3: 'baritone-f', 4: 'bass', 5: 'subbass' },
  C: { 1: 'soprano', 2: 'mezzo-soprano', 3: 'alto', 4: 'tenor', 5: 'baritone-c' }
}

export function toVexFlowClef(clef: Clef): string {
  const match = clefNamesByLine[clef.sign]?.[clef.line]
  if (match) return match
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

const { Glyphs } = VexFlow
const octaveClefGlyphs: Partial<Record<Clef['sign'], { line: number; glyphs: Partial<Record<number, string>> }>> = {
  G: {
    line: 2, glyphs: {
      [-2]: Glyphs.gClef15mb, [-1]: Glyphs.gClef8vb,
      1: Glyphs.gClef8va, 2: Glyphs.gClef15ma
    }
  },
  F: {
    line: 4, glyphs: {
      [-2]: Glyphs.fClef15mb, [-1]: Glyphs.fClef8vb,
      1: Glyphs.fClef8va, 2: Glyphs.fClef15ma
    }
  },
  C: { line: 4, glyphs: { [-1]: Glyphs.cClef8vb } }
}

function octaveClefGlyph(clef: Clef): string | undefined {
  const variant = octaveClefGlyphs[clef.sign]
  return variant?.line === clef.line ? variant.glyphs[clef.octaveChange ?? 0] : undefined
}

// A transposing clef changes where the stored pitch is written on the staff.
export function clefDisplayOctave(clef?: Clef): number {
  return clef && octaveClefGlyph(clef) ? clef.octaveChange ?? 0 : 0
}

export function sameDisplayedClef(left: Clef, right: Clef): boolean {
  return left.sign === right.sign && left.line === right.line &&
    clefDisplayOctave(left) === clefDisplayOctave(right)
}

export function addVexFlowClef(stave: Stave, clef: Clef): void {
  stave.addClef(toVexFlowClef(clef))
  const glyph = octaveClefGlyph(clef)
  // Keep the VexFlow clef family for key-signature placement and spacing.
  if (glyph) stave.getModifiers(undefined, VexFlowClef.CATEGORY).at(-1)?.setText(glyph)
}

// Rest keys target the same staff lines across pitched clef families.
const restKeysByClef: Partial<Record<string, readonly [whole: string, other: string]>> = {
  french: ['f/5', 'd/5'],
  'baritone-f': ['a/3', 'f/3'],
  bass: ['f/3', 'd/3'],
  subbass: ['d/3', 'b/2'],
  soprano: ['b/4', 'g/4'],
  'mezzo-soprano': ['g/4', 'e/4'],
  alto: ['e/4', 'c/4'],
  tenor: ['c/4', 'a/3'],
  'baritone-c': ['a/3', 'f/3']
}

export function toVexFlowRestKey(clef: Clef, value: Duration['value'] = 'quarter'): string {
  const [whole, other] = restKeysByClef[toVexFlowClef(clef)] ?? ['d/5', 'b/4']
  return value === 'whole' ? whole : other
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
