import { describe, expect, it } from 'vitest'
import { resolveSlurStemAttachment, resolveSlurBeamStemBounds } from './slur-fermata-spacing'

describe('painted beam edges at slur endpoint stems', () => {
  const stem = { x: 143.9, y: 202.656, width: 1.5, height: 39.094 }
  it('includes the actual sloping beam edge while retaining stem horizontal identity', () => {
    const beams = [{ x: 143.9, y: 201.09, width: 14.8, height: 6.656 }]
    const before = structuredClone({ stem, beams })
    expect(resolveSlurBeamStemBounds(stem, beams)).toEqual({ ...stem, y: 201.09, height: 40.66 })
    expect({ stem, beams }).toEqual(before)
  })
  it('includes the lower edge and multiple touching painted beams', () => {
    const down = { x: 40, y: 100, width: 1.5, height: 35 }
    expect(resolveSlurBeamStemBounds(down, [
      { x: 39, y: 131, width: 15, height: 6 },
      { x: 39, y: 124, width: 15, height: 6 }
    ])).toEqual({ ...down, height: 37 })
  })
  it('ignores other horizontal groups, separated staves and invalid or empty paint', () => {
    expect(resolveSlurBeamStemBounds(stem, [
      { x: 171.5, y: 191.09, width: 14.8, height: 6.656 },
      { x: 143.9, y: 400, width: 14.8, height: 6 },
      { x: 143.9, y: 201, width: 0, height: 6 },
      { x: NaN, y: 201, width: 15, height: 6 }
    ])).toBe(stem)
    const invalid = { ...stem, height: 0 }
    expect(resolveSlurBeamStemBounds(invalid, [])).toBe(invalid)
  })
})

describe('automatic plain-stem slur attachment', () => {
  const input = {
    startY: 233, endY: 218, side: 'above' as const,
    startStemDirection: 1, endStemDirection: 1, manual: false,
    startStem: { x: 143.9, y: 205.25, width: 1.5, height: 36.5 },
    endStem: { x: 185.3, y: 190.25, width: 1.5, height: 36.5 }
  }
  it('uses the measured release-test tips instead of stretching a bow from noteheads', () => {
    const before = structuredClone(input)
    expect(resolveSlurStemAttachment(input)).toEqual({ startY: 197.25, endY: 182.25 })
    expect(input).toEqual(before)
  })
  it('uses the opposite edge when attaching on the lower stem side', () => {
    expect(resolveSlurStemAttachment({ ...input, side: 'below', startY: 170, endY: 170,
      startStemDirection: -1, endStemDirection: -1 })).toEqual({ startY: 249.75, endY: 234.75 })
  })
  it('preserves manual, opposing stems and missing or invalid measurements or directions', () => {
    for (const patch of [{ manual: true }, { startStemDirection: -1, endStemDirection: -1 },
      { startStemDirection: undefined }, { endStemDirection: 0 }, { startStem: undefined }, { endStem: undefined },
      { startStem: { ...input.startStem, width: 0 } }, { endStem: { ...input.endStem, y: NaN } }]) {
      expect(resolveSlurStemAttachment({ ...input, ...patch })).toEqual({ startY: 233, endY: 218 })
    }
  })
  it('keeps positions already beyond the measured tips', () => {
    expect(resolveSlurStemAttachment({ ...input, startY: 190, endY: 180 })).toEqual({ startY: 190, endY: 180 })
  })
  it('independently retains the head-side endpoint for either mixed orientation', () => {
    const before = structuredClone(input)
    expect(resolveSlurStemAttachment({ ...input, startStemDirection: -1 })).toEqual({ startY: 233, endY: 182.25 })
    expect(resolveSlurStemAttachment({ ...input, endStemDirection: -1 })).toEqual({ startY: 197.25, endY: 218 })
    expect(resolveSlurStemAttachment({ ...input, side: 'below', startY: 170, endY: 170,
      startStemDirection: -1, endStemDirection: 1 })).toEqual({ startY: 249.75, endY: 170 })
    expect(input).toEqual(before)
  })
  it('uses actual tips in the reproduced two-system SVG coordinate space', () => {
    expect(resolveSlurStemAttachment({ ...input, startY: 362, endY: 534,
      startStem: { x: 462.58, y: 334.25, width: 1.5, height: 36.5 },
      endStem: { x: 120, y: 506.25, width: 1.5, height: 36.5 }
    })).toEqual({ startY: 326.25, endY: 498.25 })
  })
  it('clears the reproduced mixed-direction start beam without moving the opposing head-side end', () => {
    expect(resolveSlurStemAttachment({ ...input, startY: 233, endY: 193,
      startStemDirection: 1, endStemDirection: -1,
      startStem: { x: 143.9, y: 201.09, width: 1.5, height: 40.66 },
      endStem: { x: 175, y: 200.25, width: 1.5, height: 39.094 }
    })).toEqual({ startY: 193.09, endY: 193 })
  })
})
