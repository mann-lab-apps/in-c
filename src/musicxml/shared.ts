import type {
  Clef,
  Duration,
  DurationValue,
  KeyMode,
  PitchStep
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

export const durationTicks: Record<DurationValue, number> = {
  whole: 512,
  half: 256,
  quarter: 128,
  eighth: 64,
  '16th': 32,
  '32nd': 16,
  '64th': 8
}

export const divisions = 128

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
  const baseTicks = durationTicks[duration.value]
  let multiplier = 1

  for (let dotIndex = 1; dotIndex <= duration.dots; dotIndex += 1) {
    multiplier += 1 / 2 ** dotIndex
  }

  return baseTicks * multiplier
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
