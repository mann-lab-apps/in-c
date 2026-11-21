import type { TimeSignature } from '../../../score-core'

// Existing portable project limits. No additive display or global re-barring policy.
export const customMeterDenominators = [1, 2, 4, 8, 16, 32, 64] as const
export function parseCustomTimeSignature(beats: string, beatType: string): TimeSignature | undefined {
  const numerator = Number(beats), denominator = Number(beatType)
  return beats.trim() && Number.isInteger(numerator) && numerator >= 1 && numerator <= 128 &&
    customMeterDenominators.some(value => value === denominator)
    ? { beats: numerator, beatType: denominator } : undefined
}
