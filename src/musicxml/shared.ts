import type {
  Clef,
  Duration,
  DurationValue,
  KeyMode,
  PitchStep
} from '../score-core'
import {
  TICKS_PER_QUARTER,
  durationToTicks as scoreDurationToTicks
} from '../score-core'

export const supportedDurationValues: DurationValue[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  '16th',
  '32nd',
  '64th'
]

export const divisions = TICKS_PER_QUARTER

export function isDurationValue(value: string): value is DurationValue {
  return supportedDurationValues.includes(value as DurationValue)
}

export function isPitchStep(value: string): value is PitchStep {
  return /^[A-G]$/.test(value)
}

export function isKeyMode(value: string): value is KeyMode {
  return value === 'major' || value === 'minor'
}

export function durationToTicks(duration: Duration): number {
  return scoreDurationToTicks(duration)
}

export function clefToMusicXml(clef: Clef): {
  sign: string
  line: number
  octaveChange?: number
} {
  return {
    sign: clef.sign === 'percussion' ? 'percussion' : clef.sign,
    line: clef.line,
    octaveChange: clef.octaveChange
  }
}

export function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}
