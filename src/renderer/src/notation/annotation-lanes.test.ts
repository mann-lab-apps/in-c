import { describe, expect, it } from 'vitest'

import {
  createDuration,
  createMeasure,
  createNote,
  createTimePosition,
  createVoice
} from '../../../score-core'
import {
  countMeasureLyricLines,
  resolveAnnotationVerticalExtension,
  resolveAnnotationSystemTop,
  resolveHairpinSpanYOffset,
  resolveSlurSideForAnnotationLanes,
  resolveMeasureAnnotationLanes
} from './annotation-lanes'

describe('annotation lanes', () => {
  it('reserves header space and tempo lanes above rehearsal and system text even without harmonies', () => {
    const lanes = resolveMeasureAnnotationLanes({
      hasRehearsalMark: true,
      systemTextCount: 2,
      tempoCount: 2
    })
    expect(lanes.rehearsalMarkYOffset).toBeLessThan(lanes.systemTextYOffsets[0]!)
    expect(lanes.tempoYOffsets[0]).toBeLessThan(lanes.rehearsalMarkYOffset! - 12)
    expect(lanes.tempoYOffsets[0]! - lanes.tempoYOffsets[1]!).toBe(24)
    const top = resolveAnnotationSystemTop(72, [lanes], true)
    expect(top - lanes.requiredAbove).toBeGreaterThanOrEqual(60)
    expect(resolveAnnotationSystemTop(72, [resolveMeasureAnnotationLanes({})], false)).toBe(72)
  })

  it('layout.annotation-lanes keeps lower marks below lyrics without collisions', () => {
    const lanes = resolveMeasureAnnotationLanes({
      expressionTextCount: 1,
      hasDynamic: true,
      hasHairpin: true,
      lyricLineCount: 2
    })

    expect(lanes.dynamicMarkYOffset).toBeGreaterThan(145)
    expect(lanes.hairpinYOffset).toBeGreaterThan(lanes.dynamicMarkYOffset!)
    expect(lanes.expressionTextYOffsets[0]).toBeGreaterThan(
      lanes.hairpinYOffset!
    )
    expect(lanes.requiredBelow).toBeGreaterThan(154)
  })

  it('layout.annotation-lanes stacks upper text, rehearsal marks, harmonies, and staff text', () => {
    const lanes = resolveMeasureAnnotationLanes({
      harmonyCount: 1,
      hasRehearsalMark: true,
      hasStaffText: true,
      systemTextCount: 2
    })

    expect(lanes.systemTextYOffsets).toEqual([-100, -84])
    expect(lanes.rehearsalMarkYOffset).toBe(-144)
    expect(lanes.harmonyMarkYOffsets).toEqual([-30])
    expect(lanes.staffTextYOffset).toBe(-14)
    expect(lanes.requiredAbove).toBeGreaterThan(100)
  })

  it('layout.annotation-lanes keeps dense chord symbols from colliding with staff text', () => {
    const lanes = resolveMeasureAnnotationLanes({
      harmonyCount: 2,
      hasRehearsalMark: true,
      hasStaffText: true
    })

    expect(lanes.rehearsalMarkYOffset).toBe(-90)
    expect(lanes.harmonyMarkYOffsets).toEqual([-46, -30])
    expect(lanes.staffTextYOffset).toBe(-14)
    expect(new Set([
      lanes.rehearsalMarkYOffset,
      ...lanes.harmonyMarkYOffsets,
      lanes.staffTextYOffset
    ])).toHaveLength(4)
    expect(
      lanes.harmonyMarkYOffsets[1] - lanes.harmonyMarkYOffsets[0]
    ).toBeGreaterThanOrEqual(16)
    expect(
      lanes.staffTextYOffset! - lanes.harmonyMarkYOffsets[1]
    ).toBeGreaterThanOrEqual(16)
  })

  it('layout.annotation-lanes raises rehearsal marks for very dense chord symbol lanes', () => {
    const lanes = resolveMeasureAnnotationLanes({
      harmonyCount: 3,
      hasRehearsalMark: true,
      hasStaffText: true
    })

    expect(lanes.rehearsalMarkYOffset).toBe(-106)
    expect(lanes.harmonyMarkYOffsets).toEqual([-62, -46, -30])
    expect(lanes.staffTextYOffset).toBe(-14)
    expect(new Set([
      lanes.rehearsalMarkYOffset,
      ...lanes.harmonyMarkYOffsets,
      lanes.staffTextYOffset
    ])).toHaveLength(5)
    expect(
      lanes.harmonyMarkYOffsets[0] - lanes.rehearsalMarkYOffset!
    ).toBeGreaterThanOrEqual(16)
    expect(
      lanes.staffTextYOffset! - lanes.harmonyMarkYOffsets.at(-1)!
    ).toBeGreaterThanOrEqual(16)
  })

  it('layout.annotation-lanes reports extra system space for dense annotations', () => {
    const extension = resolveAnnotationVerticalExtension([
      resolveMeasureAnnotationLanes({
        expressionTextCount: 2,
        hasDynamic: true,
        hasHairpin: true,
        lyricLineCount: 3
      }),
      resolveMeasureAnnotationLanes({
        systemTextCount: 2
      })
    ])

    expect(extension.above).toBeGreaterThan(0)
    expect(extension.below).toBeGreaterThan(0)
  })

  it('layout.annotation-lanes covers a dense solo collision fixture across upper and lower objects', () => {
    const lanes = resolveMeasureAnnotationLanes({
      expressionTextCount: 2,
      harmonyCount: 3,
      hasDynamic: true,
      hasHairpin: true,
      hasRehearsalMark: true,
      hasStaffText: true,
      lyricLineCount: 3,
      systemTextCount: 2
    })

    const upperOffsets = [
      ...lanes.systemTextYOffsets,
      lanes.rehearsalMarkYOffset!,
      ...lanes.harmonyMarkYOffsets,
      lanes.staffTextYOffset!
    ].sort((left, right) => left - right)
    const lowerOffsets = [
      lanes.dynamicMarkYOffset!,
      lanes.hairpinYOffset!,
      ...lanes.expressionTextYOffsets
    ]

    expect(upperOffsets).toEqual([-144, -100, -84, -62, -46, -30, -14])
    expect(
      upperOffsets.every(
        (offset, index) => index === 0 || offset - upperOffsets[index - 1]! >= 16
      )
    ).toBe(true)
    expect(
      lowerOffsets.every(
        (offset, index) => index === 0 || offset - lowerOffsets[index - 1]! >= 20
      )
    ).toBe(true)
    expect(lanes.dynamicMarkYOffset).toBeGreaterThan(175)
    expect(lanes.hairpinYOffset).toBeGreaterThan(lanes.dynamicMarkYOffset!)
    expect(lanes.expressionTextYOffsets[0]).toBeGreaterThan(
      lanes.hairpinYOffset!
    )
    expect(lanes.requiredAbove).toBeGreaterThan(100)
    expect(lanes.requiredBelow).toBeGreaterThan(220)
  })

  it('layout.annotation-lanes keeps long hairpins below lyrics and dynamics across the span', () => {
    const sparseStart = resolveMeasureAnnotationLanes({
      hasHairpin: true
    })
    const denseEnd = resolveMeasureAnnotationLanes({
      hasDynamic: true,
      hasHairpin: true,
      lyricLineCount: 2
    })

    expect(resolveHairpinSpanYOffset([sparseStart, denseEnd])).toBe(
      denseEnd.hairpinYOffset
    )
    expect(denseEnd.hairpinYOffset).toBeGreaterThan(
      denseEnd.dynamicMarkYOffset!
    )
    expect(denseEnd.hairpinYOffset).toBeGreaterThan(175)
  })

  it('layout.annotation-lanes moves lower slurs away from lyric/dynamic lanes', () => {
    const lowerAnnotations = resolveMeasureAnnotationLanes({
      expressionTextCount: 1,
      hasDynamic: true,
      lyricLineCount: 1
    })

    expect(
      resolveSlurSideForAnnotationLanes('below', [lowerAnnotations])
    ).toBe('above')
    expect(resolveSlurSideForAnnotationLanes('below', [])).toBe('below')
    expect(
      resolveSlurSideForAnnotationLanes('above', [lowerAnnotations])
    ).toBe('above')
  })

  it('layout.annotation-lanes counts the deepest lyric verse in a measure', () => {
    const measure = createMeasure({
      voices: [
        createVoice({
          events: [
            createNote({
              id: 'lyric-note',
              position: createTimePosition(0),
              pitch: { step: 'C', octave: 4 },
              duration: createDuration('quarter'),
              lyrics: [
                { number: 1, text: 'la' },
                { number: 3, text: 'da' }
              ]
            })
          ]
        })
      ]
    })

    expect(countMeasureLyricLines(measure)).toBe(3)
  })
})
